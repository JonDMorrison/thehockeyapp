import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
const team = "22222222-2222-4222-8222-222222222222";
const id = "11111111-1111-4111-8111-111111111111";
const owner = "dff63537-d994-48fd-a5a0-c1f149e9b05d";
async function fixture(
  page: Page,
  { sparse = false, photo = false, long = false, editable = true } = {},
) {
  let failed = false;
  let player = {
    id,
    first_name: long ? "Alexandertheverylongfirstname" : "Jaxon",
    last_initial: sparse ? null : "P",
    birth_year: sparse ? null : 2017,
    jersey_number: sparse ? null : "13",
    shoots: sparse ? null : "left",
    position: sparse ? null : "forward",
    profile_photo_url: photo ? "player-photos:fixture/photo.png" : null,
    owner_user_id: editable ? owner : "99999999-9999-4999-8999-999999999999",
    fav_nhl_city: sparse ? null : "Vancouver",
    fav_nhl_player: sparse ? null : "Celebrini",
    hockey_love: sparse ? null : "Skating fast and being part of a team.",
    season_goals: sparse
      ? null
      : long
        ? "A".repeat(240)
        : "Build a better wrist shot.",
  };
  await page.route("**/rest/v1/**", async (r) => {
    const path = new URL(r.request().url()).pathname.split("/").at(-1);
    const single = r.request().headers().accept?.includes("object");
    let data: unknown = [];
    if (path === "team_memberships" && single) {
      if (failed)
        return r.fulfill({
          status: 503,
          json: { message: "Controlled profile failure" },
        });
      data = { id: "membership", player_id: id, players: player };
    }
    if (path === "teams")
      data = {
        id: team,
        name: long ? "H".repeat(100) : "Abbotsford Hawks U11 A2",
      };
    if (path === "players") {
      if (r.request().method() === "PATCH")
        player = { ...player, ...r.request().postDataJSON() };
      data = single ? player : [player];
    }
    if (path === "player_guardians")
      data = editable ? [{ user_id: owner, guardian_role: "owner" }] : [];
    if (path === "profiles")
      data = single
        ? { user_id: owner, display_name: "QA Parent" }
        : [{ user_id: owner, display_name: "QA Parent" }];
    await r.fulfill({ json: data });
  });
  await page.route("**/storage/v1/object/sign/player-photos/**", (r) =>
    r.request().method() === "POST"
      ? r.fulfill({
          json: {
            signedURL:
              "/object/sign/player-photos/fixture/photo.png?token=fixture",
          },
        })
      : r.fulfill({
          contentType: "image/png",
          body: fs.readFileSync("public/favicon.png"),
        }),
  );
  return {
    fail: (value: boolean) => {
      failed = value;
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
test("coach player card is visual, read-only, responsive, and opens progress", async ({
  page,
}, info) => {
  await fixture(page);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/teams/${team}/roster/${id}`);
    await expect(
      page.getByRole("heading", { name: "Jaxon P.", exact: true }).last(),
    ).toBeVisible();
    await expect(page.getByText("Vancouver", { exact: true })).toBeVisible();
    await expect(page.getByText("Celebrini", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /upload.*photo/i }),
    ).toHaveCount(0);
    await expect(
      page.locator('img[src="/images/email/rink.jpg"]'),
    ).toBeVisible();
    expect(
      await page
        .locator('img[src="/images/email/rink.jpg"]')
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(0);
    await fits(page);
    await page.screenshot({
      path: info.outputPath(`coach-${width}.png`),
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "View Progress", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/players/${id}/home$`));
});
test("family card preserves private photo and editing with saved values", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page, { photo: true });
  await page.goto(`/players/${id}`);
  await expect(
    page.getByRole("img", { name: "Jaxon P.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /upload.*photo/i }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("family-390.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.locator("#fav_nhl_player").fill("Quinn Hughes");
  await page.getByRole("button", { name: "Save", exact: true }).last().click();
  await expect(page.getByText("Quinn Hughes", { exact: true })).toBeVisible();
  await fits(page);
  await page.reload();
  await expect(page.getByText("Quinn Hughes", { exact: true })).toBeVisible();
});
test("sparse profiles omit unknown facts and invite families to personalize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await fixture(page, { sparse: true });
  await page.goto(`/teams/${team}/roster/${id}`);
  await expect(
    page.getByRole("heading", { name: "Jaxon", exact: true }).last(),
  ).toBeVisible();
  await expect(page.getByText(/born|null|unknown|undefined|NaN/i)).toHaveCount(
    0,
  );
  await expect(page.getByRole("heading", { name: /about jaxon/i })).toHaveCount(
    0,
  );
  await fits(page);
  await page.goto(`/players/${id}`);
  await expect(page.getByText(/Make this card your own/)).toBeVisible();
  await fits(page);
});
test("long names wrap at 320px and failed reads recover without invented data", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 320, height: 760 });
  const control = await fixture(page, { long: true });
  control.fail(true);
  await page.goto(`/teams/${team}/roster/${id}`);
  await expect(page.getByRole("alert")).toContainText(
    "Couldn’t load this player",
    { timeout: 20000 },
  );
  await expect(
    page.getByRole("button", { name: "View Progress", exact: true }),
  ).toHaveCount(0);
  control.fail(false);
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "View Progress", exact: true }),
  ).toBeVisible();
  await fits(page);
  await page.screenshot({
    path: info.outputPath("long-320.png"),
    fullPage: true,
  });
});

test("viewing another player's profile never exposes family edit controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await fixture(page, { editable: false });
  await page.goto(`/players/${id}`);
  await expect(page.getByText("Celebrini", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /upload.*photo/i }),
  ).toHaveCount(0);
  await fits(page);
});
