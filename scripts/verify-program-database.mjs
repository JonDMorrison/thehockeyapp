import {
  mkdtempSync,
  rmSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import assert from "node:assert/strict";
const asyncExec = promisify(execFile);
const candidates = [
  process.env.PG_BIN,
  "/opt/homebrew/opt/postgresql@18/bin",
  ...(existsSync("/usr/lib/postgresql")
    ? readdirSync("/usr/lib/postgresql").map(
        (v) => `/usr/lib/postgresql/${v}/bin`,
      )
    : []),
].filter(Boolean);
const bin = candidates.find((p) => existsSync(join(p, "postgres")));
assert(
  bin,
  "PostgreSQL server binaries required; set PG_BIN to their directory.",
);
const root = mkdtempSync(join(tmpdir(), "hockey-program-db-"));
const run = (name, args) =>
  execFileSync(join(bin, name), args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
const args = [
  "-h",
  root,
  "-d",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
  "-At",
  "-c",
  "set timezone='UTC'",
];
try {
  run("initdb", ["-D", join(root, "data"), "-A", "trust"]);
  run("pg_ctl", [
    "-D",
    join(root, "data"),
    "-l",
    join(root, "server.log"),
    "-o",
    `-k ${root} -c listen_addresses=''`,
    "start",
  ]);
  const result = await asyncExec(join(bin, "psql"), [
    ...args,
    "-c", "begin",
    "-f", resolve("tests/database/program-bootstrap.sql"),
    "-f", resolve("supabase/migrations/20261019052512_atomic_program_publication.sql"),
    "-f", resolve("supabase/migrations/20261019055652_program_rest_day_publication.sql"),
    "-f", resolve("supabase/migrations/20261019064519_atomic_workout_editing.sql"),
    "-f", resolve("supabase/migrations/20261019064739_atomic_solo_completion.sql"),
    "-c", "select set_config('test.user_id','00000000-0000-0000-0000-000000000001',true)",
    "-f", resolve("tests/database/program-publication-release.sql"),
    "-f", resolve("tests/database/program-rest-day-release.sql"),
    "-f", resolve("tests/database/workout-editing-release.sql"),
    "-f", resolve("tests/database/solo-completion-release.sql"),
    "-f", resolve("tests/database/guardian-permission-release.sql"),
    "-f", resolve("tests/database/session-photo-privacy-release.sql"),
    "-c", "rollback",
  ]);
  console.log("PASS: Atomic program save/publication, scaled targets, preserved notes, rollback after insert failure, idempotent retry, player-progress protection, cross-account denial, anonymous denial safe rest-day clearing, atomic team/solo workout editing, partial-program rollback and partial-progress protection");
} catch (e) {
  process.stderr.write(e.stderr || e.message);
  process.exitCode = 1;
} finally {
  try {
    run("pg_ctl", ["-D", join(root, "data"), "stop", "-m", "immediate"]);
  } catch {
    /* Initialization may have failed. */
  }
  rmSync(root, { recursive: true, force: true });
}
