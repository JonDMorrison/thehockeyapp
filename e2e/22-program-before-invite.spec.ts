import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

test.use({ viewport: { width: 390, height: 844 } });
test("general mobile coach publishes a program before the family invitation opens", async ({
  page,
  browser,
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
  await expect(
    page.getByRole("heading", {
      name: "A good week starts with a plan",
      exact: true,
    }),
  ).toBeVisible();
  if (process.env.AUDIT_SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.AUDIT_SCREENSHOT_DIR}/program-choose-phone.png`,
      fullPage: true,
    });
  await page.getByRole("button", { name: /Balanced Week/ }).click();
  const startInput = page.getByLabel("Starts", { exact: true });
  const chosenStart = new Date(`${await startInput.inputValue()}T12:00:00Z`);
  chosenStart.setUTCDate(chosenStart.getUTCDate() + 7);
  const chosenStartDate = chosenStart.toISOString().slice(0, 10);
  await startInput.fill(chosenStartDate);
  await page.reload();
  await expect(startInput).toHaveValue(chosenStartDate);
  await expect(
    page.getByRole("heading", { name: "Your week at a glance", exact: true }),
  ).toBeVisible();
  if (process.env.AUDIT_SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.AUDIT_SCREENSHOT_DIR}/program-preview-phone.png`,
      fullPage: true,
    });
  let failedDraft = false;
  await page.route("**/rest/v1/team_week_plan_tasks*", async (route) => {
    if (route.request().method() === "POST" && !failedDraft) {
      failedDraft = true;
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"message":"Simulated draft interruption"}',
      });
    }
    await route.continue();
  });
  await page
    .getByRole("button", { name: "Customize this plan", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Your plan couldn’t be saved",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Customize this plan", exact: true })
    .click();
  await expect(page).toHaveURL(/\/builder\/[0-9a-f-]+\?inviteAfter=1$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByLabel("Program name", { exact: true })
    .fill("Wolves first week");
  await page.getByRole("button", { name: "Edit Monday", exact: true }).click();
  const dayEditor = page.getByRole("dialog");
  await dayEditor
    .getByLabel("Day Title (optional)", { exact: true })
    .fill("Quick hands Monday");
  await dayEditor.getByLabel("Activity 1", { exact: true }).fill("");
  await dayEditor.getByRole("button", { name: "Save Day", exact: true }).click();
  await expect(dayEditor.getByRole("alert")).toContainText("Give each activity a name");
  await dayEditor.getByLabel("Activity 1", { exact: true }).fill("Focused wrist shots");
  await dayEditor
    .getByRole("button", { name: "Save Day", exact: true })
    .click();
  await expect(
    page.getByText("Quick hands Monday", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("Week plan saved as draft", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Program name", { exact: true })).toHaveValue(
    "Wolves first week",
  );
  await expect(
    page.getByText("Quick hands Monday", { exact: true }),
  ).toBeVisible();
  if (process.env.AUDIT_SCREENSHOT_DIR)
    await page.screenshot({
      path: `${process.env.AUDIT_SCREENSHOT_DIR}/program-customize-phone.png`,
      fullPage: true,
    });
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
  await page
    .getByRole("button", { name: "Publish & invite families", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Publish", exact: true })
    .click();
  await expect(
    page.getByText("Simulated publication interruption", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/builder\/[0-9a-f-]+\?inviteAfter=1$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Publish & invite families", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Publish", exact: true })
    .click();
  const invitation = page.getByRole("dialog");
  await expect(invitation).toBeVisible({ timeout: 20000 });
  await expect(
    invitation.getByRole("heading", {
      name: "Your team’s first week is ready",
      exact: true,
    }),
  ).toBeVisible();
  const bounds = await invitation.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  const link = invitation.getByLabel("Family invitation link", { exact: true });
  await expect(link).toBeVisible({ timeout: 15000 });
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
    .select("status,name,start_date")
    .eq("team_id", teamId);
  expect(plans.error).toBeNull();
  expect(plans.data![0].start_date).toBe(chosenStartDate);
  expect(plans.data).toEqual([
    expect.objectContaining({ status: "published", name: "Wolves first week" }),
  ]);
  const cards = await client
    .from("practice_cards")
    .select("id,published_at")
    .eq("team_id", teamId);
  expect(cards.error).toBeNull();
  expect(cards.data!.length).toBeGreaterThan(0);
  expect(cards.data!.every((card) => !!card.published_at)).toBeTruthy();
  const familyEmail = `program-family-${Date.now()}@example.com`;
  const fixture: Record<string, string> = { teamId, familyEmail };
  const remember = () =>
    fs.writeFileSync(
      "/tmp/program-first-fixture.json",
      JSON.stringify(fixture),
    );
  remember();
  const context = await browser.newContext({
    baseURL: process.env.TEST_BASE_URL || "http://localhost:8080",
    viewport: { width: 390, height: 844 },
    storageState: { cookies: [], origins: [] },
  });
  const family = await context.newPage();
  family.setDefaultTimeout(15000);
  await family.goto(await link.inputValue());
  await family.getByRole("button", { name: /join team/i }).click();
  await family.getByRole("button", { name: /don.t have an account/i }).click();
  await family.getByLabel(/^email/i).fill(familyEmail);
  await family.getByLabel(/^password/i).fill("hockey");
  await family.locator("#acceptTerms").check();
  await family
    .getByRole("button", { name: "Create Account", exact: true })
    .click();
  await expect(family).toHaveURL(/\/join\/[^/]+\/player/, { timeout: 20000 });
  await family.getByRole("button", { name: /^Add (?:New )?Player$/i }).click();
  await family.getByLabel(/first name/i).fill("ProgramKid");
  await family.locator("#adult-acknowledgement").check();
  await family
    .getByRole("button", { name: "Save Player", exact: true })
    .click();
  await family.getByText("ProgramKid", { exact: true }).click();
  await family.getByRole("button", { name: "Join Team", exact: true }).click();
  await expect
    .poll(
      async () =>
        family.url().includes("team-onboarding") ||
        (await family
          .getByRole("button", { name: "View Dashboard", exact: true })
          .isVisible()),
    )
    .toBe(true);
  if (family.url().includes("team-onboarding"))
    await family
      .getByRole("button", { name: "Skip for now", exact: true })
      .click();
  else
    await family
      .getByRole("button", { name: "View Dashboard", exact: true })
      .click();
  await expect(family).toHaveURL(/\/players\/[^/]+\/home/);
  fixture.playerId = new URL(family.url()).pathname.split("/")[2];
  remember();
  const welcome = family.getByRole("dialog");
  await expect(welcome).toBeVisible();
  await welcome
    .getByRole("button", { name: "Close welcome", exact: true })
    .click();
  await family.getByRole("link", { name: "Week", exact: true }).click();
  const currentMonday = await family.evaluate(() => {
    const day = new Date();
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  });
  const weekOffset = Math.round(
    (Date.parse(plans.data![0].start_date) - Date.parse(currentMonday)) /
      604800000,
  );
  for (let week = 0; week < weekOffset; week++)
    await family
      .getByRole("button", { name: "Next week", exact: true })
      .click();
  await expect(
    family.getByText("Quick hands Monday", { exact: true }),
  ).toBeVisible();
  if (process.env.AUDIT_SCREENSHOT_DIR)
    await family.screenshot({
      path: `${process.env.AUDIT_SCREENSHOT_DIR}/program-family-week-phone.png`,
      fullPage: true,
    });
  expect(
    await family.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await context.close();
  await client.auth.signOut();
});
