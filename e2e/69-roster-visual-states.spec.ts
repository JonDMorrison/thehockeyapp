import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
const team = "22222222-2222-4222-8222-222222222222";
const first = "11111111-1111-4111-8111-111111111111";
const owner = "dff63537-d994-48fd-a5a0-c1f149e9b05d";
async function fixture(
  page: Page,
  { empty = false, denied = false, paged = false } = {},
) {
  let childrenFail = false;
  let fail = false,
    rosterReads = 0,
    activityReads = 0;
  const players = [
    "Jaxon",
    "Grace",
    "Alexandertheverylongfirstname",
    "Kai",
  ].map((first_name, i) => ({
    id: i ? `11111111-1111-4111-8111-11111111111${i + 1}` : first,
    first_name,
    last_initial: i === 3 ? null : "P",
    birth_year: i === 3 ? null : 2015,
    jersey_number: i === 3 ? null : String(12 + i),
    position: i === 3 ? null : i === 1 ? "goalie" : "forward",
    shoots: i === 3 ? null : "left",
    profile_photo_url: i === 0 ? "player-photos:fixture/roster.png" : null,
  }));
  const rows = Array.from({ length: paged ? 501 : 3 }, (_, i) => ({
    id: String(i),
    player_id: paged || i < 2 ? first : players[1].id,
    completed_at: new Date().toISOString(),
  }));
  await page.route("**/rest/v1/**", async (r) => {
    const url = new URL(r.request().url()),
      path = url.pathname.split("/").at(-1),
      single = r.request().headers().accept?.includes("object");
    let data: unknown = [];
    if (path === "get_team_dashboard_snapshot")
      data = denied
        ? { success: false, error: "Not authorized" }
        : {
            success: true,
            team: {
              id: team,
              name: "Hawks " + "A".repeat(80),
              palette_id: "brand",
            },
            onboarding: { completed: true },
            today: { mode: "normal", game_day: {}, practice_card: {} },
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
    if (path === "team_memberships") {
      rosterReads++;
      data = empty
        ? []
        : players.map((p, i) => ({
            id: `membership-${i}`,
            player_id: p.id,
            status: "active",
            players: p,
          }));
    }
    if (path === "session_completions") {
      activityReads++;
      expect(url.searchParams.get("practice_cards.team_id")).toBe(`eq.${team}`);
      expect(url.searchParams.get("practice_cards.program_source")).toBe(
        "eq.team",
      );
      expect(url.searchParams.get("program_source")).toBe("eq.team");
      expect(url.searchParams.get("status")).toBe("eq.complete");
      expect(
        url.searchParams
          .getAll("completed_at")
          .some((v) => v.startsWith("gte.")),
      ).toBe(true);
      expect(
        url.searchParams
          .getAll("completed_at")
          .some((v) => v.startsWith("lt.")),
      ).toBe(true);
      if (fail)
        return r.fulfill({
          status: 503,
          json: { message: "Controlled activity read failure" },
        });
      const offset = Number(url.searchParams.get("offset") || 0);
      data = rows.slice(offset, offset + 500);
    }
    if (
      path === "players" &&
      url.searchParams.get("birth_year")?.startsWith("gt.") &&
      childrenFail
    )
      return r.fulfill({
        status: 503,
        json: { message: "Controlled family read failure" },
      });
    if (path === "profiles") data = single ? { user_id: owner } : [];
    await r.fulfill({ json: data });
  });
  await page.route("**/storage/v1/object/sign/player-photos/**", (r) =>
    r.request().method() === "POST"
      ? r.fulfill({
          json: {
            signedURL:
              "/object/sign/player-photos/fixture/roster.png?token=fixture",
          },
        })
      : r.fulfill({
          contentType: "image/png",
          body: fs.readFileSync("public/favicon.png"),
        }),
  );
  return {
    fail: (value: boolean) => {
      fail = value;
    },
    failChildren: (value: boolean) => {
      childrenFail = value;
    },
    reads: () => ({ rosterReads, activityReads }),
  };
}
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
}
test("visual roster fits mobile and desktop, shows factual progress and supports search and keyboard navigation", async ({
  page,
}, info) => {
  await fixture(page);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/teams/${team}/roster`);
    await expect(page.getByRole("article")).toHaveCount(4);
    const jaxon = page.getByRole("article").filter({
      has: page.getByRole("link", {
        name: "View Jaxon P.'s player profile",
        exact: true,
      }),
    });
    await expect(jaxon).toContainText("2 workouts this week");
    await expect(jaxon).toContainText("#12");
    await expect(
      jaxon.getByRole("img", { name: "Jaxon P.", exact: true }),
    ).toBeVisible();
    await expect(
      jaxon.getByRole("img", { name: /Workout days this week/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("article").filter({ hasText: "Kai" }),
    ).toContainText("0 workouts this week");
    await fits(page);
    await page
      .getByRole("button", { name: "Switch workspace or role", exact: true })
      .click();
    await expect(
      page.getByRole("menuitem", { name: /QA Hawks/ }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menuitem", { name: /QA Hawks/ })).toHaveCount(
      0,
    );
    await page.screenshot({
      path: info.outputPath(`roster-${width}.png`),
      fullPage: true,
    });
  }
  const search = page.getByRole("textbox", {
    name: "Find a player by name, jersey or position",
  });
  await search.fill(" #12 ");
  await expect(page.getByRole("article")).toHaveCount(1);
  await search.fill("goalie");
  await expect(page.getByRole("article")).toContainText("Grace");
  await search.fill("nobody matches");
  await expect(
    page.getByText("No players match your search", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  const link = page.getByRole("link", {
    name: "View Jaxon P.'s player profile",
    exact: true,
  });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/teams/${team}/roster/${first}$`));
});
test("progress failure preserves roster cards and retries without showing false zeros", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  const control = await fixture(page);
  control.fail(true);
  await page.goto(`/teams/${team}/roster`);
  await expect(page.getByRole("alert")).toContainText(
    "Progress couldn’t load",
    { timeout: 20000 },
  );
  await expect(page.getByRole("article")).toHaveCount(4);
  await expect(
    page.getByText("Progress unavailable", { exact: true }),
  ).toHaveCount(4);
  await expect(page.getByText(/0 workouts this week/)).toHaveCount(0);
  control.fail(false);
  await page
    .getByRole("button", { name: "Retry progress", exact: true })
    .click();
  await expect(
    page.getByText("2 workouts this week", { exact: false }),
  ).toBeVisible();
  await fits(page);
});
test("empty roster offers family-led setup without invented player cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await fixture(page, { empty: true });
  await page.goto(`/teams/${team}/roster`);
  await expect(
    page.getByRole("button", { name: "Add Player", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
  await fits(page);
});
test("staff authorization failure does not fetch roster or progress", async ({
  page,
}) => {
  const control = await fixture(page, { denied: true });
  await page.goto(`/teams/${team}/roster`);
  await expect(page.getByRole("alert")).toContainText(
    "Team roster couldn’t load",
    { timeout: 20000 },
  );
  expect(control.reads()).toEqual({ rosterReads: 0, activityReads: 0 });
});
test("weekly activity paginates beyond the first 500 rows", async ({
  page,
}) => {
  const control = await fixture(page, { paged: true });
  await page.goto(`/teams/${team}/roster`);
  await expect(
    page.getByText("501 workouts this week", { exact: false }),
  ).toBeVisible();
  expect(control.reads().activityReads).toBe(2);
});

test("failed family reads cannot masquerade as an empty family and encourage duplicate creation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  const control = await fixture(page);
  control.failChildren(true);
  await page.goto(`/teams/${team}/roster`);
  await page.getByRole("button", { name: "Add Player", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText(
    "Your players couldn’t load",
    { timeout: 20000 },
  );
  await expect(
    dialog.getByRole("button", { name: "Create & Add Player", exact: true }),
  ).toHaveCount(0);
  control.failChildren(false);
  await dialog
    .getByRole("button", { name: "Retry players", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Create & Add Player", exact: true }),
  ).toBeVisible();
});
