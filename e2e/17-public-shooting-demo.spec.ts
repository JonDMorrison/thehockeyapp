import { expect, test } from "@playwright/test";
import path from "node:path";

test.use({ storageState: { cookies: [], origins: [] } });
for (const width of [390, 1280]) {
  test.describe(`public shooting challenge at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });
    test("home → challenge → shots → views → coach signup works without backend writes", async ({
      page,
    }) => {
      const writes: string[] = [];
      const errors: string[] = [];
      page.on("request", (r) => {
        if (
          r.method() !== "GET" &&
          /supabase\.co|public-journey-test\.invalid/.test(r.url())
        )
          writes.push(r.url());
      });
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto("/");
      const teaser = page.getByRole("region", {
        name: "Extra shots. A little friendly competition.",
      });
      await expect(teaser).toBeVisible();
      if (process.env.AUDIT_SCREENSHOT_DIR)
        await teaser.screenshot({
          path: path.join(
            process.env.AUDIT_SCREENSHOT_DIR,
            `shooting-home-${width}.png`,
          ),
          style:
            "nav { visibility: hidden; } * { transition: none !important; }",
        });
      await page
        .getByRole("link", { name: "Try a shooting challenge", exact: true })
        .click();
      await expect(page).toHaveURL(/\/demo#shooting-challenge$/);
      const sample = page.locator("#shooting-challenge");
      await expect(
        sample.getByRole("heading", { name: /Pick the days. Take the shots./ }),
      ).toBeVisible();
      await expect
        .poll(async () => {
          const top = await sample.evaluate(
            (e) => e.getBoundingClientRect().top,
          );
          return top >= 60 && top < 110;
        })
        .toBe(true);
      await sample
        .getByRole("button", { name: "14 days", exact: true })
        .click();
      await sample
        .getByRole("button", { name: "Start sample challenge" })
        .click();
      await sample.getByRole("button", { name: "+100", exact: true }).click();
      await sample.getByRole("button", { name: "+50", exact: true }).click();
      await sample
        .getByRole("button", { name: "Save sample shots" })
        .dblclick();
      await expect(sample.getByRole("status")).toHaveText(
        "150 sample shots saved. Shared #2—nice work!",
      );
      const mine = sample
        .getByRole("list", { name: "Sample shooting standings" })
        .getByRole("listitem")
        .filter({ hasText: "Your player" });
      await expect(mine).toContainText("#2");
      await expect(mine).toContainText("150 shots");
      const views = sample.getByRole("group", {
        name: "Shooting challenge perspective",
      });
      await views.getByRole("button", { name: "Coach view" }).click();
      await expect(
        sample.getByText(
          "Your player has 150 sample shots. The team has 500 shots altogether.",
        ),
      ).toBeVisible();
      await views.getByRole("button", { name: "Parent view" }).click();
      await expect(
        sample.getByText(/Your player put in 150 sample shots/),
      ).toBeVisible();
      await sample
        .getByRole("button", { name: "Back to shot logging" })
        .click();
      await sample.getByRole("button", { name: "+100", exact: true }).click();
      await sample.getByRole("button", { name: "Save sample shots" }).click();
      await expect(sample.getByRole("status")).toHaveText(
        "250 sample shots saved. You’re in first place. High-five!",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (process.env.AUDIT_SCREENSHOT_DIR)
        await sample.screenshot({
          path: path.join(
            process.env.AUDIT_SCREENSHOT_DIR,
            `shooting-demo-${width}.png`,
          ),
          style:
            "nav { visibility: hidden; } * { transition: none !important; }",
        });
      await sample
        .getByRole("button", { name: "Create my team’s challenge" })
        .click();
      await expect(
        page.getByRole("heading", { name: "Create your coach account" }),
      ).toBeVisible();
      expect(new URL(page.url()).searchParams.get("redirect")).toBe(
        "/onboarding/coach?shootingDays=14",
      );
      expect(writes).toEqual([]);
      expect(errors).toEqual([]);
    });

    test("daily totals replace rather than accumulate, reject invalid values, and reset cleanly", async ({
      page,
    }) => {
      await page.goto("/demo#shooting-challenge");
      const sample = page.locator("#shooting-challenge");
      await sample
        .getByRole("button", { name: "Start sample challenge" })
        .click();
      const input = sample.getByLabel("Sample daily shot total");
      const save = sample.getByRole("button", { name: "Save sample shots" });
      for (const value of ["-1", "1.5", "10001", ""]) {
        await input.fill(value);
        await expect(save).toBeDisabled();
      }
      await input.fill("10000");
      await save.click();
      await expect(sample.getByRole("status")).toContainText(
        "10,000 sample shots saved.",
      );
      await input.fill("25");
      await save.click();
      await save.click();
      const mine = sample
        .getByRole("listitem")
        .filter({ hasText: "Your player" });
      await expect(mine).toContainText("25 shots");
      await input.fill("0");
      await save.click();
      await expect(mine).toContainText("—");
      await expect(sample.getByRole("status")).toHaveText(
        "Daily total reset to 0 sample shots.",
      );
      await sample
        .getByRole("button", { name: "Reset shooting sample" })
        .click();
      await expect(
        sample.getByRole("button", { name: "7 days", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        sample.getByRole("button", { name: "Start sample challenge" }),
      ).toBeVisible();
      await expect(input).toHaveCount(0);
      await page.reload();
      await expect(
        sample.getByRole("button", { name: "Start sample challenge" }),
      ).toBeVisible();
    });

    test("keyboard controls work and switching auth modes preserves the challenge intent", async ({
      page,
    }) => {
      await page.goto("/demo#shooting-challenge");
      const sample = page.locator("#shooting-challenge");
      const duration = sample.getByRole("button", {
        name: "30 days",
        exact: true,
      });
      await duration.focus();
      await duration.press("Space");
      await expect(duration).toHaveAttribute("aria-pressed", "true");
      await sample
        .getByRole("button", { name: "Start sample challenge" })
        .press("Enter");
      await sample
        .getByRole("button", { name: "+50", exact: true })
        .press("Space");
      await sample
        .getByRole("button", { name: "Save sample shots" })
        .press("Enter");
      await expect(sample.getByRole("status")).toContainText(
        "50 sample shots saved.",
      );
      await sample
        .getByRole("button", { name: "Create my team’s challenge" })
        .click();
      await page
        .getByRole("button", { name: /already have an account/i })
        .click();
      expect(new URL(page.url()).searchParams.get("redirect")).toBe(
        "/onboarding/coach?shootingDays=30",
      );
      await expect(
        page.getByRole("heading", { name: "Welcome back" }),
      ).toBeVisible();
    });
  });
}
