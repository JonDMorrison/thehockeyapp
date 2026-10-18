import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

test.use({ viewport: { width: 390, height: 844 } });
test("general mobile coach publishes a program before the family invitation opens", async ({
  page,
}) => {
  test.skip(
    process.env.PROGRAM_INVITE_RELEASE_TEST !== "1" ||
      !process.env.TEST_USER_EMAIL,
    "Explicit opt-in and a dedicated test account required.",
  );
  test.setTimeout(120000);
  page.setDefaultTimeout(15000);
  await page.goto("/onboarding/coach");
  await page
    .getByLabel(/team name/i)
    .fill(`Disposable Program First ${Date.now()}`);
  await page
    .getByRole("button", { name: "Create team & continue", exact: true })
    .click();
  await expect(
    page.getByText("What would help your team this week?", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create family invite", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Start a program/ }).click();
  await expect(page).toHaveURL(/\/teams\/[^/]+\/builder\/new\?inviteAfter=1/);
  const teamId = new URL(page.url()).pathname.split("/")[2];
  fs.writeFileSync(
    "/tmp/program-first-fixture.json",
    JSON.stringify({ teamId }),
  );
  await page.getByRole("button", { name: /Balanced Week/ }).click();
  await page
    .getByRole("button", { name: "Save Week Plan", exact: true })
    .click();
  await expect(page).toHaveURL(/\/builder\/[0-9a-f-]+\?inviteAfter=1$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  let failed = false;
  await page.route("**/rest/v1/practice_tasks*", async (route) => {
    if (route.request().method() === "POST" && !failed) {
      failed = true;
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"message":"Simulated publication interruption"}',
      });
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Publish", exact: true })
    .click();
  await expect(
    page.getByText("Simulated publication interruption", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/builder\/[0-9a-f-]+\?inviteAfter=1$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Publish", exact: true })
    .click();
  const invitation = page.getByRole("dialog");
  await expect(invitation).toBeVisible({ timeout: 20000 });
  await expect(invitation.getByRole("heading", { name: "Your team’s first week is ready", exact: true })).toBeVisible();
  const bounds = await invitation.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  const generate = invitation.getByRole("button", {
    name: "Generate Link",
    exact: true,
  });
  const link = invitation.getByLabel("Family invitation link", { exact: true });
  await expect(generate.or(link)).toBeVisible();
  if (await generate.isVisible()) await generate.click();
  await expect(link).toHaveValue(/\/join\//);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await invitation
    .getByRole("button", { name: "Copy invitation link", exact: true })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    await link.inputValue(),
  );
  await expect(
    invitation.getByRole("button", {
      name: /shooting challenge|challenge dates/i,
    }),
  ).toHaveCount(0);
  if (process.env.AUDIT_SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.AUDIT_SCREENSHOT_DIR}/program-first-invite-phone.png`,
      fullPage: true,
    });
  const client = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  expect(
    (
      await client.auth.signInWithPassword({
        email: process.env.TEST_USER_EMAIL!,
        password: process.env.TEST_USER_PASSWORD!,
      })
    ).error,
  ).toBeNull();
  const plans = await client
    .from("team_week_plans")
    .select("status")
    .eq("team_id", teamId);
  expect(plans.error).toBeNull();
  expect(plans.data).toEqual([{ status: "published" }]);
  const cards = await client
    .from("practice_cards")
    .select("id,published_at")
    .eq("team_id", teamId);
  expect(cards.error).toBeNull();
  expect(cards.data!.length).toBeGreaterThan(0);
  expect(cards.data!.every((card) => !!card.published_at)).toBeTruthy();
  await client.auth.signOut();
});
