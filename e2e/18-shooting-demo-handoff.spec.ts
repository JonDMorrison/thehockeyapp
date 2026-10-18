import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

test.use({ storageState: { cookies: [], origins: [] } });
test("sample choice survives coach sign-in, team setup, and real publication without importing sample totals", async ({
  page,
}) => {
  test.skip(
    process.env.PUBLIC_SHOOTING_RELEASE_TEST !== "1" ||
      !process.env.TEST_USER_EMAIL,
    "Explicit opt-in and a dedicated test account required.",
  );
  await page.route("**/functions/v1/send-transactional-email", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    }),
  );
  await page.goto("/demo#shooting-challenge");
  const sample = page.locator("#shooting-challenge");
  await sample.getByRole("button", { name: "14 days", exact: true }).click();
  await sample.getByRole("button", { name: "Start sample challenge" }).click();
  await sample.getByRole("button", { name: "+100", exact: true }).click();
  await sample.getByRole("button", { name: "Save sample shots" }).click();
  await expect(sample.getByRole("status")).toContainText(
    "100 sample shots saved.",
  );
  await sample
    .getByRole("button", { name: "Create my team’s challenge" })
    .click();
  await page.getByRole("button", { name: /already have an account/i }).click();
  await page.getByLabel(/email/i).fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel(/^password/i).fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding\/coach\?shootingDays=14/);
  await page
    .getByLabel(/team name/i)
    .fill(`Disposable Public Shooting Demo ${Date.now()}`);
  await page.getByRole("button", { name: "Pick challenge dates" }).click();
  await expect(page).toHaveURL(
    /\/teams\/[^/]+\/shooting\/new\?days=14&first=1$/,
  );
  await expect(
    page.getByRole("button", { name: "14 days", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const teamId = new URL(page.url()).pathname.split("/")[2];
  fs.writeFileSync(
    process.env.PUBLIC_SHOOTING_FIXTURE || "/tmp/public-shooting-fixture.json",
    JSON.stringify({ teamId }),
  );
  await page
    .getByRole("button", { name: "Create challenge & invite families" })
    .click();
  await expect(page).toHaveURL(/\/shooting\/[0-9a-f-]+\?invite=1$/);
  await expect(page.getByTestId("challenge-total")).toHaveText("0");
  await expect(
    page.getByRole("heading", { name: /Your challenge is ready/ }),
  ).toBeVisible();
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
  const id = new URL(page.url()).pathname.split("/").at(-1)!;
  const { data, error } = await client.rpc("get_shooting_challenge", {
    p_id: id,
  });
  expect(error).toBeNull();
  expect(data.players).toEqual([]);
  expect(data.days).toEqual([]);
  const span =
    (Date.parse(`${data.challenge.end_date}T12:00:00Z`) -
      Date.parse(`${data.challenge.start_date}T12:00:00Z`)) /
    86400000;
  expect(span).toBe(13);
});
