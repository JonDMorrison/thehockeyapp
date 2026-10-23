import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import fs from "node:fs";

// Opt in: exercises real persisted family records with disposable confirmed accounts.
test.use({ storageState: { cookies: [], origins: [] }, timezoneId: "UTC" });
test("family mobile: choose a child, finish today, log shots, switch siblings, retry reads and train at home", async ({
  page,
}) => {
  test.skip(
    process.env.FAMILY_HOME_RELEASE_TEST !== "1",
    "Requires a private fixture service key.",
  );
  test.setTimeout(180000);
  const key = JSON.parse(
    fs.readFileSync(process.env.FAMILY_HOME_SERVICE_FILE!, "utf8"),
  ).find((k: { name: string }) => k.name === "service_role").api_key;
  const url = process.env.VITE_SUPABASE_URL!,
    pub = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
  const admin = createClient(url, key, { auth: { persistSession: false } }),
    actors: any[] = [],
    players: string[] = [],
    teams: string[] = [];
  const fixtureFile = `/tmp/hockey-family-home-${test.info().project.name}.private.json`;
  const remember = () =>
    fs.writeFileSync(
      fixtureFile,
      JSON.stringify({ users: actors.map((a) => a.id), players, teams }),
      { mode: 0o600 },
    );
  const ok = (r: any) => {
    expect(r.error).toBeNull();
    return r.data;
  };
  const today = new Date().toISOString().slice(0, 10);
  const overflow = async () =>
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  try {
    for (const role of ["coach", "family"]) {
      const email = `qa-home-${role}-${randomUUID()}@example.com`,
        password = `Qa-${randomUUID()}`;
      const data = ok(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      );
      const client = createClient(url, pub, {
        auth: { persistSession: false },
      });
      actors.push({ email, password, id: data.user.id, client });
      remember();
      ok(await client.auth.signInWithPassword({ email, password }));
    }
    const [coach, family] = actors;
    const team = ok(
      await coach.client.rpc("create_team_with_owner", {
        p_name: "Disposable Family Dashboard",
        p_age_division: "U13",
        p_level: "rep",
      }),
    ).team_id;
    teams.push(team);
    remember();
    for (const name of ["Riley", "Jordan"]) {
      players.push(
        ok(
          await family.client.rpc("create_managed_player", {
            p_first_name: name,
            p_birth_year: 2014,
          }),
        ).player_id,
      );
      remember();
    }
    const token = randomUUID().replaceAll("-", "");
    ok(
      await coach.client.from("team_invites").insert({
        team_id: team,
        token,
        created_by_user_id: coach.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      }),
    );
    for (const p of players)
      ok(
        await family.client.rpc("join_team_with_invite", {
          invite_token: token,
          p_player_id: p,
        }),
      );
    const card = randomUUID();
    ok(
      await coach.client.rpc("save_team_practice_card", {
        p_id: card,
        p_team_id: team,
        p_date: today,
        p_tier: "rep",
        p_title: "Quick feet, big smiles",
        p_notes: "",
        p_publish: true,
        p_tasks: [
          { label: "Ready stance", task_type: "mobility", is_required: true },
        ],
      }),
    );
    const challenge = randomUUID();
    ok(
      await coach.client.rpc("create_shooting_challenge", {
        p_id: challenge,
        p_team: team,
        p_name: "Backyard puck party",
        p_start: today,
        p_end: today,
        p_timezone: "UTC",
      }),
    );
    ok(
      await family.client.rpc("save_personal_workouts", {
        p_player_id: players[0],
        p_tier: "rep",
        p_days: [
          {
            date: today,
            title: "Driveway skills",
            tasks: [{ label: "Home mobility", task_type: "mobility" }],
          },
        ],
      }),
    );
    await page.addInitScript(
      (ids) =>
        ids.forEach((id) =>
          localStorage.setItem(`first_run_dismissed_${id}`, "true"),
        ),
      players,
    );
    await page.setViewportSize({ width: 320, height: 760 });
    await page.goto("/auth?mode=signin&redirect=%2Fplayers");
    await page.getByLabel(/^email/i).fill(family.email);
    await page.getByLabel(/^password/i).fill(family.password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Small wins, one player at a time." }),
    ).toBeVisible();
    await overflow();
    await page.getByRole("link").filter({ hasText: "Riley" }).first().click();
    const workout = page.getByRole("region", {
      name: "Today’s workout",
      exact: true,
    });
    const shooting = page.getByRole("region", {
      name: "Your shooting challenge",
      exact: true,
    });
    await expect(
      workout.getByText("Quick feet, big smiles", { exact: true }),
    ).toBeVisible();
    await expect(
      workout.getByRole("link", { name: "Home workout also ready" }),
    ).toBeVisible();
    await expect(
      shooting.getByRole("link", { name: "Log shots" }),
    ).toHaveAttribute(
      "href",
      `/shooting/${challenge}?player=${players[0]}&mode=player#shot-tools`,
    );
    await overflow();
    await page.screenshot({
      path: `/tmp/hockey-family-${test.info().project.name}-320.png`,
      fullPage: true,
    });
    await workout
      .getByRole("link", { name: "Start workout", exact: true })
      .click();
    await expect(page.getByRole("checkbox").first()).toBeVisible();
    await page.getByRole("checkbox").first().press("Space");
    await expect(page.getByRole("checkbox").first()).toBeChecked();
    await expect
      .poll(async () =>
        ok(
          await family.client
            .from("task_completions")
            .select("completed")
            .eq("player_id", players[0]),
        ),
      )
      .toEqual([{ completed: true }]);
    await page.getByRole("link", { name: "Home", exact: true }).first().click();
    await expect(
      workout.getByRole("link", { name: "Finish workout", exact: true }),
    ).toBeVisible();
    await expect(workout.getByText("You did it!", { exact: true })).toHaveCount(
      0,
    );
    await workout
      .getByRole("link", { name: "Finish workout", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Complete Session", exact: true })
      .click();
    await expect
      .poll(async () =>
        ok(
          await family.client
            .from("session_completions")
            .select("status")
            .eq("player_id", players[0])
            .eq("practice_card_id", card),
        ),
      )
      .toEqual([{ status: "complete" }]);
    await page.goto(`/players/${players[0]}/home`);
    await expect(
      workout.getByText("You did it!", { exact: true }),
    ).toBeVisible();
    await shooting.getByRole("link", { name: "Log shots" }).click();
    await page.getByLabel("Daily shot total").fill("150");
    await page
      .getByRole("button", { name: "Save today’s total", exact: true })
      .click();
    await expect(
      page.getByText("150 shots saved for today.", { exact: true }),
    ).toBeVisible();
    await page.goto(`/players/${players[0]}/home`);
    await expect(shooting.getByText("150", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Switch player" }).click();
    await page.getByRole("link").filter({ hasText: "Jordan" }).first().click();
    await expect(shooting.getByText("0", { exact: true })).toBeVisible();
    await expect(
      workout.getByRole("link", { name: "Start workout", exact: true }),
    ).toBeVisible();
    await expect(
      shooting.getByRole("link", { name: "Log shots" }),
    ).toHaveAttribute(
      "href",
      `/shooting/${challenge}?player=${players[1]}&mode=player#shot-tools`,
    );
    await page.route("**/rest/v1/personal_practice_cards?*", (r) =>
      r.fulfill({
        status: 503,
        json: { message: "Controlled home read failure" },
      }),
    );
    await page.reload();
    await expect(workout.getByRole("alert")).toBeVisible({ timeout: 15000 });
    await expect(
      workout.getByRole("link", { name: "Start workout", exact: true }),
    ).toHaveCount(0);
    await page.unroute("**/rest/v1/personal_practice_cards?*");
    await workout
      .getByRole("button", { name: "Retry today’s workout" })
      .click();
    await expect(
      workout.getByRole("link", { name: "Start workout", exact: true }),
    ).toBeVisible();
    await page.route("**/rest/v1/rpc/get_shooting_challenge", (r) =>
      r.fulfill({
        status: 503,
        json: { message: "Controlled shot read failure" },
      }),
    );
    await page.reload();
    await expect(
      shooting.getByRole("button", { name: "Retry your shots" }),
    ).toBeVisible({ timeout: 15000 });
    await expect(shooting.getByText("0", { exact: true })).toHaveCount(0);
    await page.unroute("**/rest/v1/rpc/get_shooting_challenge");
    await shooting.getByRole("button", { name: "Retry your shots" }).click();
    await expect(shooting.getByText("0", { exact: true })).toBeVisible();
    const solo = ok(
      await family.client.rpc("create_solo_player_with_plan", {
        p_first_name: "Casey",
        p_birth_year: 1990,
        p_training_focus: ["shooting"],
        p_days_per_week: 3,
      }),
    ).player_id;
    players.push(solo);
    remember();
    ok(
      await family.client.rpc("save_personal_workouts", {
        p_player_id: solo,
        p_tier: "rep",
        p_days: [
          {
            date: today,
            title: "Own your next shift",
            tasks: [{ label: "Quick stretch", task_type: "mobility" }],
          },
        ],
      }),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/solo/dashboard/${solo}`);
    await expect(
      workout.getByText("Own your next shift", { exact: true }),
    ).toBeVisible();
    await expect(
      shooting.getByText("Your next challenge is coming", { exact: true }),
    ).toBeVisible();
    await overflow();
    await workout
      .getByRole("link", { name: "Start workout", exact: true })
      .click();
    await page.getByRole("checkbox").first().press("Space");
    await expect(page.getByRole("checkbox").first()).toBeChecked();
    await page.goto(`/solo/dashboard/${solo}`);
    await expect(
      workout.getByText("You did it!", { exact: true }),
    ).toBeVisible();
    await overflow();
    await page.screenshot({
      path: `/tmp/hockey-solo-${test.info().project.name}-390.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`/players/${players[0]}/home`);
    await expect(
      workout.getByText("You did it!", { exact: true }),
    ).toBeVisible();
    await overflow();
    const a = await workout.boundingBox(),
      b = await shooting.boundingBox();
    expect(b!.x).toBeGreaterThan(a!.x + a!.width - 2);
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2);
    await page.screenshot({
      path: `/tmp/hockey-family-${test.info().project.name}-1440.png`,
      fullPage: true,
    });
  } finally {
    for (const id of teams) {
      const cards = ok(
        await admin.from("practice_cards").select("id").eq("team_id", id),
      ).map((c: any) => c.id);
      if (cards.length) {
        ok(
          await admin
            .from("session_completions")
            .delete()
            .in("practice_card_id", cards),
        );
        const tasks = ok(
          await admin
            .from("practice_tasks")
            .select("id")
            .in("practice_card_id", cards),
        ).map((t: any) => t.id);
        if (tasks.length)
          ok(
            await admin
              .from("task_completions")
              .delete()
              .in("practice_task_id", tasks),
          );
        ok(
          await admin
            .from("practice_tasks")
            .delete()
            .in("practice_card_id", cards),
        );
        ok(await admin.from("practice_cards").delete().in("id", cards));
      }
      ok(await admin.from("teams").delete().eq("id", id));
    }
    for (const id of players) {
      for (const table of [
        "personal_task_completions",
        "personal_session_completions",
      ])
        ok(await admin.from(table).delete().eq("player_id", id));
      ok(
        await admin
          .from("personal_practice_cards")
          .delete()
          .eq("player_id", id),
      );
      ok(await admin.from("players").delete().eq("id", id));
    }
    for (const actor of actors) ok(await admin.auth.admin.deleteUser(actor.id));
    fs.rmSync(fixtureFile, { force: true });
  }
});
