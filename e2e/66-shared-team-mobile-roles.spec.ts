import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import fs from "node:fs";

test.use({
  storageState: { cookies: [], origins: [] },
  timezoneId: "UTC",
});
test("one team: coach, invited manager, parent and independent player share truthful mobile progress", async ({
  browser,
  baseURL,
}) => {
  test.skip(
    process.env.SHARED_ROLES_RELEASE_TEST !== "1",
    "Creates scoped disposable multi-role records.",
  );
  test.setTimeout(240000);
  const key = JSON.parse(
    fs.readFileSync(process.env.ROLE_FIXTURE_KEY_FILE!, "utf8"),
  ).find((k: any) => k.name === "service_role").api_key;
  const url = process.env.VITE_SUPABASE_URL!,
    pub = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
    admin = createClient(url, key, { auth: { persistSession: false } }),
    actors: any[] = [],
    contexts: any[] = [],
    players: string[] = [],
    teams: string[] = [];
  const file = `/tmp/hockey-role-fixtures-${process.pid}.private.json`,
    remember = () =>
      fs.writeFileSync(
        file,
        JSON.stringify({ users: actors.map((a) => a.id), players, teams }),
        { mode: 0o600 },
      );
  const ok = (r: any) => {
    expect(r.error).toBeNull();
    return r.data;
  };
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const login = async (p: Page, a: any, path = "/today") => {
    await p.goto(`/auth?mode=signin&redirect=${encodeURIComponent(path)}`);
    await p.getByLabel(/^email/i).fill(a.email);
    await p.getByLabel(/^password/i).fill(a.password);
    await p.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(p).not.toHaveURL(/\/auth/);
  };
  const workout = (p: Page) =>
      p.getByRole("region", { name: "Today’s workout", exact: true }),
    shooting = (p: Page) =>
      p.getByRole("region", { name: "Your shooting challenge", exact: true });
  const noOverflow = async (p: Page) =>
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  try {
    for (const role of ["Coach", "Manager", "Parent", "Player"]) {
      const email = `qa-role-${role.toLowerCase()}-${randomUUID()}@example.com`,
        password = `Qa-${randomUUID()}`;
      const u = ok(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { display_name: `${role} QA` },
        }),
      );
      const client = createClient(url, pub, {
        auth: { persistSession: false },
      });
      actors.push({ id: u.user.id, email, password, client });
      remember();
      ok(await client.auth.signInWithPassword({ email, password }));
      const c = await browser.newContext({
        baseURL,
        storageState: { cookies: [], origins: [] },
        viewport: {
          width: test.info().project.name === "webkit" ? 320 : 390,
          height: 844,
        },
        timezoneId: "UTC",
      });
      contexts.push(c);
      actors.at(-1).page = await c.newPage();
      actors.at(-1).page.setDefaultTimeout(15000);
    }
    const [coach, manager, parent, player] = actors;
    const team = ok(
      await coach.client.rpc("create_team_with_owner", {
        p_name: "Disposable Shared Team Hawks",
        p_age_division: "U13",
        p_level: "rep",
      }),
    ).team_id;
    teams.push(team);
    remember();
    const child = ok(
      await parent.client.rpc("create_managed_player", {
        p_first_name: "Riley",
        p_birth_year: 2014,
      }),
    ).player_id;
    players.push(child);
    remember();
    const self = ok(
      await player.client.rpc("create_solo_player_with_plan", {
        p_first_name: "Casey",
        p_birth_year: 1990,
        p_training_focus: ["shooting"],
        p_days_per_week: 3,
      }),
    ).player_id;
    players.push(self);
    remember();
    const familyToken = randomUUID().replaceAll("-", "");
    ok(
      await coach.client.from("team_invites").insert({
        team_id: team,
        token: familyToken,
        created_by_user_id: coach.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      }),
    );
    for (const [a, id] of [
      [parent, child],
      [player, self],
    ] as const)
      ok(
        await a.client.rpc("join_team_with_invite", {
          invite_token: familyToken,
          p_player_id: id,
        }),
      );
    const card = randomUUID();
    ok(
      await coach.client.rpc("save_team_practice_card", {
        p_id: card,
        p_team_id: team,
        p_date: new Date().toISOString().slice(0, 10),
        p_tier: "rep",
        p_title: "Together, one rep at a time",
        p_notes: "",
        p_publish: true,
        p_tasks: [
          { label: "Ready stance", task_type: "mobility", is_required: true },
        ],
      }),
    );
    // Align the disposable card with the team's day after the UTC-based save gate.
    ok(await admin.from("practice_cards").update({ date }).eq("id", card));
    const challenge = randomUUID();
    ok(
      await coach.client.rpc("create_shooting_challenge", {
        p_id: challenge,
        p_team: team,
        p_name: "Everyone takes a shot",
        p_start: date,
        p_end: date,
        p_timezone: "UTC",
      }),
    );
    ok(
      await parent.client.rpc("save_personal_workouts", {
        p_player_id: child,
        p_tier: "rep",
        p_days: [
          {
            date: new Date().toISOString().slice(0, 10),
            title: "Private driveway practice",
            tasks: [{ label: "Private mobility", task_type: "mobility" }],
          },
        ],
      }),
    );
    ok(
      await admin
        .from("personal_practice_cards")
        .update({ date })
        .eq("player_id", child),
    );
    for (const [a, id] of [
      [parent, child],
      [player, self],
    ] as const)
      await a.page.addInitScript(
        (id: string) =>
          localStorage.setItem(`first_run_dismissed_${id}`, "true"),
        id,
      );
    await login(coach.page, coach);
    await expect(coach.page).toHaveURL(new RegExp(`/teams/${team}$`));
    await coach.page
      .getByRole("button", { name: "Invite team staff", exact: true })
      .click();
    const d = coach.page.getByRole("dialog");
    await d.getByRole("button", { name: "Share a link", exact: true }).click();
    await d
      .getByRole("button", { name: "Create staff link", exact: true })
      .click();
    const link = await d.getByLabel("Staff invitation link").inputValue();
    await d.getByRole("button", { name: "Done", exact: true }).click();
    await manager.page.goto(link);
    await manager.page
      .getByRole("button", { name: /sign in or create account/i })
      .click();
    await manager.page.getByLabel(/^email/i).fill(manager.email);
    await manager.page.getByLabel(/^password/i).fill(manager.password);
    await manager.page
      .getByRole("button", { name: "Sign In", exact: true })
      .click();
    await manager.page
      .getByRole("button", { name: "Join coaching workspace", exact: true })
      .click();
    await expect(manager.page).toHaveURL(new RegExp(`/teams/${team}$`));
    await manager.page.goto("/today");
    await expect(manager.page).toHaveURL(new RegExp(`/teams/${team}$`));
    await login(parent.page, parent);
    await expect(parent.page).toHaveURL(new RegExp(`/players/${child}/home$`));
    await login(player.page, player);
    await expect(player.page).toHaveURL(new RegExp(`/players/${self}/home$`));
    for (const [a, id, total] of [
      [parent, child, 125],
      [player, self, 175],
    ] as const) {
      const p = a.page;
      await expect(
        workout(p).getByText("Together, one rep at a time", { exact: true }),
      ).toBeVisible();
      await expect(
        shooting(p).getByRole("link", { name: "Log shots" }),
      ).toHaveAttribute("href", `/shooting/${challenge}?player=${id}`);
      await expect(
        p.getByRole("button", { name: "Invite team staff", exact: true }),
      ).toHaveCount(0);
      await workout(p)
        .getByRole("link", { name: "Start workout", exact: true })
        .click();
      await expect
        .poll(() =>
          p.evaluate(() => localStorage.getItem("hockey-app-active-view")),
        )
        .toBe(a === player ? "player" : "parent");
      await p.getByRole("checkbox").first().press("Space");
      await p
        .getByRole("button", { name: "Complete Session", exact: true })
        .click();
      await expect
        .poll(async () =>
          ok(
            await a.client
              .from("session_completions")
              .select("status")
              .eq("practice_card_id", card)
              .eq("player_id", id),
          ),
        )
        .toEqual([{ status: "complete" }]);
      await p.goto(`/players/${id}/home`);
      await expect(
        workout(p).getByText("You did it!", { exact: true }),
      ).toBeVisible();
      await shooting(p).getByRole("link", { name: "Log shots" }).click();
      await p.getByLabel("Daily shot total").fill(String(total));
      await p
        .getByRole("button", { name: "Save today’s total", exact: true })
        .click();
      await expect(
        p.getByText(`${total} shots saved for today.`, { exact: true }),
      ).toBeVisible();
      await p.goto("/today");
      await expect(p).toHaveURL(new RegExp(`/players/${id}/home$`));
      await expect(
        shooting(p).getByText(String(total), { exact: true }),
      ).toBeVisible();
      await noOverflow(p);
    }
    // Home practice is private and must not inflate the team's completed sessions.
    await parent.page.goto(`/solo/today/${child}`);
    await parent.page.getByRole("checkbox").first().press("Space");
    await expect
      .poll(async () =>
        ok(
          await parent.client
            .from("personal_session_completions")
            .select("status")
            .eq("player_id", child),
        ),
      )
      .toEqual([{ status: "complete" }]);
    const previousDate = new Date(`${date}T12:00:00Z`);
    previousDate.setUTCDate(previousDate.getUTCDate() - 7);
    const oldDate = previousDate.toISOString().slice(0, 10),
      oldCard = randomUUID();
    ok(
      await admin.from("practice_cards").insert({
        id: oldCard,
        team_id: team,
        date: oldDate,
        mode: "normal",
        tier: "rep",
        title: "Last week’s team workout",
        created_by_user_id: coach.id,
        published_at: `${oldDate}T17:00:00Z`,
        program_source: "team",
      }),
    );
    ok(
      await parent.client.from("session_completions").insert({
        player_id: child,
        practice_card_id: oldCard,
        status: "complete",
        completed_by: "parent",
        completed_at: `${oldDate}T17:00:00Z`,
      }),
    );
    for (const a of [coach, manager]) {
      await a.page.reload();
      const s = ok(
        await a.client.rpc("get_team_dashboard_snapshot", { p_team_id: team }),
      );
      expect(s.pulse).toMatchObject({
        players_count: 2,
        active_today_count: 2,
        sessions_complete_today: 2,
      });
      await expect(
        a.page.getByRole("progressbar", {
          name: "Players completing today’s training",
        }),
      ).toHaveAttribute("aria-valuenow", "2");
      const shooting = a.page.getByRole("region", {
        name: "Team shooting challenge",
        exact: true,
      });
      await expect(shooting.getByText("300", { exact: true })).toBeVisible();
      await noOverflow(a.page);
      await a.page.goto(`/teams/${team}/progress`);
      await expect(
        a.page.getByText("Riley", { exact: true }).first(),
      ).toBeVisible();
      await expect(
        a.page.getByText("Casey", { exact: true }).first(),
      ).toBeVisible();
      await expect(
        a.page.getByText("All-time team workouts: 3", { exact: false }),
      ).toBeVisible();
      const weekly = a.page.getByRole("region", {
        name: "Workouts this week",
        exact: true,
      });
      await expect(weekly).toContainText("2");
      const challengeProgress = a.page.getByRole("region", {
        name: "Shooting challenge",
        exact: true,
      });
      await expect(
        challengeProgress.getByText("300", { exact: true }),
      ).toBeVisible();
      const heatmap = a.page
        .getByText("Total Sessions", { exact: true })
        .locator("..");
      await expect(heatmap.getByText("2", { exact: true })).toBeVisible();
      await expect(
        a.page
          .getByText("Avg per Day", { exact: true })
          .locator("..")
          .getByText("0.3", { exact: true }),
      ).toBeVisible();
      await noOverflow(a.page);
      await a.page.goto(`/teams/${team}/roster`);
      await expect(
        a.page.getByText("Riley", { exact: true }).first(),
      ).toBeVisible();
      await expect(
        a.page.getByText("Casey", { exact: true }).first(),
      ).toBeVisible();
      await noOverflow(a.page);
      await a.page.goto(`/teams/${team}/progress`);
    }
    for (const a of [coach, manager, player])
      expect(
        ok(
          await a.client
            .from("personal_practice_cards")
            .select("id")
            .eq("player_id", child),
        ),
      ).toEqual([]);
    expect(
      (await parent.client.rpc("get_today_snapshot", { p_player_id: self }))
        .data?.success,
    ).toBe(false);
    expect(
      (await player.client.rpc("get_today_snapshot", { p_player_id: child }))
        .data?.success,
    ).toBe(false);
    for (const [a, id] of [
      [parent, child],
      [player, self],
    ] as const) {
      await a.page.goto(`/players/${id}/home`);
      await a.page.getByText("Your teams", { exact: true }).click();
      await a.page
        .getByRole("button", {
          name: "Open Disposable Shared Team Hawks plan",
          exact: true,
        })
        .click();
      await expect(a.page).toHaveURL(new RegExp(`/players/${id}/week$`));
      await expect
        .poll(() =>
          a.page.evaluate(() => localStorage.getItem("hockey-app-active-view")),
        )
        .toBe(a === player ? "player" : "parent");
      await a.page.goto(`/teams/${team}/roster`);
      await expect(a.page.getByRole("alert")).toBeVisible({ timeout: 15000 });
      await expect(
        a.page.getByRole("button", { name: "Add Player", exact: true }),
      ).toHaveCount(0);
      await a.page.goto(`/teams/${team}/progress`);
      await expect(a.page.getByRole("alert")).toBeVisible({ timeout: 15000 });
      await expect(
        a.page.getByText("Sessions Done", { exact: true }),
      ).toHaveCount(0);
      await a.page.goto("/today");
    }
    // Family and player accounts cannot open the staff dashboard, directory, or staff invitation flow.
    for (const a of [parent, player]) {
      expect(
        (await a.client.rpc("list_team_staff", { p_team_id: team })).error,
      ).toBeTruthy();
      expect(
        (
          await a.client.rpc("create_team_staff_invite", {
            p_id: randomUUID(),
            p_team_id: team,
          })
        ).error,
      ).toBeTruthy();
      await a.page.goto(`/teams/${team}`);
      await expect(
        a.page.getByText("Dashboard not available", { exact: true }),
      ).toBeVisible({ timeout: 20000 });
      await expect(
        a.page.getByRole("button", { name: "Invite team staff", exact: true }),
      ).toHaveCount(0);
      await a.page.goto("/today");
    }
    // An unreadable progress feed must not turn saved effort into zero progress.
    await manager.page.route("**/rest/v1/session_completions?*", (r) =>
      r.fulfill({
        status: 503,
        json: { message: "Controlled progress read failure" },
      }),
    );
    await manager.page.reload();
    await expect(manager.page.getByRole("alert")).toBeVisible({
      timeout: 15000,
    });
    await manager.page.unroute("**/rest/v1/session_completions?*");
    await manager.page
      .getByRole("button", { name: /retry|try again/i })
      .click();
    await expect(
      manager.page.getByText("Riley", { exact: true }).first(),
    ).toBeVisible();
    for (const a of actors) {
      await a.page.screenshot({
        path: `/tmp/hockey-shared-${a === coach ? "coach" : a === manager ? "manager" : a === parent ? "parent" : "player"}-${test.info().project.name}.png`,
        fullPage: true,
      });
      await noOverflow(a.page);
    }
  } finally {
    for (const c of contexts) await c.close();
    for (const id of players) {
      for (const table of [
        "personal_task_completions",
        "personal_session_completions",
        "task_completions",
        "session_completions",
      ])
        ok(await admin.from(table).delete().eq("player_id", id));
      ok(
        await admin
          .from("personal_practice_cards")
          .delete()
          .eq("player_id", id),
      );
    }
    for (const id of teams) {
      const cards = ok(
        await admin.from("practice_cards").select("id").eq("team_id", id),
      ).map((c: any) => c.id);
      if (cards.length) {
        ok(
          await admin
            .from("practice_tasks")
            .delete()
            .in("practice_card_id", cards),
        );
        ok(await admin.from("practice_cards").delete().in("id", cards));
      }
      ok(await admin.from("shooting_challenges").delete().eq("team_id", id));
      ok(await admin.from("teams").delete().eq("id", id));
    }
    for (const id of players)
      ok(await admin.from("players").delete().eq("id", id));
    for (const a of actors) {
      await a.client.auth.signOut({ scope: "global" });
      ok(await admin.auth.admin.deleteUser(a.id));
    }
    fs.rmSync(file, { force: true });
  }
});
