import { test, expect, type Page } from "@playwright/test";
const challenge = "55555555-5555-4555-8555-555555555555",
  team = "22222222-2222-4222-8222-222222222222",
  eli = "11111111-1111-4111-8111-111111111111",
  grace = "33333333-3333-4333-8333-333333333333";
async function fixture(
  page: Page,
  { staff = true, status = "Live", empty = false } = {},
) {
  let saved = 500,
    fail = false;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  await page.route("**/rest/v1/**", async (r) => {
    const path = new URL(r.request().url()).pathname.split("/").at(-1);
    let data: unknown = [];
    if (path === "get_shooting_challenge") {
      if (fail)
        return r.fulfill({
          status: 503,
          json: { message: "Controlled read failure" },
        });
      data = {
        challenge: {
          id: challenge,
          team_id: team,
          name: "Team shooting challenge",
          start_date: today,
          end_date: today,
          timezone: "America/Vancouver",
        },
        team_name: "Abbotsford Hawks U11 A2",
        today,
        status,
        is_staff: staff,
        corrected: saved !== 500,
        days: [
          {
            player_id: eli,
            shot_date: today,
            shots: saved,
            version: saved === 500 ? 1 : 2,
          },
          { player_id: grace, shot_date: today, shots: 500, version: 1 },
        ],
        audit: [],
        players: empty
          ? []
          : [
              {
                player_id: eli,
                first_name: "Eli",
                last_initial: "R",
                eligible_from: today,
                total: saved,
                rank: 1,
                is_mine: false,
                active_member: true,
              },
              {
                player_id: grace,
                first_name: "Grace",
                last_initial: "P",
                eligible_from: today,
                total: 500,
                rank: saved === 500 ? 1 : 2,
                is_mine: true,
                active_member: true,
              },
              ...Array.from({ length: 10 }, (_, i) => ({
                player_id: `player-${i}`,
                first_name:
                  i === 0 ? "Alexandertheverylongfirstname" : "Player",
                last_initial: String(i),
                eligible_from: today,
                total: 0,
                rank: null,
                is_mine: false,
                active_member: i !== 9,
              })),
            ],
      };
    }
    if (path === "save_shooting_challenge_day") {
      const body = r.request().postDataJSON();
      expect(body.p_id).toBe(challenge);
      expect(body.p_date).toBe(today);
      expect(body.p_shots).toBe(600);
      expect(body.p_version).toBe(1);
      expect(body.p_reason).toBe("Parent confirmed missing shots");
      saved = 600;
      data = { shots: 600, version: 2 };
    }
    if (path === "team_invites") data = { token: "fixture-only-invite" };
    await r.fulfill({ json: data });
  });
  return {
    fail: (v: boolean) => {
      fail = v;
    },
  };
}
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
test("coach layout uses desktop width and keeps standings beside corrections; mobile remains readable", async ({
  page,
}, info) => {
  await fixture(page);
  for (const width of [320, 390, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/shooting/${challenge}`);
    await expect(page.getByTestId("challenge-total")).toHaveText("1,000");
    const standings = page.getByRole("region", { name: "Challenge standings" }),
      tools = page.getByRole("complementary", {
        name: "Coach challenge tools",
      });
    await expect(standings.getByRole("listitem")).toHaveCount(12);
    await expect(page.getByTestId(`standing-${eli}`)).toContainText(
      "500 shots",
    );
    await expect(page.getByTestId(`standing-${grace}`)).toContainText(
      "Your player",
    );
    await expect(page.getByTestId("standing-player-9")).toContainText(
      "Former team member",
    );
    const a = await standings.boundingBox(),
      b = await tools.boundingBox();
    if (width >= 1024) {
      expect(Math.abs(a!.y - b!.y)).toBeLessThan(3);
      expect(a!.width).toBeGreaterThan(b!.width);
      expect(
        (await page
          .getByRole("region", { name: "Challenge overview" })
          .boundingBox())!.width,
      ).toBeGreaterThan(1100);
    } else expect(a!.y).toBeLessThan(b!.y);
    await fits(page);
    await page.screenshot({
      path: info.outputPath(`coach-${width}.png`),
      fullPage: true,
    });
  }
  await page.getByLabel("Daily shot total").fill("600");
  await expect(
    page.getByRole("button", { name: "Save correction" }),
  ).toBeDisabled();
  await page
    .getByLabel("Reason for correction")
    .fill("Parent confirmed missing shots");
  await page.getByRole("button", { name: "Save correction" }).click();
  await expect(
    page.getByText("600 shots saved for today.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("challenge-total")).toHaveText("1,100");
  await page
    .getByRole("button", { name: "Invite families", exact: true })
    .click();
  await expect(page.getByLabel("Shareable link")).toHaveValue(
    /join\/fixture-only-invite\?challenge=/,
  );
});
test("family sees shot entry first on mobile without coach controls; finished results lock logging", async ({
  page,
}) => {
  await fixture(page, { staff: false, status: "Finished" });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(`/shooting/${challenge}?player=${grace}`);
  await expect(
    page.getByRole("heading", { name: "Final standings" }),
  ).toBeVisible();
  await expect(page.getByLabel("Daily shot total")).toBeDisabled();
  await expect(page.getByLabel("Reason for correction")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Invite families", exact: true }),
  ).toHaveCount(0);
  const form = await page
      .getByRole("complementary", { name: "Log your shots" })
      .boundingBox(),
    standings = await page
      .getByRole("region", { name: "Challenge standings" })
      .boundingBox();
  expect(form!.y).toBeLessThan(standings!.y);
  await fits(page);
});
test("scheduled and empty challenges have an honest empty state", async ({
  page,
}) => {
  await fixture(page, { status: "Scheduled", empty: true });
  await page.goto(`/shooting/${challenge}`);
  await expect(page.getByTestId("challenge-total")).toHaveText("0");
  await expect(
    page.getByText(
      "Your challenge is ready. Invite families to get the first shots on the board.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Daily shot total")).toHaveCount(0);
});
test("failed reads show recovery, never false standings or totals", async ({
  page,
}) => {
  const control = await fixture(page);
  control.fail(true);
  await page.goto(`/shooting/${challenge}`);
  await expect(page.getByRole("alert")).toContainText("Challenge unavailable");
  await expect(page.getByTestId("challenge-total")).toHaveCount(0);
  control.fail(false);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByTestId("challenge-total")).toHaveText("1,000");
});

test("first-challenge invitations remain first on mobile", async ({ page }) => {
  await fixture(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/shooting/${challenge}?invite=1`);
  await expect(
    page.getByRole("heading", {
      name: "Your challenge is ready. Bring the team!",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy invitation", exact: true }),
  ).toBeVisible();
  const invite = await page
    .getByRole("complementary", { name: "Coach challenge tools" })
    .boundingBox();
  const standings = await page
    .getByRole("region", { name: "Challenge standings" })
    .boundingBox();
  expect(invite!.y).toBeLessThan(standings!.y);
  await fits(page);
});
