import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });
for (const width of [390, 1280]) {
  test(`challenge signup goes straight from team name to dates and invitation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const team = "10000000-0000-4000-8000-000000000001";
    const challenge = "10000000-0000-4000-8000-000000000002";
    const user = {
      id: "10000000-0000-4000-8000-000000000003",
      aud: "authenticated",
      role: "authenticated",
      email: "coach@example.com",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      created_at: new Date().toISOString(),
    };
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = [
      Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
        "base64url",
      ),
      Buffer.from(
        JSON.stringify({
          sub: user.id,
          aud: "authenticated",
          role: "authenticated",
          exp,
        }),
      ).toString("base64url"),
      "test-signature",
    ].join(".");
    await page.route("**/auth/v1/**", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          route.request().url().includes("/signup")
            ? {
                access_token: token,
                refresh_token: "test-refresh",
                token_type: "bearer",
                expires_in: 3600,
                expires_at: exp,
                user,
              }
            : user,
        ),
      }),
    );
    let teamName = "";
    let publication: Record<string, string> | undefined;
    let inviteReads = 0;
    let mockPlan: Record<string, unknown> = {};
    let mockDays: Array<
      Record<string, unknown> & { id: string; team_week_plan_tasks: unknown[] }
    > = [];
    await page.route("**/rest/v1/**", async (route) => {
      const url = new URL(route.request().url());
      let data: unknown = [];
      if (url.pathname.endsWith("/rpc/save_team_week_plan")) {
        const payload = route.request().postDataJSON();
        mockPlan = { id: payload.p_id, team_id: payload.p_team_id, name: payload.p_name,
          start_date: payload.p_start_date, tier: payload.p_tier, use_tier_scaling: payload.p_use_tier_scaling,
          status: payload.p_publish ? "published" : "draft" };
        mockDays = payload.p_days.map((day: Record<string, unknown>, index: number) => ({
          ...day, id: `day-${index}`, team_week_plan_tasks: day.tasks,
        }));
        data = { success: true, plan_id: payload.p_id, published: payload.p_publish };
      } else if (url.pathname.endsWith("/rpc/create_team_with_owner")) {
        teamName = route.request().postDataJSON().p_name;
        data = { success: true, team_id: team };
      } else if (url.pathname.endsWith("/teams"))
        data = { id: team, name: teamName, palette_id: "brand" };
      else if (url.pathname.endsWith("/team_week_plans")) {
        if (route.request().method() !== "GET")
          mockPlan = {
            tier: "rep",
            use_tier_scaling: true,
            ...mockPlan,
            ...route.request().postDataJSON(),
          };
        data = mockPlan;
      } else if (url.pathname.endsWith("/team_week_plan_days")) {
        if (route.request().method() === "DELETE") mockDays = [];
        else if (route.request().method() === "POST") {
          const day = {
            ...route.request().postDataJSON(),
            id: `mock-day-${mockDays.length}`,
            team_week_plan_tasks: [],
          };
          mockDays.push(day);
          data = day;
        } else data = mockDays;
      } else if (url.pathname.endsWith("/team_week_plan_tasks")) {
        const tasks = route.request().postDataJSON() || [];
        for (const task of tasks)
          mockDays
            .find((d) => d.id === task.team_week_plan_day_id)
            ?.team_week_plan_tasks.push(task);
        data = [];
      } else if (url.pathname.endsWith("/team_roles"))
        data = [
          { id: "role", team_id: team, user_id: user.id, role: "head_coach" },
        ];
      else if (url.pathname.endsWith("/rpc/create_capped_shooting_challenge")) {
        publication = route.request().postDataJSON();
        data = challenge;
      } else if (url.pathname.endsWith("/rpc/get_shooting_challenge"))
        data = {
          challenge: {
            id: challenge,
            team_id: team,
            name: publication?.p_name,
            start_date: publication?.p_start,
            end_date: publication?.p_end,
            timezone: publication?.p_timezone,
          },
          team_name: teamName,
          today: publication?.p_start,
          server_now: new Date().toISOString(),
          status: "Live",
          players: [],
          days: [],
          audit: [],
          is_staff: true,
          corrected: false,
        };
      else if (url.pathname.endsWith("/team_invites")) {
        inviteReads++;
        if (inviteReads === 1)
          return route.fulfill({
            status: 503,
            contentType: "application/json",
            body: '{"message":"Invite temporarily unavailable"}',
          });
        data = { token: "family-test-invite" };
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    });
    await page.goto("/demo#shooting-challenge");
    const sample = page.locator("#shooting-challenge");
    await sample.getByRole("button", { name: "30 days", exact: true }).click();
    await sample
      .getByRole("button", { name: "Create my team’s challenge" })
      .click();
    await page.getByLabel(/^email/i).fill(user.email);
    await page.getByLabel(/^password/i).fill("hockey");
    await page.locator("#acceptTerms").check();
    await page
      .getByRole("button", { name: "Create Account", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "What’s your team called?" }),
    ).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveCount(1);
    await page.getByLabel("Team name", { exact: true }).fill("Ice Wolves");
    await page.getByRole("button", { name: "Pick challenge dates" }).click();
    await expect(page).toHaveURL(
      new RegExp(`/teams/${team}/shooting/new\\?days=30&first=1$`),
    );
    await expect(
      page.getByRole("button", { name: "30 days", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByLabel("Challenge name", { exact: true }),
    ).not.toBeVisible();
    await expect(page.getByLabel("Daily leaderboard cap")).toHaveValue("300");
    if (width === 390) await page.getByLabel("Daily leaderboard cap").fill("150");
    await page
      .getByRole("button", { name: "Create challenge & invite families" })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "Invite temporarily unavailable",
    );
    await page.getByRole("button", { name: "Retry invitation" }).click();
    await expect(
      page.getByLabel("Shareable link", { exact: true }),
    ).toHaveValue(
      new RegExp(`/join/family-test-invite\\?challenge=${challenge}$`),
    );
    await expect(
      page.getByRole("button", { name: "Copy invitation", exact: true }),
    ).toBeVisible();
    expect(teamName).toBe("Ice Wolves");
    expect(publication!.p_daily_cap).toBe(width === 390 ? 150 : 300);
    expect(
      (Date.parse(publication!.p_end) - Date.parse(publication!.p_start)) /
        86400000,
    ).toBe(29);
    await page.goto("/onboarding/coach");
    await page.getByLabel(/team name/i).fill("Program Wolves");
    await page.getByRole("button", { name: "Create team & continue" }).click();
    await expect(
      page.getByText("What would help your team this week?", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create family invite", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Start a program", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Start a shooting challenge",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /template/i })).toHaveCount(
      0,
    );
    await expect(
      page.getByText("Let’s get Program Wolves started", { exact: true }),
    ).toBeVisible();
    if (process.env.AUDIT_SCREENSHOT_DIR)
      await page.screenshot({
        path: `${process.env.AUDIT_SCREENSHOT_DIR}/training-choice-${width}.png`,
        fullPage: true,
        style: "* { animation: none !important; transition: none !important; }",
      });
    await page
      .getByRole("button", {
        name: "I’ll set up training later",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", { name: "Create family invite", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /shooting challenge|challenge dates|Start a program/i,
      }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    const programCard = page.getByRole("button", {
      name: "Start a program",
      exact: true,
    });
    await programCard.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(
      new RegExp(`/teams/${team}/builder/new\\?inviteAfter=1$`),
    );
    await expect(
      page.getByRole("heading", {
        name: "A good week starts with a plan",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Balanced Week", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Your week at a glance", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Customize this plan", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Customize this plan", exact: true })
      .click();
    await expect(page.getByLabel("Program name", { exact: true })).toHaveValue(
      "Balanced Week",
    );
    await expect(
      page.getByRole("button", {
        name: "Publish & invite families",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Edit Monday", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Activity 1", { exact: true })
      .fill("A focused first activity");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Save Day", exact: true })
      .click();
    await expect(page.getByText(/A focused first activity/)).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  });
}
