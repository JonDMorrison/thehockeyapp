import { expect, test, type Page, type BrowserContext } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

test.use({ storageState: { cookies: [], origins: [] } });
let accounts: Record<"coach" | "parent", { email: string; password: string }>;
let coach: SupabaseClient, parent: SupabaseClient;
let teamId: string,
  challengeId: string,
  playerId: string,
  siblingId: string,
  inviteToken: string;
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const shotName = `ShotPlayer${Date.now().toString().slice(-6)}`;
const fixtureFile =
  process.env.SHOOTING_FIXTURE_FILE || "/tmp/hockey-shooting-fixture.json";
const screenshotDir = process.env.AUDIT_SCREENSHOT_DIR;
const baseURL = process.env.TEST_BASE_URL || "http://localhost:8080";
async function login(
  page: Page,
  role: "coach" | "parent",
  redirect = "/onboarding/coach",
) {
  await page.goto(`/auth?redirect=${encodeURIComponent(redirect)}`);
  await page.getByLabel(/email/i).fill(accounts[role].email);
  await page.getByLabel(/^password/i).fill(accounts[role].password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page).not.toHaveURL(/\/auth/);
}
async function api(client: SupabaseClient, name: string, args: object) {
  const result = await client.rpc(name, args);
  expect(result.error, `${name}: ${JSON.stringify(result.error)}`).toBeNull();
  return result.data;
}
async function capture(page: Page, name: string) {
  if (screenshotDir) {
    fs.mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({
      path: path.join(screenshotDir, name),
      fullPage: true,
    });
  }
}

