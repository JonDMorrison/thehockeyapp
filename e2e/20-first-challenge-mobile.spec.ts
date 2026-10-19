import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

test.use({
  storageState: { cookies: [], origins: [] },
  viewport: { width: 390, height: 844 },
});
const makeClient = () =>
  createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
async function signup(page: Page, email: string) {
  await page.getByLabel(/^email/i).fill(email);
  await page.getByLabel(/^password/i).fill("hockey");
  await page.locator("#acceptTerms").check();
  const response = page.waitForResponse(
    (r) =>
      r.url().includes("/auth/v1/signup") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Create Account", exact: true })
    .click();
  const result = await response;
  expect(result.ok(), result.ok() ? "" : await result.text()).toBeTruthy();
}
async function screenshot(page: Page, filename: string) {
  if (!process.env.AUDIT_SCREENSHOT_DIR) return;
  fs.mkdirSync(process.env.AUDIT_SCREENSHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(process.env.AUDIT_SCREENSHOT_DIR, filename),
    fullPage: true,
  });
}

test("fresh mobile coach and family go from demo to a shared challenge and saved shots, with recovery", async ({
  page,
  browser,
  browserName,
}) => {
  test.skip(
    process.env.FIRST_CHALLENGE_RELEASE_TEST !== "1",
    "Opt in to creating disposable accounts against the real backend.",
  );
  test.setTimeout(150_000);
  page.setDefaultTimeout(15000);
  const run = Date.now();
  const coachEmail = `challenge-coach-${run}@example.com`;
  const parentEmail = `challenge-parent-${run}@example.com`;
  const fixture: Record<string, string> = { coachEmail, parentEmail };
  const remember = () =>
    fs.writeFileSync(
      process.env.FIRST_CHALLENGE_FIXTURE ||
        "/tmp/first-challenge-fixture.json",
      JSON.stringify(fixture),
    );
  remember();
  await page.route("**/functions/v1/send-transactional-email", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: '{"success":true}',
    }),
  );
  await page.goto("/demo#shooting-challenge");
  const sample = page.locator("#shooting-challenge");
  await sample.getByRole("button", { name: "14 days", exact: true }).click();
  await sample
    .getByRole("button", { name: "Create my team’s challenge" })
    .click();
  await signup(page, coachEmail);
  await expect(page).toHaveURL(/\/onboarding\/coach\?shootingDays=14/, {
    timeout: 20000,
  });
  await expect(
    page.getByRole("heading", { name: "What’s your team called?" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(1);
  let teamRequests = 0;
  page.on("request", (req) => {
    if (req.url().includes("/rpc/create_team_with_owner")) teamRequests++;
  });
  await page.getByRole("button", { name: "Pick challenge dates" }).click();
  await expect(page.locator("#team-name-error")).toBeVisible();
  expect(teamRequests).toBe(0);
  await page
    .getByLabel("Team name", { exact: true })
    .fill(`Disposable First Challenge ${run}`);
  await screenshot(page, "first-challenge-team-phone.png");
  await page.getByRole("button", { name: "Pick challenge dates" }).dblclick();
  await expect(page).toHaveURL(
    /\/teams\/[^/]+\/shooting\/new\?days=14&first=1$/,
  );
  expect(teamRequests).toBe(1);
  fixture.teamId = new URL(page.url()).pathname.split("/")[2];
  remember();
  await expect(
    page.getByRole("button", { name: "14 days", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Skip for now" })).toHaveCount(
    0,
  );
  await page.getByText("Challenge name & time zone", { exact: true }).click();
  await page
    .getByLabel("Challenge name", { exact: true })
    .fill("First Shots Cup");
  await page.getByLabel("Time zone", { exact: true }).selectOption("UTC");
  const today = new Date().toISOString().slice(0, 10);
  await page.getByLabel("Starts", { exact: true }).fill(today);
  await page.getByRole("button", { name: "Custom dates", exact: true }).click();
  await page.getByLabel("Ends", { exact: true }).fill(today);
  await screenshot(page, "first-challenge-dates-phone.png");
  // Lose the response after the server commits, then reload and retry the same request.
  let lost = false;
  const publications: string[] = [];
  await page.route(
    "**/rest/v1/rpc/create_shooting_challenge",
    async (route) => {
      publications.push(route.request().postDataJSON().p_id);
      if (!lost) {
        lost = true;
        const response = await route.fetch();
        expect(response.ok()).toBeTruthy();
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: '{"message":"Connection interrupted. Please retry."}',
        });
      } else await route.continue();
    },
  );
  await page
    .getByRole("button", { name: "Create challenge & invite families" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Challenge not published",
  );
  await page.reload();
  await expect(page.getByLabel("Starts", { exact: true })).toHaveValue(today);
  await expect(page.getByLabel("Ends", { exact: true })).toHaveValue(today);
  // Invitation failures must be recoverable without creating another challenge.
  let inviteFailed = false;
  await page.route("**/rest/v1/team_invites?*", async (route) => {
    if (!inviteFailed && route.request().method() === "GET") {
      inviteFailed = true;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"message":"Invitation connection interrupted"}',
      });
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Create challenge & invite families" })
    .click();
  await expect(page).toHaveURL(/\/shooting\/[0-9a-f-]+\?invite=1$/);
  expect(publications).toHaveLength(2);
  expect(publications[0]).toBe(publications[1]);
  fixture.challengeId = new URL(page.url()).pathname.split("/")[2];
  remember();
  await expect(page.getByRole("alert")).toContainText(
    "Invitation connection interrupted",
  );
  await page.getByRole("button", { name: "Retry invitation" }).click();
  const link = page.getByLabel("Shareable link", { exact: true });
  await expect(link).toHaveValue(/\/join\/.*\?challenge=/);
  const invitation = await link.inputValue();
  await page.reload();
  await expect(link).toHaveValue(invitation);
  if (browserName === "chromium") await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page
    .getByRole("button", { name: "Copy invitation", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Link copied.");
  if (browserName === "chromium") expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(invitation);
  await expect(page.getByTestId("challenge-total")).toHaveText("0");
  await screenshot(page, "first-challenge-invite-phone.png");
  const familyContext = await browser.newContext({
    baseURL: process.env.TEST_BASE_URL || "http://localhost:8080",
    viewport: { width: 390, height: 844 },
    storageState: { cookies: [], origins: [] },
  });
  const family = await familyContext.newPage();
  family.setDefaultTimeout(15000);
  await family.goto(invitation);
  await family.getByRole("button", { name: /join team/i }).click();
  await family.getByRole("button", { name: /don.t have an account/i }).click();
  await signup(family, parentEmail);
  await expect(family).toHaveURL(/\/join\/[^/]+\/player/, { timeout: 20000 });
  await family.getByRole("button", { name: /^Add (?:New )?Player$/i }).click();
  await family.getByLabel(/first name/i).fill("FirstShot");
  await family.locator("#adult-acknowledgement").check();
  await family
    .getByRole("button", { name: "Save Player", exact: true })
    .click();
  await family.getByText("FirstShot", { exact: true }).click();
  await family.getByRole("button", { name: "Join Team", exact: true }).click();
  await expect(family).toHaveURL(
    new RegExp(`/shooting/${fixture.challengeId}\\?player=`),
  );
  fixture.playerId = new URL(family.url()).searchParams.get("player")!;
  remember();
  await family.getByLabel("Daily shot total").fill("125");
  await family
    .getByRole("button", { name: "Save today’s total", exact: true })
    .click();
  await expect(family.getByTestId("challenge-total")).toHaveText("125");
  await screenshot(family, "first-challenge-family-phone.png");
  await family.reload();
  await expect(family.getByLabel("Daily shot total")).toHaveValue("125");
  await page.reload();
  await expect(page.getByTestId(`standing-${fixture.playerId}`)).toContainText(
    "125 shots",
  );
  for (const view of [page, family])
    expect(
      await view.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
  const coach = makeClient();
  expect(
    (
      await coach.auth.signInWithPassword({
        email: coachEmail,
        password: "hockey",
      })
    ).error,
  ).toBeNull();
  const result = await coach
    .from("shooting_challenges")
    .select("id")
    .eq("team_id", fixture.teamId);
  expect(result.error).toBeNull();
  expect(result.data).toHaveLength(1);
  await coach.auth.signOut({ scope: 'local' });
  await familyContext.close();
});
