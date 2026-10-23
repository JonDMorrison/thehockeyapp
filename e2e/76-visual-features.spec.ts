import { test, expect } from "@playwright/test";
import path from "node:path";

test.use({ storageState: { cookies: [], origins: [] } });
for (const width of [320, 390, 1280]) {
  test(`Features actions and visual examples work at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = [],
      writes: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes(".supabase.co"))
        writes.push(request.url());
    });
    await page.goto("/features");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "A clear plan. Real progress.",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Sample weekly plan")).toBeVisible();
    await expect(page.getByLabel("Sample shooting leaderboard")).toContainText(
      "200 shots",
    );
    await expect(page.getByLabel("Sample workout progress")).toContainText(
      "4 of 5 workouts",
    );
    await expect(
      page.getByRole("heading", { name: "Small wins. In plain sight." }),
    ).toBeVisible();
    for (const id of ["coaches", "visibility", "players", "included"]) {
      const section = page.locator(`#${id}`);
      await section.scrollIntoViewIfNeeded();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
    await page.screenshot({
      path: info.outputPath(`features-${width}.png`),
      fullPage: true,
      style: "nav { visibility: hidden; }",
    });
    if (process.env.AUDIT_SCREENSHOT_DIR) {
      await page
        .getByRole("region", { name: "Less admin. More hockey." })
        .screenshot({
          path: path.join(
            process.env.AUDIT_SCREENSHOT_DIR,
            `features-coaches-${width}.png`,
          ),
          style: "nav { visibility: hidden; }",
        });
      await page
        .getByRole("region", { name: "Small wins. In plain sight." })
        .screenshot({
          path: path.join(
            process.env.AUDIT_SCREENSHOT_DIR,
            `features-parents-${width}.png`,
          ),
          style: "nav { visibility: hidden; }",
        });
    }
    await page.getByRole("link", { name: "For parents", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Small wins. In plain sight." }),
    ).toBeInViewport();
    await page
      .getByRole("button", { name: "Start for my child", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Create your family account" }),
    ).toBeVisible();
    await page.goto("/features");
    await page
      .getByRole("link", { name: "Join your team", exact: true })
      .click();
    await expect(page.getByLabel("Team invite code or link")).toBeVisible();
    await page.goto("/features");
    const coach = page
      .getByRole("article", { name: "Plan your way.", exact: true })
      .getByRole("button", { name: "Set up your team", exact: true });
    await coach.focus();
    await coach.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Create your coach account" }),
    ).toBeVisible();
    await page.goto("/features");
    await page
      .getByRole("link", { name: "Try a shooting challenge", exact: true })
      .click();
    await expect(page).toHaveURL(/demo#shooting-challenge$/);
    await expect(page.locator("#shooting-challenge")).toBeInViewport();
    await page
      .getByRole("button", { name: "Start sample challenge", exact: true })
      .click();
    await page
      .locator("#shooting-challenge")
      .getByLabel("Sample daily shot total")
      .fill("125");
    await page
      .getByRole("button", { name: "Save sample shots", exact: true })
      .click();
    await expect(
      page.locator("#shooting-challenge").getByRole("status"),
    ).toContainText("125");
    await page.goto("/features");
    await page
      .getByRole("link", { name: "Explore the demo", exact: true })
      .click();
    await expect(page.locator("#sample-workout-heading")).toBeInViewport();
    expect(errors).toEqual([]);
    expect(writes).toEqual([]);
  });
}
