import { test, expect } from "@playwright/test";
const team = "11111111-1111-4111-8111-111111111111",
  challenge = "22222222-2222-4222-8222-222222222222";
function dashboard(active = 0, players = 3, published = true) {
  return {
    success: true,
    team: {
      id: team,
      name: "Abbotsford Hawks U11 A2",
      palette_id: "brand",
      logo_url: null,
      photo_url: null,
      season_label: null,
    },
    onboarding: { completed: true, checklist: [] },
    today: {
      date: "2026-10-19",
      mode: "normal",
      game_day: { enabled: false, event_time: null, opponent: null },
      practice_card: {
        exists: published,
        published,
        card_id: null,
        title: "Team practice",
        tier: "standard",
        mode: "normal",
      },
    },
    pulse: {
      players_count: players,
      active_today_count: active,
      sessions_complete_today: active ? 1 : 0,
      total_shots_today: 0,
    },
    upcoming: [],
  };
}
const live = {
  id: challenge,
  team_id: team,
  name: "October shooting challenge",
  start_date: "2026-10-18",
  end_date: "2026-11-16",
  timezone: "America/Vancouver",
  status: "Live",
};
async function setup(
  page: import("@playwright/test").Page,
  {
    active = 0,
    players = 3,
    published = true,
    hasChallenge = true,
    failedTotals = false,
  } = {},
) {
  for (const table of ["training_programs", "practice_cards"])
    await page.route(`**/rest/v1/${table}?*`, (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/rpc/get_team_dashboard_snapshot", (r) =>
    r.fulfill({ json: dashboard(active, players, published) }),
  );
  await page.route("**/rest/v1/rpc/list_shooting_challenges", (r) =>
    r.fulfill({ json: hasChallenge ? [live] : [] }),
  );
  let fail = failedTotals;
  await page.route("**/rest/v1/rpc/get_shooting_challenge", (r) => {
    if (fail)
      return r.fulfill({
        status: 503,
        json: { message: "Controlled totals failure" },
      });
    return r.fulfill({
      json: {
        challenge: live,
        team_name: "Abbotsford Hawks U11 A2",
        today: "2026-10-19",
        server_now: "2026-10-19T18:00:00Z",
        starts_at: "2026-10-18T07:00:00Z",
        ends_at: "2026-11-17T08:00:00Z",
        status: "Live",
        is_staff: true,
        players: [
          { player_id: "one", total: 120 },
          { player_id: "two", total: 80 },
          { player_id: "three", total: 0 },
        ],
        days: [],
        audit: [],
      },
    });
  });
  await page.goto(`/teams/${team}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Abbotsford Hawks U11 A2",
  );
  return () => {
    fail = false;
  };
}
for (const width of [320, 1440])
  test(`coach overview is truthful, visual and usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    const overview = page.getByRole("region", { name: "Team overview" });
    await expect(overview.getByRole("heading")).toHaveText(
      "A fresh start for your team",
    );
    await expect(
      page.getByText("Today is moving", { exact: true }),
    ).toHaveCount(0);
    await expect(overview.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    const shooting = page.getByRole("region", {
      name: "Team shooting challenge",
    });
    await expect(shooting.getByText("200", { exact: true })).toBeVisible();
    await expect(shooting.getByText("2", { exact: true })).toBeVisible();
    await expect(
      shooting.getByText("Day 2 of 30", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const left = await overview.boundingBox(),
      right = await shooting.boundingBox();
    if (width > 1000) {
      expect(right!.x).toBeGreaterThan(left!.x + left!.width - 1);
      expect(Math.abs(right!.y - left!.y)).toBeLessThan(2);
    } else expect(right!.y).toBeGreaterThan(left!.y);
    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--primary")
        .trim(),
    );
    expect(primary).toBe("358 46% 52%");
    await expect(
      page.getByText("No workouts assigned yet", { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `/tmp/hockey-coach-home-${test.info().project.name}-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: /Start a program/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page
        .getByRole("dialog")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
  });
test("active players, no training, empty challenge and failed totals stay honest", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page, { active: 2 });
  await expect(
    page.getByText("Your team is getting after it", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  await setup(page, { published: false, hasChallenge: false });
  await expect(
    page.getByText("Start with 50 wrist shots", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Give your team a goal", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start a shooting challenge", exact: true }),
  ).toHaveAttribute("href", `/teams/${team}/shooting/new`);
  await setup(page, { players: 0, published: false, hasChallenge: false });
  await expect(
    page.getByText("Start your team’s training", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start a program", exact: true }),
  ).toBeVisible();
  const recover = await setup(page, { failedTotals: true });
  await expect(
    page.getByText("Challenge totals couldn’t load.", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await expect(
    page
      .getByRole("region", { name: "Team shooting challenge" })
      .getByText("Shots logged", { exact: true }),
  ).toHaveCount(0);
  recover();
  await page
    .getByRole("button", { name: "Retry challenge totals", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Team shooting challenge" })
      .getByText("200", { exact: true }),
  ).toBeVisible();
});
