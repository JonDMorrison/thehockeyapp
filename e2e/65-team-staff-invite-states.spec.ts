import { test, expect } from "@playwright/test";
test("staff invitation fits 320px with a long team name and retries creation without a new request", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  const team = "11111111-1111-4111-8111-111111111111",
    name = "H".repeat(100);
  for (const table of ["training_programs", "practice_cards"])
    await page.route(`**/rest/v1/${table}?*`, (r) => r.fulfill({ json: [] }));
  await page.route("**/rest/v1/rpc/get_team_dashboard_snapshot", (r) =>
    r.fulfill({
      json: {
        success: true,
        team: { id: team, name, palette_id: "brand" },
        onboarding: { completed: true, checklist: [] },
        today: {
          date: "2026-10-19",
          mode: "normal",
          game_day: { enabled: false },
          practice_card: { exists: false, published: false },
        },
        pulse: {
          players_count: 0,
          active_today_count: 0,
          sessions_complete_today: 0,
          total_shots_today: 0,
        },
        upcoming: [],
      },
    }),
  );
  const requests: any[] = [];
  let fail = true;
  await page.route("**/rest/v1/rpc/create_team_staff_invite", (r) => {
    requests.push(r.request().postDataJSON());
    return r.fulfill({
      status: fail ? 503 : 200,
      json: fail
        ? { message: "Controlled creation failure" }
        : {
            id: "saved-invite",
            token: "saved-staff-token",
            expires_at: "2026-11-02T17:00:00Z",
            invitation_kind: "email",
          },
    });
  });
  let sent = 0;
  await page.route("**/functions/v1/send-transactional-email", (r) => {
    sent++;
    expect(r.request().postDataJSON().data.inviteId).toBe("saved-invite");
    return r.fulfill({ json: { success: true, id: "mock-delivery" } });
  });
  await page.goto(`/teams/${team}`);
  await page
    .getByRole("button", { name: "Invite team staff", exact: true })
    .click();
  const d = page.getByRole("dialog");
  expect(await d.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(
    true,
  );
  await d.getByLabel("Their email address").fill("colleague@example.com");
  await d.getByRole("button", { name: "Send invitation", exact: true }).click();
  await expect(d.getByRole("alert")).toContainText(
    "Controlled creation failure",
  );
  expect(sent).toBe(0);
  fail = false;
  await d.getByRole("button", { name: "Send invitation", exact: true }).click();
  await expect(
    d.getByText("Invitation emailed", { exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(2);
  expect(requests[1].p_id).toBe(requests[0].p_id);
  expect(sent).toBe(1);
  await expect(d.getByLabel("Staff invitation link")).toHaveValue(
    /\/team\/adult\/join\/saved-staff-token$/,
  );
  expect(await d.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(
    true,
  );
});
