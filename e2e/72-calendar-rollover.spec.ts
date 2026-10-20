import { test, expect, type Page } from "@playwright/test";
const player = "11111111-1111-4111-8111-111111111111",
  team = "22222222-2222-4222-8222-222222222222";
const first = "44444444-4444-4444-8444-444444444444",
  second = "55555555-5555-4555-8555-555555555555";
async function fixture(page: Page) {
  let tomorrow = false;
  let completionInstant = "";
  // Keep this controlled-clock UI fixture's session alive while advancing calendar time.
  await page.addInitScript(() => {
    for (const key of Object.keys(localStorage))
      if (key.endsWith("-auth-token")) {
        const session = JSON.parse(localStorage.getItem(key)!);
        session.expires_at = 4102444800;
        localStorage.setItem(key, JSON.stringify(session));
      }
  });
  await page.addInitScript(
    (id) => localStorage.setItem(`first_run_dismissed_${id}`, "true"),
    player,
  );
  await page.route("**/rest/v1/**", async (r) => {
    const path = new URL(r.request().url()).pathname.split("/").at(-1),
      single = r.request().headers().accept?.includes("object");
    const date = await page.evaluate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    const title = tomorrow ? "New day workout" : "Previous day workout",
      card = tomorrow ? second : first;
    let data: unknown = [];
    if (path === "players")
      data = {
        id: player,
        first_name: "Morgan",
        birth_year: 2014,
        last_initial: "P",
        owner_user_id: "dff63537-d994-48fd-a5a0-c1f149e9b05d",
      };
    if (path === "player_team_preferences")
      data = { player_id: player, active_team_id: team };
    if (path === "team_memberships")
      data = [
        {
          player_id: player,
          team_id: team,
          status: "active",
          teams: { id: team, name: "Calendar Hawks", palette_id: "brand" },
          players: { id: player, first_name: "Morgan", last_initial: "P" },
        },
      ];
    if (path === "teams")
      data = { id: team, name: "Calendar Hawks", palette_id: "brand" };
    if (path === "get_today_snapshot")
      data = {
        success: true,
        player_id: player,
        team_id: team,
        date,
        mode: "normal",
        has_card: true,
        card_id: card,
        progress: { completed: tomorrow ? 0 : 1, total_required: 1 },
      };
    if (path === "practice_cards")
      data = single
        ? {
            id: card,
            date,
            title,
            team_id: team,
            mode: "normal",
            practice_tasks: [
              {
                id: card,
                label: title,
                is_required: true,
                task_type: "mobility",
                sort_order: 0,
              },
            ],
          }
        : [];
    if (
      path === "practice_cards" &&
      !single &&
      new URL(r.request().url()).searchParams.has("date")
    ) {
      data = [
        {
          id: card,
          date,
          title,
          team_id: team,
          mode: "normal",
          practice_tasks: [
            {
              id: card,
              label: title,
              is_required: true,
              task_type: "mobility",
              sort_order: 0,
            },
          ],
        },
      ];
    }
    if (path === "personal_practice_cards")
      data = { id: card, date, title, published_at: new Date().toISOString() };
    if (path === "personal_practice_tasks")
      data = [{ id: card, label: title, task_type: "mobility", sort_order: 0 }];
    if (
      path === "personal_session_completions" ||
      path === "session_completions"
    )
      data = single
        ? tomorrow
          ? null
          : { status: "complete", completed_at: new Date().toISOString() }
        : [];
    if (path === "session_completions" && !single) {
      if (!completionInstant)
        completionInstant = await page.evaluate(() => {
          const d = new Date();
          d.setHours(12, 0, 0, 0);
          return d.toISOString();
        });
      data = [
        {
          player_id: player,
          completed_at: completionInstant,
          practice_card_id: first,
        },
      ];
    }
    if (path === "get_team_dashboard_snapshot")
      data = {
        success: true,
        team: { id: team, name: "Calendar Hawks", palette_id: "brand" },
        onboarding: { completed: true, checklist: [] },
        today: {
          date,
          mode: "normal",
          game_day: {
            enabled: true,
            event_time: "11:30 PM",
            opponent: "Late local game",
          },
          practice_card: {
            exists: true,
            published: true,
            card_id: card,
            title,
            tier: "rep",
            mode: "normal",
          },
        },
        pulse: {
          players_count: 1,
          active_today_count: tomorrow ? 0 : 1,
          sessions_complete_today: tomorrow ? 0 : 1,
        },
        upcoming: [],
      };
    if (path === "players" && !single) data = [data];
    await r.fulfill({ json: data });
  });
  return Object.assign(
    () => {
      tomorrow = true;
    },
    { completion: () => completionInstant },
  );
}
for (const timezoneId of [
  "America/Vancouver",
  "Asia/Tokyo",
  "America/New_York",
]) {
  test.describe(timezoneId, () => {
    test.use({ timezoneId, viewport: { width: 320, height: 844 } });
    for (const role of [
      "coach",
      "family",
      "home",
      "progress",
      "wake",
      "player",
    ])
      test(`${role} switches workouts at local midnight without reload`, async ({
        page,
      }, info) => {
        await page.clock.install();
        if (role === "progress") {
          // Construct wall time inside the emulated browser (WebKit freezes its offset).
          const sunday = await page.evaluate(() =>
            new Date(2026, 10, 1, 23, 59, 58).toISOString(),
          );
          await page.clock.setSystemTime(new Date(sunday));
        }
        const next = await fixture(page);
        const path =
          role === "coach"
            ? `/teams/${team}`
            : role === "family" || role === "wake"
              ? `/players/${player}/home`
              : role === "progress"
                ? `/teams/${team}/progress`
                : role === "player"
                  ? `/players/${player}/today`
                  : `/solo/today/${player}`;
        await page.goto(path);
        if (role === "progress")
          await expect(
            page.getByRole("region", { name: "Workouts this week" }),
          ).toContainText("1 workouts");
        else if (role === "coach")
          await expect(
            page.getByRole("region", { name: "Team overview" }),
          ).toContainText("1 / 1 players");
        else
          await expect(
            page.getByText("Previous day workout", { exact: true }).first(),
          ).toBeVisible();
        // Move the clock without firing unrelated long-running auth timers.
        const midnight = await page.evaluate(() => {
          const d = new Date();
          d.setHours(23, 59, 58, 0);
          return d.toISOString();
        });
        await page.clock.setSystemTime(new Date(midnight));
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        next();
        if (role === "wake") {
          const after = new Date(new Date(midnight).getTime() + 3000);
          await page.clock.setSystemTime(after);
          await page.evaluate(() =>
            document.dispatchEvent(new Event("visibilitychange")),
          );
        } else await page.clock.fastForward(3000);
        if (role === "progress")
          await info.attach("calendar-boundary", {
            body: JSON.stringify({
              completion: next.completion(),
              now: await page.evaluate(() => new Date().toISOString()),
            }),
            contentType: "application/json",
          });
        if (role === "progress") {
          await expect(
            page.getByRole("region", { name: "Workouts this week" }),
          ).toContainText("0 workouts");
          await expect(
            page.getByText("Total Sessions", { exact: true }).locator(".."),
          ).toContainText("0");
        } else if (role === "coach")
          await expect(
            page.getByRole("region", { name: "Team overview" }),
          ).toContainText("0 / 1 players");
        else
          await expect(
            page.getByText("New day workout", { exact: true }).first(),
          ).toBeVisible();
        await expect(
          page.getByText("Previous day workout", { exact: true }),
        ).toHaveCount(0);
        if (role === "player")
          await expect(
            page.getByRole("button", { name: /complete session/i }),
          ).toBeDisabled();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
        await page.screenshot({
          path: info.outputPath(`${role}-after-midnight.png`),
          fullPage: true,
        });
      });
  });
}
