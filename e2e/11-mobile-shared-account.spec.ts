import path from "node:path";
import { expect, test } from "@playwright/test";

const teamId = process.env.MOBILE_TEST_TEAM_ID;
const playerId = process.env.MOBILE_TEST_PLAYER_ID;
const teamName = process.env.MOBILE_TEST_TEAM_NAME;
const playerName = process.env.MOBILE_TEST_PLAYER_NAME;

test.use({ viewport: { width: 390, height: 844 } });

test.describe("mobile shared-account journeys", () => {
  test.beforeEach(() => {
    test.skip(
      !teamId || !playerId || !teamName || !playerName,
      "Set the MOBILE_TEST_* fixture variables for a coach-parent account.",
    );
  });

  test("one account can switch between coach and parent workspaces", async ({ page }) => {
    await page.goto(`/players/${playerId}/home`);
    const welcomeDismiss = page.getByRole("button", { name: /got it/i });
    if (await welcomeDismiss.waitFor({ state: "visible", timeout: 5_000 }).then(() => true).catch(() => false)) {
      await welcomeDismiss.click();
    }
    await expect(page.getByRole("button", { name: /switch workspace or role/i })).toBeVisible();

    await page.getByRole("button", { name: /switch workspace or role/i }).click();
    const teamItem = page.getByRole("menuitem").filter({ hasText: teamName! });
    const playerItem = page.getByRole("menuitem").filter({ hasText: playerName! });
    await expect(teamItem).toBeVisible();
    await expect(playerItem).toBeVisible();

    await teamItem.click();
    await expect(page).toHaveURL(new RegExp(`/teams/${teamId}`));

    await page.getByRole("button", { name: /switch workspace or role/i }).click();
    await page.getByRole("menuitem").filter({ hasText: playerName! }).click();
    await expect(page).toHaveURL(new RegExp(`/players/${playerId}/home`));
  });

  test("the team invitation profile wizard works on a phone", async ({ page }) => {
    await page.goto(`/players/${playerId}/team-onboarding/${teamId}`);
    await expect(page.getByRole("heading", { name: new RegExp(`tell the coaches about ${playerName}`, "i") })).toBeVisible();

    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByRole("heading", { name: /their hockey story/i })).toBeVisible();
    await expect(page.getByLabel(/favourite player/i)).toBeVisible();
    await expect(page.getByLabel(/favourite thing about hockey/i)).toBeVisible();
    await expect(page.getByLabel(/hockey dream/i)).toBeVisible();

    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByRole("heading", { name: /add a player photo/i })).toBeVisible();

    const fileInput = page.getByRole("main").locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(process.cwd(), "public", "favicon.png"));
    await expect(page.getByAltText("Selected player")).toBeVisible();
  });
});
