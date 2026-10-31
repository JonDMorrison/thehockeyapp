import { test, expect } from "@playwright/test";
test.use({
  storageState: { cookies: [], origins: [] },
  viewport: { width: 390, height: 844 },
});
test("player card opens dated totals and questionnaire, sends stars, thumbs up and words, and restores focus", async ({
  page,
}) => {
  const cheers: any[] = [];
  await page.route("**/rest/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("get_shooting_player_details"))
      return route.fulfill({
        json: {
          profile: {
            fav_nhl_city: "Vancouver Canucks",
            fav_nhl_player: "Quinn Hughes",
            hockey_love: "Playing with friends",
            season_goals: "Improve my shot",
          },
          days: [
            { shot_date: "2026-10-30", shots: 300 },
            { shot_date: "2026-10-29", shots: 200 },
          ],
        },
      });
    if (path.endsWith("team_cheers")) {
      cheers.push(route.request().postDataJSON());
      return route.fulfill({ status: 201, json: [] });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto("/e2e/fixtures/player-standings.html");
  const card = page.getByRole("button", {
    name: "View Eli R: daily shots and profile",
  });
  await card.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Eli R" })).toBeVisible();
  await expect(dialog.getByText("Oct 30, 2026")).toBeVisible();
  await expect(
    dialog.getByRole("cell", { name: "300", exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText("Vancouver Canucks")).toBeVisible();
  await expect(dialog.getByText("Improve my shot")).toBeVisible();
  for (const emoji of ["⭐", "👍"]) {
    await dialog.getByRole("button", { name: "Cheer", exact: true }).click();
    await page.getByRole("button", { name: emoji, exact: true }).click();
  }
  await dialog.getByRole("button", { name: "Cheer", exact: true }).click();
  await page.getByPlaceholder(/type.*message/i).fill("Great work, Eli!");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect.poll(() => cheers.length).toBe(3);
  expect(cheers.map((c) => c.content)).toEqual([
    "⭐",
    "👍",
    "Great work, Eli!",
  ]);
  expect(
    cheers.every(
      (c) =>
        c.from_player_id === "mine" &&
        c.to_player_id === "friend" &&
        c.team_id === "team",
    ),
  ).toBeTruthy();
  await expect(page.getByPlaceholder(/type.*message/i)).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(card).toBeFocused();
});
test("failed details can be retried and empty history is explicit", async ({
  page,
}) => {
  let failed = true;
  await page.route("**/rest/v1/**", (route) =>
    new URL(route.request().url()).pathname.endsWith(
      "get_shooting_player_details",
    )
      ? route.fulfill(
          failed
            ? { status: 503, json: { message: "offline" } }
            : { json: { profile: {}, days: [] } },
        )
      : route.fulfill({ json: [] }),
  );
  await page.goto("/e2e/fixtures/player-standings.html");
  await page
    .getByRole("button", { name: "View Eli R: daily shots and profile" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Couldn’t load");
  failed = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByText("No shots logged yet.")).toBeVisible();
});