test.describe
  .serial("shooting challenge release gates against the real backend", () => {
  test.beforeAll(async () => {
    test.skip(
      process.env.SHOOTING_RELEASE_TEST !== "1",
      "Explicit opt-in and separate fictional test accounts required.",
    );
    accounts = JSON.parse(
      fs.readFileSync(
        process.env.SHOOTING_ACCOUNTS_FILE ||
          "/tmp/hockey-shooting-accounts.json",
        "utf8",
      ),
    );
    const make = () =>
      createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false } },
      );
    coach = make();
    parent = make();
    expect(
      (await coach.auth.signInWithPassword(accounts.coach)).error,
    ).toBeNull();
    expect(
      (await parent.auth.signInWithPassword(accounts.parent)).error,
    ).toBeNull();
  });

  test("new coach publishes a one-day custom challenge before inviting a family", async ({
    page,
    browser,
  }) => {
    test.setTimeout(90000);
    await page.route("**/functions/v1/send-transactional-email", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      }),
    );
    await login(page, "coach");
    await page
      .getByLabel(/team name/i)
      .fill(`Disposable Shooting Release ${Date.now()}`);
    await page.getByRole("button", { name: "Create team & continue" }).click();
    await page.getByRole("button", { name: "Start a shooting challenge", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Start a shooting challenge" }),
    ).toBeVisible();
    teamId = page.url().match(/teams\/([^/]+)/)![1];
    await page.getByText("Challenge name & time zone", { exact: true }).click();
    await page.getByLabel("Challenge name").fill("Release Shooting Challenge");
    await page.getByLabel("Time zone").selectOption("UTC");
    await page.getByLabel("Starts", { exact: true }).fill(today);
    await page.getByRole("button", { name: "Custom dates" }).click();
    await page.getByLabel("Ends", { exact: true }).fill(today);
    await capture(page, "shooting-coach-publish.png");
    await page.getByRole("button", { name: "Create challenge & invite families" }).click();
    await expect(page).toHaveURL(/\/shooting\/[0-9a-f-]+\?invite=1$/);
    challengeId = new URL(page.url()).pathname.split("/shooting/")[1];
    await expect(page.getByRole("heading", { name: /your challenge is ready/i })).toBeVisible();
    await expect(page.getByLabel("Shareable link")).toHaveValue(/\/join\//);
    const invite = await page.getByLabel("Shareable link").inputValue();
    expect(invite).toContain(`?challenge=${challengeId}`);
    inviteToken = new URL(invite).pathname.split("/").at(-1)!;
    // Parent follows the real invitation, authenticates, creates a child, and joins.
    const context = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
      viewport: { width: 390, height: 844 },
    });
    const family = await context.newPage();
    await family.goto(invite);
    await family.getByRole("button", { name: /join team/i }).click();
    await family.getByLabel(/email/i).fill(accounts.parent.email);
    await family.getByLabel(/^password/i).fill(accounts.parent.password);
    await family.getByRole("button", { name: "Sign In", exact: true }).click();
    await family
      .getByRole("button", { name: /^Add (?:New )?Player$/i })
      .click();
    await family.getByLabel(/first name/i).fill(shotName);
    await family.locator("#adult-acknowledgement").check();
    await family
      .getByRole("button", { name: "Save Player", exact: true })
      .click();
    await family.getByText(shotName, { exact: true }).click();
    await family
      .getByRole("button", { name: "Join Team", exact: true })
      .click();
    // Default team invitation includes optional player profile setup. Its skip must preserve the challenge.
    await expect(family).toHaveURL(/team-onboarding|\/shooting\//);
    if (family.url().includes("team-onboarding"))
      await family.getByRole("button", { name: /skip/i }).click();
    await expect(family).toHaveURL(
      new RegExp(`/shooting/${challengeId}\\?player=`),
    );
    playerId = new URL(family.url()).searchParams.get("player")!;
    await expect(family.getByLabel("Daily shot total")).toHaveValue("0");
    await family.getByRole("button", { name: "+100", exact: true }).click();
    await family.getByRole("button", { name: "+50", exact: true }).click();
    await family
      .getByRole("button", { name: "Save today’s total", exact: true })
      .dblclick();
    await expect(
      family.getByText("150 shots saved for today.", { exact: true }),
    ).toBeVisible();
    await family.reload();
    await expect(family.getByLabel("Daily shot total")).toHaveValue("150");
    await expect(family.getByTestId("challenge-total")).toHaveText("150");
    await capture(family, "shooting-parent-phone.png");
    await page.reload();
    await expect(page.getByTestId(`standing-${playerId}`)).toContainText(
      "150 shots",
    );
    await expect(page.getByTestId("challenge-total")).toHaveText("150");
    await capture(page, "shooting-coach-results.png");
    const sibling = await api(parent, "create_managed_player", {
      p_first_name: "ShotSibling",
      p_birth_year: 2015,
      p_photo_sharing_allowed: false,
      p_ai_personalization_allowed: false,
    });
    siblingId = sibling.player_id;
    await api(parent, "join_team_with_invite", {
      invite_token: inviteToken,
      p_player_id: siblingId,
    });
    fs.writeFileSync(
      fixtureFile,
      JSON.stringify({
        teamId,
        challengeId,
        playerId,
        siblingId,
        inviteToken,
        today,
      }),
    );
    await context.close();
  });

  test("parent can log on Today without a workout and switch siblings safely", async ({
    page,
  }) => {
    await login(page, "parent", `/players/${playerId}/today`);
    await expect(page.getByLabel("Daily shot total")).toHaveValue("150");
    await page.getByRole("button", { name: "+25", exact: true }).click();
    await page
      .getByRole("button", { name: "Save today’s total", exact: true })
      .click();
    await expect(
      page.getByText("175 shots saved for today.", { exact: true }),
    ).toBeVisible();
    await page.goto(`/shooting/${challengeId}?player=${playerId}`);
    await page.getByLabel("Logging for").selectOption(siblingId);
    await expect(page.getByLabel("Daily shot total")).toHaveValue("0");
    await page.getByLabel("Daily shot total").fill("175");
    await page
      .getByRole("button", { name: "Save today’s total", exact: true })
      .click();
    await expect(
      page.getByText("175 shots saved for today.", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Logging for").selectOption(playerId);
    await expect(page.getByLabel("Daily shot total")).toHaveValue("175");
    const snapshot = await api(parent, "get_shooting_challenge", {
      p_id: challengeId,
    });
    expect(snapshot.players.map((p: { rank: number }) => p.rank)).toEqual([
      1, 1,
    ]);
    expect(snapshot.days).toHaveLength(2);
  });

  test("offline and server failures retain input and never claim success", async ({
    page,
    context,
  }) => {
    await login(page, "parent", `/shooting/${challengeId}?player=${playerId}`);
    await expect(page.getByLabel("Daily shot total")).toHaveValue("175");
    await page.getByLabel("Daily shot total").fill("200");
    await context.setOffline(true);
    try {
      await page
        .getByRole("button", { name: "Save today’s total", exact: true })
        .click();
      await expect(page.getByText(/Not saved—retry/)).toBeVisible();
      await expect(page.getByLabel("Daily shot total")).toHaveValue("200");
    } finally {
      await context.setOffline(false);
    }
    await page.route("**/rest/v1/rpc/save_shooting_challenge_day", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Temporary test outage" }),
      }),
    );
    await page.getByRole("button", { name: "Retry save", exact: true }).click();
    await expect(page.getByText(/Temporary test outage/)).toBeVisible();
    await expect(
      page.getByText("200 shots saved for today.", { exact: true }),
    ).toHaveCount(0);
    await page.unroute("**/rest/v1/rpc/save_shooting_challenge_day");
    await page.reload();
    await expect(page.getByLabel("Daily shot total")).toHaveValue("200");
    await page
      .getByRole("button", { name: "Save today’s total", exact: true })
      .click();
    await expect(
      page.getByText("200 shots saved for today.", { exact: true }),
    ).toBeVisible();
  });

  test("lost response can be retried without double counting", async ({
    page,
  }) => {
    await login(page, "parent", `/shooting/${challengeId}?player=${playerId}`);
    await expect(page.getByLabel("Daily shot total")).toHaveValue("200");
    await page.getByLabel("Daily shot total").fill("225");
    let lost = false;
    await page.route(
      "**/rest/v1/rpc/save_shooting_challenge_day",
      async (route) => {
        await route.fetch();
        lost = true;
        await route.abort("failed");
      },
    );
    await page
      .getByRole("button", { name: "Save today’s total", exact: true })
      .click();
    await expect(page.getByText(/Not saved—retry/)).toBeVisible();
    expect(lost).toBe(true);
    await page.unroute("**/rest/v1/rpc/save_shooting_challenge_day");
    await page.getByRole("button", { name: "Retry save", exact: true }).click();
    await expect(
      page.getByText("225 shots saved for today.", { exact: true }),
    ).toBeVisible();
    const snapshot = await api(coach, "get_shooting_challenge", {
      p_id: challengeId,
    });
    expect(
      snapshot.players.find(
        (p: { player_id: string }) => p.player_id === playerId,
      ).total,
    ).toBe(225);
    expect(
      snapshot.audit.filter((a: { shots: number }) => a.shots === 225),
    ).toHaveLength(1);
  });

  test("two devices require explicit review before replacing a newer total", async ({
    page,
    browser,
  }) => {
    await login(page, "parent", `/shooting/${challengeId}?player=${playerId}`);
    await expect(page.getByLabel("Daily shot total")).toHaveValue("225");
    const context = await browser.newContext({
      baseURL,
      storageState: await page.context().storageState(),
    });
    const other = await context.newPage();
    await other.goto(`/shooting/${challengeId}?player=${playerId}`);
    await expect(other.getByLabel("Daily shot total")).toHaveValue("225");
    await other.getByLabel("Daily shot total").fill("300");
    await page.getByLabel("Daily shot total").fill("250");
    await page
      .getByRole("button", { name: "Save today’s total", exact: true })
      .click();
    await expect(
      page.getByText("250 shots saved for today.", { exact: true }),
    ).toBeVisible();
    await other
      .getByRole("button", { name: "Save today’s total", exact: true })
      .click();
    await expect(
      other.getByText(
        "Another device saved 250 shots. Review before replacing that total.",
      ),
    ).toBeVisible();
    await other.getByRole("button", { name: /Keep my 300/ }).click();
    await other
      .getByRole("button", { name: "Save today’s total", exact: true })
      .click();
    await expect(
      other.getByText("300 shots saved for today.", { exact: true }),
    ).toBeVisible();
    await context.close();
  });

  test("server permissions, invalid counts, scheduled dates and corrections are enforced", async () => {
    const anonymous = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    expect(
      (await anonymous.rpc("get_shooting_challenge", { p_id: challengeId }))
        .error,
    ).toBeTruthy();
    expect(
      (
        await parent.rpc("create_shooting_challenge", {
          p_id: randomUUID(),
          p_team: teamId,
          p_name: "Forbidden",
          p_start: today,
          p_end: today,
          p_timezone: "UTC",
        })
      ).error,
    ).toBeTruthy();
    expect(
      (
        await parent
          .from("shooting_challenge_days")
          .update({ shots: 999 })
          .eq("challenge_id", challengeId)
      ).error,
    ).toBeTruthy();
    const snapshot = await api(parent, "get_shooting_challenge", {
      p_id: challengeId,
    });
    const version = snapshot.days.find(
      (d: { player_id: string }) => d.player_id === playerId,
    ).version;
    for (const shots of [-1, 1.5, 10001])
      expect(
        (
          await parent.rpc("save_shooting_challenge_day", {
            p_id: challengeId,
            p_player: playerId,
            p_date: today,
            p_shots: shots,
            p_version: version,
            p_request: randomUUID(),
          })
        ).error,
        String(shots),
      ).toBeTruthy();
    const before = await api(coach, "get_shooting_challenge", {
      p_id: challengeId,
    });
    expect(
      (
        await coach.rpc("save_shooting_challenge_day", {
          p_id: challengeId,
          p_player: playerId,
          p_date: today,
          p_shots: 325,
          p_version: version,
          p_request: randomUUID(),
        })
      ).error,
    ).toBeTruthy();
    await api(coach, "save_shooting_challenge_day", {
      p_id: challengeId,
      p_player: playerId,
      p_date: today,
      p_shots: 325,
      p_version: version,
      p_request: randomUUID(),
      p_reason: "Confirmed 25 missing shots with parent",
    });
    const after = await api(coach, "get_shooting_challenge", {
      p_id: challengeId,
    });
    expect(after.corrected).toBe(true);
    expect(after.audit.length).toBe(before.audit.length + 1);
    expect(after.audit[0].previous_shots).toBe(300);
    expect(after.audit[0].shots).toBe(325);
    expect(snapshot.audit).toEqual([]);
    const otherTeam = await api(parent, "create_team_with_owner", {
      p_name: "Disposable Other Shooting Team",
    });
    await api(parent, "add_my_player_to_team", {
      p_team_id: otherTeam.team_id,
      p_player_id: playerId,
    });
    const otherChallenge = await api(parent, "create_shooting_challenge", {
      p_id: randomUUID(),
      p_team: otherTeam.team_id,
      p_name: "Separate team race",
      p_start: today,
      p_end: today,
      p_timezone: "UTC",
    });
    await api(parent, "save_shooting_challenge_day", {
      p_id: otherChallenge,
      p_player: playerId,
      p_date: today,
      p_shots: 1000,
      p_version: 0,
      p_request: randomUUID(),
    });
    expect(
      (
        await api(parent, "get_shooting_challenge", { p_id: challengeId })
      ).players.find((p: { player_id: string }) => p.player_id === playerId)
        .total,
    ).toBe(325);
    expect(
      (await coach.rpc("get_shooting_challenge", { p_id: otherChallenge }))
        .error,
    ).toBeTruthy();
    expect(
      (
        await parent
          .from("shooting_challenge_days")
          .select("*")
          .eq("challenge_id", challengeId)
      ).error,
    ).toBeTruthy();
    const future = new Date(`${today}T12:00:00Z`);
    future.setUTCDate(future.getUTCDate() + 1);
    const futureDate = future.toISOString().slice(0, 10);
    const scheduledId = await api(coach, "create_shooting_challenge", {
      p_id: randomUUID(),
      p_team: teamId,
      p_name: "Scheduled Release Challenge",
      p_start: futureDate,
      p_end: futureDate,
      p_timezone: "UTC",
    });
    expect(
      (
        await parent.rpc("save_shooting_challenge_day", {
          p_id: scheduledId,
          p_player: playerId,
          p_date: futureDate,
          p_shots: 100,
          p_version: 0,
          p_request: randomUUID(),
        })
      ).error,
    ).toBeTruthy();
  });

  test("a full roster includes zero-shot players without changing the saved totals", async () => {
    for (let n = 0; n < 18; n++) {
      const extra = await api(coach, "create_managed_player", {
        p_first_name: `RosterShot${n + 1}`,
        p_birth_year: 2015,
        p_photo_sharing_allowed: false,
        p_ai_personalization_allowed: false,
      });
      await api(coach, "add_my_player_to_team", {
        p_team_id: teamId,
        p_player_id: extra.player_id,
      });
    }
    const snapshot = await api(parent, "get_shooting_challenge", {
      p_id: challengeId,
    });
    expect(snapshot.players).toHaveLength(20);
    expect(
      snapshot.players.filter(
        (p: { total: number; rank: number | null }) =>
          p.total === 0 && p.rank === null,
      ),
    ).toHaveLength(18);
    expect(
      snapshot.players.reduce(
        (sum: number, p: { total: number }) => sum + p.total,
        0,
      ),
    ).toBe(500);
  });

  for (const width of [390, 1280])
    test(`coach and parent controls fit ${width}px and display corrections`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await login(
        page,
        "parent",
        `/shooting/${challengeId}?player=${playerId}`,
      );
      await expect(
        page.getByText("Results include coach corrections."),
      ).toBeVisible();
      await expect(page.getByLabel("Daily shot total")).toHaveValue("325");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await capture(page, `shooting-parent-${width}.png`);
      await page.goto("/auth");
      // Use a separate empty session for the coach rather than changing the family session.
      const context: BrowserContext = await page
        .context()
        .browser()!
        .newContext({
          baseURL,
          viewport: { width, height: 844 },
          storageState: { cookies: [], origins: [] },
        });
      const staff = await context.newPage();
      await login(staff, "coach", `/shooting/${challengeId}`);
      await staff
        .getByLabel("Reason for correction")
        .fill("Reviewed with the parent");
      await expect(
        staff.getByRole("button", { name: "Save correction" }),
      ).toBeEnabled();
      expect(
        await staff.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await capture(staff, `shooting-coach-${width}.png`);
      await context.close();
    });
});
