import { test, expect, type Page } from "@playwright/test";
const team = "22222222-2222-4222-8222-222222222222";
const player = "11111111-1111-4111-8111-111111111111";
async function fixture(page: Page, empty = false) {
  let fail = false;
  await page.route("**/rest/v1/**", async (r) => {
    const url = new URL(r.request().url());
    const path = url.pathname.split("/").at(-1);
    let data: unknown = [];
    if (path === "get_team_dashboard_snapshot")
      data = {
        success: true,
        team: { id: team, name: "QA Hawks", palette_id: "brand" },
        onboarding: { completed: true },
        today: {},
        pulse: {},
        upcoming: [],
      };
    if (path === "team_roles")
      data = [
        {
          team_id: team,
          role: "head_coach",
          teams: { id: team, name: "QA Hawks" },
        },
      ];
    if (path === "team_memberships")
      data = [
        {
          player_id: player,
          players: {
            id: player,
            first_name: "Grace",
            last_initial: "P",
            jersey_number: "13",
            profile_photo_url: null,
          },
        },
      ];
    if (path === "session_completions") {
      expect(url.searchParams.get("practice_cards.team_id")).toBe(`eq.${team}`);
      expect(url.searchParams.get("program_source")).toBe("eq.team");
      expect(
        url.searchParams
          .getAll("completed_at")
          .some((p) => p.startsWith("lte.")),
      ).toBe(true);
      data = Array.from({ length: 2 }, (_, i) => ({
        player_id: player,
        practice_card_id: String(i),
        completed_at: new Date().toISOString(),
      }));
    }
    const challenges = [
      {
        id: "challenge-a",
        team_id: team,
        name: "Team shooting",
        start_date: "2026-10-01",
        end_date: "2026-11-01",
        timezone: "America/Vancouver",
        status: "Live",
      },
      {
        id: "challenge-b",
        team_id: team,
        name: "Next challenge",
        start_date: "2027-01-01",
        end_date: "2027-01-10",
        timezone: "America/Vancouver",
        status: "Scheduled",
      },
    ];
    if (path === "list_shooting_challenges") data = empty ? [] : challenges;
    if (path === "get_shooting_challenge") {
      if (fail)
        return r.fulfill({
          status: 503,
          json: { message: "Controlled failure" },
        });
      const second = r.request().postDataJSON().p_id === "challenge-b";
      data = {
        challenge: challenges[second ? 1 : 0],
        status: second ? "Scheduled" : "Live",
        is_staff: true,
        players: [
          {
            player_id: player,
            first_name: "Grace",
            last_initial: "P",
            total: second ? 0 : 125,
            rank: second ? null : 1,
            active_member: true,
          },
        ],
        days: [],
      };
    }
    if (path === "profiles")
      data = r.request().headers().accept?.includes("object")
        ? { user_id: "dff63537-d994-48fd-a5a0-c1f149e9b05d" }
        : [];
    await r.fulfill({ json: data });
  });
  return {
    fail: (v: boolean) => {
      fail = v;
    },
  };
}
test("workout and shooting progress stays readable on mobile, switches dates and links to real details", async ({
  page,
}, info) => {
  await fixture(page);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/teams/${team}/progress`);
    const workouts = page.getByRole("region", { name: "Workouts this week" });
    await expect(workouts).toContainText("2");
    await expect(workouts).toContainText("1 / 1");
    const shooting = page.getByRole("region", { name: "Shooting challenge" });
    await expect(shooting).toContainText("125");
    await expect(
      shooting.getByRole("link", { name: "View full challenge" }),
    ).toHaveAttribute("href", "/shooting/challenge-a");
    await page.getByLabel("Choose challenge").selectOption("challenge-b");
    await expect(shooting).toContainText("Logging opens on the start date.");
    await expect(shooting).not.toContainText("125");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`progress-${width}.png`),
      fullPage: true,
    });
  }
});
test("failed shot reads show retry rather than false zero, recovery works", async ({
  page,
}) => {
  const control = await fixture(page);
  control.fail(true);
  await page.goto(`/teams/${team}/progress`);
  await expect(page.getByText("Shot totals couldn’t load")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByText("0 shots logged")).toHaveCount(0);
  control.fail(false);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("region", { name: "Shooting challenge" }),
  ).toContainText("125");
});
test("no challenge gives a clear start action without hiding workouts", async ({
  page,
}) => {
  await fixture(page, true);
  await page.goto(`/teams/${team}/progress`);
  await expect(
    page.getByRole("link", { name: "Start a shooting challenge" }),
  ).toHaveAttribute("href", `/teams/${team}/shooting/new`);
  await expect(
    page.getByRole("region", { name: "Workouts this week" }),
  ).toContainText("2");
});
