import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
test.use({
  storageState: { cookies: [], origins: [] },
  timezoneId: "America/Vancouver",
  viewport: { width: 390, height: 844 },
});
test("late-joining family and independent player can browse all team leaderboards without gaining write or cross-team access", async ({
  page,
}) => {
  test.skip(
    process.env.LEADERBOARD_RELEASE_TEST !== "1",
    "Uses disposable real actors.",
  );
  test.setTimeout(180000);
  const keys = JSON.parse(
    fs.readFileSync(process.env.ROLE_FIXTURE_KEY_FILE!, "utf8"),
  );
  const admin = createClient(
    process.env.VITE_SUPABASE_URL!,
    keys.find((k: any) => k.name === "service_role").api_key,
    { auth: { persistSession: false } },
  );
  const actors: any[] = [],
    players: string[] = [],
    teams: string[] = [];
  const file = `/tmp/leaderboard-fixture-${process.pid}.private.json`;
  const remember = () =>
    fs.writeFileSync(
      file,
      JSON.stringify({ users: actors.map((a) => a.id), players, teams }),
      { mode: 0o600 },
    );
  const ok = (r: any) => {
    expect(r.error).toBeNull();
    return r.data;
  };
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const old = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  try {
    for (const role of ["Coach", "Parent", "Player"]) {
      const email = `qa-leaderboard-${randomUUID()}@example.com`,
        password = `Qa-${randomUUID()}`;
      const u = ok(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      ).user;
      const client = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
        {
          auth: { persistSession: false },
          global: { headers: { Prefer: "timezone=America/Vancouver" } },
        },
      );
      actors.push({ id: u.id, email, password, client });
      remember();
      ok(await client.auth.signInWithPassword({ email, password }));
    }
    const [coach, parent, self] = actors;
    for (const name of ["Leaderboard team A", "Private team B"]) {
      teams.push(
        ok(await coach.client.rpc("create_team_with_owner", { p_name: name }))
          .team_id,
      );
      remember();
    }
    const champion = ok(
      await coach.client.rpc("create_managed_player", {
        p_first_name: "Champion QA",
        p_birth_year: 2014,
      }),
    ).player_id;
    players.push(champion);
    remember();
    ok(
      await coach.client.rpc("add_my_player_to_team", {
        p_team_id: teams[0],
        p_player_id: champion,
      }),
    );
    const history = Array.from({ length: 25 }, (_, i) => ({
      id: randomUUID(),
      team_id: teams[0],
      name: `Archived challenge ${i + 1}`,
      start_date: old,
      end_date: old,
      timezone: "America/Vancouver",
      created_by: coach.id,
    }));
    const foreign = {
      ...history[0],
      id: randomUUID(),
      team_id: teams[1],
      name: "Other team private challenge",
    };
    ok(await admin.from("shooting_challenges").insert([...history, foreign]));
    ok(
      await admin.from("shooting_challenge_players").insert({
        challenge_id: history[0].id,
        player_id: champion,
        first_name: "Champion QA",
        enrolled_at: `${old}T00:00:00Z`,
      }),
    );
    ok(
      await admin.from("shooting_challenge_days").insert({
        challenge_id: history[0].id,
        player_id: champion,
        shot_date: old,
        shots: 123,
        version: 1,
      }),
    );
    const child = ok(
      await parent.client.rpc("create_managed_player", {
        p_first_name: "Late QA",
        p_birth_year: 2014,
      }),
    ).player_id;
    players.push(child);
    remember();
    const independent = ok(
      await self.client.rpc("create_solo_player_with_plan", {
        p_first_name: "Independent QA",
        p_birth_year: 1990,
        p_training_focus: ["shooting"],
        p_days_per_week: 3,
      }),
    ).player_id;
    players.push(independent);
    remember();
    const inviteToken = randomUUID().replaceAll("-", "");
    ok(
      await coach.client.from("team_invites").insert({
        team_id: teams[0],
        token: inviteToken,
        created_by_user_id: coach.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      }),
    );
    for (const [actor, id] of [
      [parent, child],
      [self, independent],
    ])
      ok(
        await actor.client.rpc("join_team_with_invite", {
          invite_token: inviteToken,
          p_player_id: id,
        }),
      );
    for (const [actor, id, jersey] of [
      [coach, champion, "9"],
      [parent, child, "13"],
      [self, independent, "22"],
    ]) {
      ok(
        await actor.client
          .from("players")
          .update({
            jersey_number: jersey,
            profile_photo_url: "/images/email/driveway.jpg",
          })
          .eq("id", id),
      );
    }
    const current = randomUUID();
    ok(
      await coach.client.rpc("create_shooting_challenge", {
        p_id: current,
        p_team: teams[0],
        p_name: "Current team challenge",
        p_start: today,
        p_end: today,
        p_timezone: "America/Vancouver",
      }),
    );
    const coachList = ok(
      await coach.client.rpc("list_shooting_challenges", { p_team: teams[0] }),
    );
    expect.soft(coachList).toHaveLength(26);
    for (const [actor, id] of [
      [parent, child],
      [self, independent],
    ]) {
      const list = ok(
        await actor.client.rpc("list_shooting_challenges", { p_player: id }),
      );
      expect.soft(list).toHaveLength(26);
      if (process.env.LEADERBOARD_BASELINE === "1") continue;
      expect(list.some((c: any) => c.id === foreign.id)).toBe(false);
      const snapshot = ok(
        await actor.client.rpc("get_shooting_challenge", {
          p_id: history[0].id,
        }),
      );
      expect(snapshot.players[0].total).toBe(123);
      expect(snapshot.players[0].rank).toBe(1);
      expect(snapshot.days).toEqual([]);
      expect(snapshot.audit).toEqual([]);
      expect(
        (await actor.client.rpc("get_shooting_challenge", { p_id: foreign.id }))
          .error,
      ).toBeTruthy();
      expect(
        (
          await actor.client.rpc("list_shooting_challenges", {
            p_player: champion,
          })
        ).error,
      ).toBeTruthy();
      expect(
        (
          await actor.client.rpc("save_shooting_challenge_day", {
            p_id: history[0].id,
            p_player: champion,
            p_date: old,
            p_shots: 999,
            p_version: 1,
            p_request: randomUUID(),
          })
        ).error,
      ).toBeTruthy();
      expect(
        (
          await actor.client.rpc("save_shooting_challenge_day", {
            p_id: history[0].id,
            p_player: id,
            p_date: old,
            p_shots: 999,
            p_version: 0,
            p_request: randomUUID(),
          })
        ).error,
      ).toBeTruthy();
      ok(
        await actor.client.rpc("save_shooting_challenge_day", {
          p_id: current,
          p_player: id,
          p_date: today,
          p_shots: 75,
          p_version: 0,
          p_request: randomUUID(),
        }),
      );
      await page.addInitScript(
        (id) => localStorage.setItem(`first_run_dismissed_${id}`, "true"),
        id,
      );
      await page.goto(
        `/auth?mode=signin&redirect=${encodeURIComponent(`/players/${id}/home`)}`,
      );
      await page.getByLabel(/^email/i).fill(actor.email);
      await page.getByLabel(/^password/i).fill(actor.password);
      await page.getByRole("button", { name: "Sign In", exact: true }).click();
      const logLink = page.getByRole("link", {
        name: "Log shots",
        exact: true,
      });
      await expect(logLink).toHaveAttribute(
        "href",
        `/shooting/${current}?player=${id}&mode=player#shot-tools`,
      );
      await logLink.click();
      await expect(
        page.getByRole("complementary", { name: "Log your shots" }),
      ).toBeInViewport();
      await expect(page.getByLabel("Daily shot total")).toHaveValue("75");
      await page
        .getByRole("link", { name: "Player home", exact: true })
        .click();
      const leaderboardLink = page.getByRole("link", {
        name: "View team leaderboard",
        exact: true,
      });
      await expect(leaderboardLink).toHaveAttribute("href", /#leaderboard$/);
      await leaderboardLink.click();
      await expect(
        page.getByRole("heading", { name: "Team standings", exact: true }),
      ).toBeVisible();
      await page.getByLabel("Team leaderboards").selectOption(history[0].id);
      await expect(
        page.getByRole("heading", { name: "Final standings" }),
      ).toBeVisible();
      await expect(page.getByTestId(`standing-${champion}`)).toContainText(
        "123 shots",
      );
      await expect(
        page.getByLabel("Team leaderboards").locator("option"),
      ).toHaveCount(26);
      await expect(page.getByLabel("Daily shot total")).toHaveCount(0);
      await page.getByLabel("Team leaderboards").selectOption(current);
      await expect(
        page.getByRole("heading", { name: "Team standings", exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("Daily shot total")).toHaveValue("75");
      await expect(page.getByTestId(`standing-${champion}`)).toContainText(
        "#9",
      );
      await expect(page.getByTestId(`standing-${id}`)).toContainText(
        actor === parent ? "#13" : "#22",
      );
      await expect(
        page.getByTestId(`standing-${id}`).getByRole("img"),
      ).toBeVisible();
      await expect(page.getByLabel("Your player rankings")).toContainText(
        "Rank #1",
      );
      await expect(page).toHaveURL(
        new RegExp(`player=${id}&mode=player#leaderboard$`),
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: test
          .info()
          .outputPath(
            `${actor === parent ? "family" : "player"}-leaderboard.png`,
          ),
        fullPage: true,
      });
      await actor.client.auth.signOut({ scope: "local" });
      await page.evaluate(() => localStorage.clear());
      await page.goto("/auth");
    }
    await page.goto(
      `/auth?mode=signin&redirect=${encodeURIComponent(`/shooting/${current}?player=${champion}#shot-tools`)}`,
    );
    await page.getByLabel(/^email/i).fill(coach.email);
    await page.getByLabel(/^password/i).fill(coach.password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(
      page.getByRole("complementary", { name: "Log your shots" }),
    ).toBeInViewport();
    await expect(page.getByLabel("Logging for")).toHaveValue(champion);
    await expect(page.getByLabel("Reason for correction")).toHaveCount(0);
    await page.getByLabel("Daily shot total").fill("100");
    await page
      .getByRole("button", { name: "Save today’s total", exact: true })
      .click();
    await expect(
      page.getByText("100 shots saved for today.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId(`standing-${champion}`)).toContainText(
      "100 shots",
    );
    await page.getByRole("link", { name: "Open coach tools" }).click();
    await expect(page.getByLabel("Reason for correction")).toBeVisible();
    // Rules are coach-only and the scoring cap locks after the first entry.

    await expect(page.getByLabel("Daily leaderboard cap")).toHaveValue("300");
    await expect(page.getByLabel("Daily leaderboard cap")).toBeEnabled();
    await page
      .getByRole("button", { name: "Save shot rules", exact: true })
      .click();
    await expect(page.getByText("Challenge rules saved.")).toBeVisible();
    await page.getByLabel("Daily shot total").fill("3000");
    await page
      .getByLabel("Reason for correction")
      .fill("Confirmed total including bonus shots");
    await page
      .getByRole("button", { name: "Save correction", exact: true })
      .click();
    await expect(page.getByTestId(`standing-${champion}`)).toContainText(
      "300 shots",
    );
    await expect(page.getByTestId(`standing-${champion}`)).not.toContainText(
      "Bonus Boss",
    );
    for (const [actor, id] of [
      [parent, child],
      [self, independent],
    ]) {
      await page.evaluate(() => localStorage.clear());
      await page.goto(
        `/auth?mode=signin&redirect=${encodeURIComponent(`/shooting/${current}?player=${id}&mode=player#shot-tools`)}`,
      );
      await page.getByLabel(/^email/i).fill(actor.email);
      await page.getByLabel(/^password/i).fill(actor.password);
      await page.getByRole("button", { name: "Sign In", exact: true }).click();
      await expect(
        page.getByText("Daily shot rules", { exact: true }),
      ).toHaveCount(0);
      await expect(page.getByLabel("Daily shot total")).toHaveValue("75");
      await page.getByLabel("Daily shot total").fill("3000");
      await expect(page.getByLabel("Daily shot breakdown")).toContainText(
        "2,700",
      );
      await page
        .getByRole("button", { name: "Save today’s total", exact: true })
        .click();
      await expect(
        page.getByText("3000 shots saved for today.", { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText("3,000 shots saved for today.", { exact: true }),
      ).toBeVisible();
      await expect(page.getByTestId(`standing-${id}`)).toContainText(
        "300 shots",
      );
      await expect(page.getByLabel("Your player rankings")).toContainText(
        "Rank #1",
      );
      await expect(
        page.getByLabel(
          `Log shots for ${actor === parent ? "Late QA" : "Independent QA"}`,
        ),
      ).not.toContainText("Bonus Boss");
      ok(
        await actor.client.auth.signInWithPassword({
          email: actor.email,
          password: actor.password,
        }),
      );
      const score = ok(
        await actor.client.rpc("get_shooting_challenge", { p_id: current }),
      );
      expect(score.players.find((p: any) => p.player_id === id)).toMatchObject({
        total: 300,
        raw_total: 3000,
        bonus_total: 2700,
        bonus_boss: false,
        rank: 1,
      });
      expect(
        (
          await actor.client.rpc("set_shooting_challenge_cap", {
            p_id: current,
            p_daily_cap: 10000,
            p_expected_cap: 300,
          })
        ).error,
      ).toBeTruthy();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
      await page.screenshot({
        path: test
          .info()
          .outputPath(
            `${actor === parent ? "parent" : "player"}-bonus-cap.png`,
          ),
        fullPage: true,
      });
    }
    // Publish a real custom-cap challenge from the mobile coach form.
    await page.evaluate(() => localStorage.clear());
    await page.goto(
      `/auth?mode=signin&redirect=${encodeURIComponent(`/teams/${teams[0]}/shooting/new`)}`,
    );
    await page.getByLabel(/^email/i).fill(coach.email);
    await page.getByLabel(/^password/i).fill(coach.password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await page.getByText("Scoring rules · 300 daily points", { exact: true }).click();
    await expect(page.getByLabel("Daily leaderboard cap")).toHaveValue("300");
    await page.getByLabel("Daily leaderboard cap").fill("175");
    await page
      .getByRole("button", { name: "Publish challenge", exact: true })
      .click();
    await expect(page).toHaveURL(/\/shooting\/[0-9a-f-]+$/);
    const publishedId = new URL(page.url()).pathname.split("/").at(-1);
    const published = ok(
      await coach.client.rpc("get_shooting_challenge", { p_id: publishedId }),
    );
    expect(published.challenge.daily_cap).toBe(175);
    expect(
      published.players.every(
        (p: any) => p.total === 0 && p.rank === null && !p.bonus_boss,
      ),
    ).toBe(true);
  } finally {
    await page.close();
    for (const team of teams)
      ok(await admin.from("shooting_challenges").delete().eq("team_id", team));
    for (const id of players) {
      for (const table of [
        "personal_task_completions",
        "personal_session_completions",
        "task_completions",
        "session_completions",
        "personal_practice_cards",
      ])
        ok(await admin.from(table).delete().eq("player_id", id));
    }
    for (const team of teams)
      ok(await admin.from("teams").delete().eq("id", team));
    for (const id of players)
      ok(await admin.from("players").delete().eq("id", id));
    for (const actor of actors) {
      await actor.client.auth.signOut({ scope: "global" });
      ok(await admin.auth.admin.deleteUser(actor.id));
    }
    fs.unlinkSync(file);
  }
});
