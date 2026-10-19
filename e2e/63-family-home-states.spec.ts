import { test, expect, type Page } from "@playwright/test";
const playerId = "11111111-1111-4111-8111-111111111111",
  team1 = "22222222-2222-4222-8222-222222222222",
  team2 = "33333333-3333-4333-8333-333333333333",
  card = "44444444-4444-4444-8444-444444444444",
  challenge = "55555555-5555-4555-8555-555555555555";
async function setup(
  page: Page,
  { workout = false, phase = "", gameDay = false } = {},
) {
  let active = team1;
  const date = new Date().toISOString().slice(0, 10);
  await page.addInitScript(
    (id) => localStorage.setItem(`first_run_dismissed_${id}`, "true"),
    playerId,
  );
  await page.route("**/rest/v1/**", async (r) => {
    const path = new URL(r.request().url()).pathname.split("/").at(-1),
      single = r.request().headers().accept?.includes("object");
    let data: unknown = [];
    if (path === "players")
      data = {
        id: playerId,
        first_name: "Morgan",
        birth_year: 2014,
        last_initial: "P",
        profile_photo_url: null,
        owner_user_id: "dff63537-d994-48fd-a5a0-c1f149e9b05d",
      };
    if (path === "player_team_preferences") {
      if (r.request().method() !== "GET") {
        active = r.request().postDataJSON().active_team_id;
        data = null;
      } else data = { player_id: playerId, active_team_id: active };
    }
    if (path === "team_memberships")
      data = [team1, team2].map((id, i) => ({
        id,
        team_id: id,
        status: "active",
        joined_at: "2026-10-01",
        teams: {
          id,
          name: i ? "Weekend Hawks" : "School Hawks",
          palette_id: "brand",
        },
      }));
    if (path === "get_today_snapshot") {
      const selected = active;
      if (selected === team2)
        await new Promise((resolve) => setTimeout(resolve, 400));
      data = {
        success: true,
        player_id: playerId,
        team_id: selected,
        date,
        mode: gameDay ? "game_day" : "normal",
        has_card: workout,
        card_id: workout ? card : null,
        progress: { completed: 0, total_required: workout ? 2 : 0 },
      };
    }
    if (path === "practice_cards")
      data = single
        ? { title: active === team1 ? "School skills" : "Weekend skills" }
        : [];
    if (path === "session_completions") data = single ? null : [];
    if (path === "list_shooting_challenges")
      data = phase
        ? [
            {
              id: challenge,
              team_id: team1,
              name: "Your shooting adventure",
              start_date: date,
              end_date: date,
              timezone: "UTC",
              status: phase,
            },
          ]
        : [];
    if (path === "get_shooting_challenge")
      data = {
        challenge: {
          id: challenge,
          team_id: team1,
          start_date: date,
          end_date: date,
        },
        status: phase,
        players: [
          {
            player_id: playerId,
            is_mine: true,
            active_member: true,
            total: 75,
          },
        ],
        days: [],
      };
    return r.fulfill({ json: data });
  });
  await page.goto(`/players/${playerId}/home`);
  await expect(
    page.getByRole("heading", { name: "Let’s go, Morgan." }),
  ).toBeVisible();
}
test("empty game day offers a home workout without inventing progress", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await setup(page, { gameDay: true });
  const today = page.getByRole("region", {
    name: "Today’s workout",
    exact: true,
  });
  await expect(
    today.getByRole("heading", { name: "Recovery counts, too" }),
  ).toBeVisible();
  await expect(
    today.getByRole("link", { name: "Choose a home workout" }),
  ).toHaveAttribute("href", `/solo/today/${playerId}`);
  await expect(
    page.getByRole("heading", { name: "Your next challenge is coming" }),
  ).toBeVisible();
  await expect(page.getByText("You did it!", { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
for (const phase of ["Scheduled", "Finished"])
  test(`${phase} shooting challenge has a truthful viewing action`, async ({
    page,
  }) => {
    await setup(page, { phase });
    const section = page.getByRole("region", {
      name: "Your shooting challenge",
      exact: true,
    });
    await expect(section.getByText(phase, { exact: true })).toBeVisible();
    await expect(
      section.getByRole("link", {
        name: phase === "Finished" ? "View results" : "View challenge",
        exact: true,
      }),
    ).toHaveAttribute("href", `/shooting/${challenge}?player=${playerId}`);
    await expect(section.getByRole("link", { name: "Log shots" })).toHaveCount(
      0,
    );
  });
test("keyboard team selection replaces the workout and never reuses the previous team snapshot", async ({
  page,
}) => {
  await setup(page, { workout: true });
  const today = page.getByRole("region", {
    name: "Today’s workout",
    exact: true,
  });
  await expect(today.getByText("School skills", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Change active team" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Weekend Hawks" })
    .press("Enter");
  await expect(
    page.getByRole("button", { name: "Change active team" }),
  ).toContainText("Weekend Hawks");
  await expect(
    today.getByText("Weekend skills", { exact: true }),
  ).toBeVisible();
  await expect(today.getByText("School skills", { exact: true })).toHaveCount(
    0,
  );
});
