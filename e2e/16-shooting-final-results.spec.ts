import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

test.use({ storageState: { cookies: [], origins: [] } });
test("finished challenge locks family writes, permits audited correction, and preserves results after leaving", async ({
  page,
}) => {
  test.skip(
    process.env.SHOOTING_FINAL_TEST !== "1",
    "Requires an explicitly prepared disposable ended-challenge fixture.",
  );
  const fixture = JSON.parse(
    fs.readFileSync(
      process.env.SHOOTING_FIXTURE_FILE || "/tmp/hockey-shooting-fixture.json",
      "utf8",
    ),
  );
  const accounts = JSON.parse(
    fs.readFileSync(
      process.env.SHOOTING_ACCOUNTS_FILE ||
        "/tmp/hockey-shooting-accounts.json",
      "utf8",
    ),
  );
  const make = () =>
    createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
  const parent = make(),
    coach = make();
  expect(
    (await parent.auth.signInWithPassword(accounts.parent)).error,
  ).toBeNull();
  expect(
    (await coach.auth.signInWithPassword(accounts.coach)).error,
  ).toBeNull();
  const before = await parent.rpc("get_shooting_challenge", {
    p_id: fixture.endedId,
  });
  expect(before.error).toBeNull();
  expect(before.data.status).toBe("Finished");
  const day = before.data.days.find(
    (d: { player_id: string }) => d.player_id === fixture.playerId,
  );
  const payload = {
    p_id: fixture.endedId,
    p_player: fixture.playerId,
    p_date: day.shot_date,
    p_shots: 125,
    p_version: day.version,
    p_request: randomUUID(),
  };
  expect(
    (await parent.rpc("save_shooting_challenge_day", payload)).error,
  ).toBeTruthy();
  await page.goto(
    `/auth?redirect=${encodeURIComponent(`/shooting/${fixture.endedId}?player=${fixture.playerId}`)}`,
  );
  await page.getByLabel(/email/i).fill(accounts.parent.email);
  await page.getByLabel(/password/i).fill(accounts.parent.password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Final standings" }),
  ).toBeVisible();
  await expect(page.getByLabel("Daily shot total")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save daily total", exact: true }),
  ).toBeDisabled();
  const corrected = await coach.rpc("save_shooting_challenge_day", {
    ...payload,
    p_request: randomUUID(),
    p_reason: "Parent confirmed the missing 25 shots after the deadline",
  });
  expect(corrected.error).toBeNull();
  await page.reload();
  await expect(page.getByLabel("Daily shot total")).toHaveValue("125");
  await expect(
    page.getByText("Results include coach corrections."),
  ).toBeVisible();
  const staff = await coach.rpc("get_shooting_challenge", {
    p_id: fixture.endedId,
  });
  expect(staff.data.audit[0]).toMatchObject({
    previous_shots: 100,
    shots: 125,
    reason: "Parent confirmed the missing 25 shots after the deadline",
  });
  if (process.env.AUDIT_SCREENSHOT_DIR)
    await page.screenshot({
      path: path.join(
        process.env.AUDIT_SCREENSHOT_DIR,
        "shooting-finished-parent.png",
      ),
      fullPage: true,
    });
  // Revoke this child's membership. A sibling still permits team standings, but never writes for the removed child.
  expect(
    (
      await parent.rpc("leave_my_player_from_team", {
        p_team_id: fixture.teamId,
        p_player_id: fixture.playerId,
      })
    ).error,
  ).toBeNull();
  expect(
    (
      await parent.rpc("save_shooting_challenge_day", {
        ...payload,
        p_request: randomUUID(),
      })
    ).error,
  ).toBeTruthy();
  const history = await coach.rpc("get_shooting_challenge", {
    p_id: fixture.endedId,
  });
  expect(
    history.data.players.find(
      (p: { player_id: string }) => p.player_id === fixture.playerId,
    ),
  ).toMatchObject({ total: 125, active_member: false });
  expect(
    (
      await parent.rpc("leave_my_player_from_team", {
        p_team_id: fixture.teamId,
        p_player_id: fixture.siblingId,
      })
    ).error,
  ).toBeNull();
  expect(
    (await parent.rpc("get_shooting_challenge", { p_id: fixture.endedId }))
      .error,
  ).toBeTruthy();
  await page.reload();
  await expect(
    page.getByText(/Challenge unavailable. Check your connection/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Final standings" }),
  ).toHaveCount(0);
});
