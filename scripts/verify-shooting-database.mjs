import {
  mkdtempSync,
  readFileSync,
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
const root = mkdtempSync(join(tmpdir(), "hockey-shooting-db-"));
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
  run("psql", [
    ...args,
    "-f",
    resolve("tests/database/shooting-bootstrap.sql"),
    "-f",
    resolve("supabase/migrations/20261018151055_shooting_challenges.sql"),
    "-f",
    resolve(
      "supabase/migrations/20261018151453_shooting_challenge_access_and_indexes.sql",
    ),
  ]);
  const result = await asyncExec(join(bin, "psql"), [
    ...args,
    "-f",
    resolve("tests/database/shooting-release.sql"),
  ]);
  process.stdout.write(result.stderr.replace(/^.*NOTICE:  /gm, ""));
  run("psql", [
    ...args,
    "-c",
    `update public.team_memberships set status='active'; set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false); select public.create_shooting_challenge('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Concurrent race',current_date,current_date,'UTC');`,
  ]);
  const save = (value) =>
    asyncExec(join(bin, "psql"), [
      ...args,
      "-c",
      `set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false); select public.save_shooting_challenge_day('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001',current_date,${value},0,gen_random_uuid());`,
    ]);
  const writes = await Promise.all([save(100), save(200)]);
  const responses = writes.map((r) =>
    JSON.parse(r.stdout.trim().split("\n").at(-1)),
  );
  assert.equal(responses.filter((r) => r.conflict).length, 1);
  const total = run("psql", [
    ...args,
    "-c",
    `select shots from public.shooting_challenge_days where challenge_id='30000000-0000-0000-0000-000000000002';`,
  ])
    .trim()
    .split("\n")
    .at(-1);
  assert(["100", "200"].includes(total));
  console.log(
    "PASS: Simultaneous device saves produce one write and one conflict, never a sum or lost update",
  );
  const caps = await asyncExec(join(bin, "psql"), [
    ...args,
    "-f",
    resolve("supabase/migrations/20261025030602_shooting_daily_cap.sql"),
    "-f",
    resolve(
      "supabase/migrations/20261025030929_shooting_cap_publication_lock.sql",
    ),
    "-f",
    resolve("tests/database/shooting-cap-release.sql"),
  ]);
  process.stdout.write(caps.stderr.replace(/^.*NOTICE:  /gm, ""));
  const changeCap = (cap) =>
    asyncExec(join(bin, "psql"), [
      ...args,
      "-c",
      `set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false); select public.set_shooting_challenge_cap('30000000-0000-0000-0000-000000000003',${cap},400);`,
    ]);
  const capRace = await Promise.allSettled([changeCap(150), changeCap(175)]);
  assert.equal(capRace.filter((r) => r.status === "fulfilled").length, 1);
  assert(
    capRace
      .find((r) => r.status === "rejected")
      .reason.stderr.includes("Another coach changed the cap"),
  );
  console.log(
    "PASS: Simultaneous cap edits reject stale changes rather than silently overwriting",
  );
  const migration = readFileSync(
    "supabase/migrations/20261018151055_shooting_challenges.sql",
    "utf8",
  );
  assert(!migration.includes("task_completions"));
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
