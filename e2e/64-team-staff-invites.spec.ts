import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import fs from "node:fs";

test.use({
  storageState: { cookies: [], origins: [] },
  viewport: { width: 390, height: 844 },
  timezoneId: "UTC",
});
test("staff invitations: email retry, shared link signup, dashboard access, single use, revocation and removal", async ({
  page,
  browser,
  baseURL,
}) => {
  test.skip(
    process.env.STAFF_INVITE_RELEASE_TEST !== "1",
    "Private disposable fixture test.",
  );
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  const key = JSON.parse(
    fs.readFileSync(process.env.FAMILY_HOME_SERVICE_FILE!, "utf8"),
  ).find((k: any) => k.name === "service_role").api_key;
  const url = process.env.VITE_SUPABASE_URL!,
    pub = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
    admin = createClient(url, key, { auth: { persistSession: false } }),
    actors: any[] = [],
    contexts: any[] = [];
  let team: string | undefined;
  const file = `/tmp/hockey-staff-${test.info().project.name}.private.json`,
    remember = () =>
      fs.writeFileSync(
        file,
        JSON.stringify({
          users: actors.map((a) => a.id).filter(Boolean),
          teams: team ? [team] : [],
          players: [],
        }),
        { mode: 0o600 },
      );
  const ok = (r: any) => {
    expect(r.error).toBeNull();
    return r.data;
  };
  const login = async (p: any, actor: any, redirect: string) => {
    await p.goto(`/auth?mode=signin&redirect=${encodeURIComponent(redirect)}`);
    await p.getByLabel(/^email/i).fill(actor.email);
    await p.getByLabel(/^password/i).fill(actor.password);
    await p.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(p).not.toHaveURL(/\/auth\?/);
  };
  const fresh = async () => {
    const c = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
      viewport: { width: 320, height: 760 },
    });
    contexts.push(c);
    const p = await c.newPage();
    p.setDefaultTimeout(15000);
    return p;
  };
  try {
    for (const role of ["coach", "email", "outsider", "contender"]) {
      const email = `qa-staff-home-${role}-${randomUUID()}@example.com`,
        password = `Qa-${randomUUID()}`;
      const u = ok(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      );
      const client = createClient(url, pub, {
        auth: { persistSession: false },
      });
      actors.push({ email, password, id: u.user.id, client });
      remember();
      ok(await client.auth.signInWithPassword({ email, password }));
    }
    const [coach, staff, outsider, contender] = actors;
    team = ok(
      await coach.client.rpc("create_team_with_owner", {
        p_name: "Disposable Staff Hawks",
        p_age_division: "U13",
        p_level: "rep",
      }),
    ).team_id;
    remember();
    const denied = await outsider.client.rpc("create_team_staff_invite", {
      p_id: randomUUID(),
      p_team_id: team,
    });
    expect(denied.error).toBeTruthy();
    expect(
      (await outsider.client.rpc("list_team_staff", { p_team_id: team })).error,
    ).toBeTruthy();
    expect(
      (
        await outsider.client.from("team_roles").insert({
          team_id: team,
          user_id: outsider.id,
          role: "assistant_coach",
        })
      ).error,
    ).toBeTruthy();
    await login(page, coach, `/teams/${team}`);
    await expect(
      page.getByRole("heading", {
        name: "Disposable Staff Hawks",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Invite team staff", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Invite team staff" }),
    ).toBeVisible();
    expect(
      await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
    ).toBe(true);
    await dialog.getByLabel("Their email address").fill(staff.email);
    let fail = true,
      sendCount = 0;
    await page.route("**/functions/v1/send-transactional-email", (r) => {
      const body = r.request().postDataJSON();
      expect(body.type).toBe("staff_invitation");
      expect(body.to).toBe(staff.email);
      expect(body.data.teamId).toBe(team);
      sendCount++;
      return r.fulfill({
        status: fail ? 503 : 200,
        json: fail
          ? { error: "Controlled email outage" }
          : { success: true, id: "mock-staff-delivery" },
      });
    });
    await dialog
      .getByRole("button", { name: "Send invitation", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText(
      "Controlled email outage",
    );
    await expect(
      dialog.getByText("Invitation emailed", { exact: true }),
    ).toHaveCount(0);
    const emailedLink = await dialog
      .getByLabel("Staff invitation link")
      .inputValue();
    const emailToken = emailedLink.split("/").at(-1)!;
    fail = false;
    await dialog
      .getByRole("button", { name: "Retry email", exact: true })
      .click();
    await expect(
      dialog.getByText("Invitation emailed", { exact: true }),
    ).toBeVisible();
    expect(sendCount).toBe(2);
    const saved = ok(
      await coach.client
        .from("team_adult_invites")
        .select("id")
        .eq("team_id", team),
    );
    expect(saved).toHaveLength(1);
    const wrong = ok(
      await outsider.client.rpc("redeem_team_adult_invite", {
        invite_token: emailToken,
      }),
    );
    expect(wrong.success).toBe(false);
    const member = await fresh();
    await member.goto(emailedLink);
    await member
      .getByRole("button", { name: /sign in or create account/i })
      .click();
    await member.getByLabel(/^email/i).fill(staff.email);
    await member.getByLabel(/^password/i).fill(staff.password);
    await member.getByRole("button", { name: "Sign In", exact: true }).click();
    await member
      .getByRole("button", { name: "Join coaching workspace", exact: true })
      .click();
    await expect(member).toHaveURL(new RegExp(`/teams/${team}$`));
    await expect(
      member.getByRole("heading", {
        name: "Disposable Staff Hawks",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      ok(
        await staff.client
          .from("team_roles")
          .select("role")
          .eq("team_id", team)
          .eq("user_id", staff.id),
      ),
    ).toEqual([{ role: "assistant_coach" }]);
    const replay = ok(
      await staff.client.rpc("redeem_team_adult_invite", {
        invite_token: emailToken,
      }),
    );
    expect(replay.success).toBe(true);
    const staffChallenge = randomUUID();
    ok(
      await staff.client.rpc("create_shooting_challenge", {
        p_id: staffChallenge,
        p_team: team,
        p_name: "Shared staff challenge",
        p_start: new Date().toISOString().slice(0, 10),
        p_end: new Date().toISOString().slice(0, 10),
        p_timezone: "UTC",
      }),
    );
    await member.reload();
    await expect(
      member.getByText("Shared staff challenge", { exact: true }),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Invite another person" }).click();
    await dialog
      .getByRole("button", { name: "Share a link", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Create staff link", exact: true })
      .click();
    const shared = await dialog
      .getByLabel("Staff invitation link")
      .inputValue();
    const sharedToken = shared.split("/").at(-1)!;
    await dialog.screenshot({
      path: `/tmp/hockey-staff-invite-${test.info().project.name}.png`,
    });
    const linkActor = {
      email: `qa-staff-signup-${randomUUID()}@example.com`,
      password: `Qa-${randomUUID()}`,
      id: null,
    };
    actors.push(linkActor);
    remember();
    const joining = await fresh();
    await joining.route("**/rest/v1/rpc/preview_team_adult_invite", (r) =>
      r.fulfill({
        status: 503,
        json: { message: "Controlled invite read outage" },
      }),
    );
    await joining.goto(shared);
    await expect(
      joining.getByText("Couldn’t load invitation", { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await joining.unroute("**/rest/v1/rpc/preview_team_adult_invite");
    await joining
      .getByRole("button", { name: "Retry invitation", exact: true })
      .click();
    await joining
      .getByRole("button", { name: /sign in or create account/i })
      .click();
    await joining
      .getByRole("button", { name: /create.*account|sign up/i })
      .last()
      .click();
    await joining.getByLabel(/^email/i).fill(linkActor.email);
    await joining.getByLabel(/^password/i).fill(linkActor.password);
    await joining.locator("#acceptTerms").check();
    await joining
      .getByRole("button", { name: "Create Account", exact: true })
      .click();
    await expect(
      joining.getByRole("button", {
        name: "Join coaching workspace",
        exact: true,
      }),
    ).toBeVisible();
    const users = ok(
      await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ).users;
    linkActor.id = users.find((u: any) => u.email === linkActor.email)!.id;
    remember();
    await joining
      .getByRole("button", { name: "Join coaching workspace", exact: true })
      .click();
    await expect(joining).toHaveURL(new RegExp(`/teams/${team}$`));
    await expect(
      joining.getByRole("heading", {
        name: "Disposable Staff Hawks",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await joining.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    expect(
      ok(
        await outsider.client.rpc("redeem_team_adult_invite", {
          invite_token: sharedToken,
        }),
      ).success,
    ).toBe(false);
    await joining.screenshot({
      path: `/tmp/hockey-staff-joined-${test.info().project.name}.png`,
      fullPage: true,
    });
    await dialog.getByRole("button", { name: "Invite another person" }).click();
    await dialog
      .getByRole("button", { name: "Create staff link", exact: true })
      .click();
    const revoked = (
      await dialog.getByLabel("Staff invitation link").inputValue()
    )
      .split("/")
      .at(-1)!;
    ok(
      await coach.client
        .from("team_adult_invites")
        .update({ status: "revoked" })
        .eq("token", revoked),
    );
    expect(
      ok(
        await outsider.client.rpc("redeem_team_adult_invite", {
          invite_token: revoked,
        }),
      ).success,
    ).toBe(false);
    const expiredId = randomUUID(),
      expired = ok(
        await coach.client.rpc("create_team_staff_invite", {
          p_id: expiredId,
          p_team_id: team,
        }),
      );
    ok(
      await admin
        .from("team_adult_invites")
        .update({ expires_at: "2000-01-01T00:00:00Z" })
        .eq("id", expiredId),
    );
    expect(
      ok(
        await outsider.client.rpc("redeem_team_adult_invite", {
          invite_token: expired.token,
        }),
      ).success,
    ).toBe(false);
    const stableId = randomUUID(),
      stable1 = ok(
        await coach.client.rpc("create_team_staff_invite", {
          p_id: stableId,
          p_team_id: team,
        }),
      ),
      stable2 = ok(
        await coach.client.rpc("create_team_staff_invite", {
          p_id: stableId,
          p_team_id: team,
        }),
      );
    expect(stable2.token).toBe(stable1.token);
    const concurrent = ok(
      await coach.client.rpc("create_team_staff_invite", {
        p_id: randomUUID(),
        p_team_id: team,
      }),
    );
    const races = await Promise.all([
      contender.client.rpc("redeem_team_adult_invite", {
        invite_token: concurrent.token,
      }),
      outsider.client.rpc("redeem_team_adult_invite", {
        invite_token: concurrent.token,
      }),
    ]);
    expect(races.every((r) => !r.error)).toBe(true);
    expect(
      races.filter((r) => r.data.success && !r.data.already_member),
    ).toHaveLength(1);
    await dialog
      .getByRole("button", {
        name: "Manage staff and invitations",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/teams/${team}/settings#team-staff$`),
    );
    const staffRow = page
      .getByText(staff.email, { exact: true })
      .locator("..")
      .locator("..");
    await staffRow
      .getByRole("button", { name: "Remove team staff member", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /remove/i })
      .click();
    await expect
      .poll(async () =>
        ok(
          await coach.client
            .from("team_roles")
            .select("id")
            .eq("team_id", team)
            .eq("user_id", staff.id),
        ),
      )
      .toEqual([]);
    expect(
      ok(await staff.client.from("teams").select("id").eq("id", team)),
    ).toEqual([]);
    expect(
      ok(
        await staff.client.rpc("redeem_team_adult_invite", {
          invite_token: emailToken,
        }),
      ).success,
    ).toBe(false);
    await member.reload();
    await expect(
      member.getByRole("heading", {
        name: "Disposable Staff Hawks",
        exact: true,
      }),
    ).toHaveCount(0);
    await page.screenshot({
      path: `/tmp/hockey-staff-management-${test.info().project.name}.png`,
      fullPage: true,
    });
  } finally {
    for (const c of contexts) await c.close();
    if (team) {
      ok(await admin.from("shooting_challenges").delete().eq("team_id", team));
      ok(await admin.from("teams").delete().eq("id", team));
    }
    const all = ok(
      await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ).users;
    for (const actor of actors) {
      const id = actor.id ?? all.find((u: any) => u.email === actor.email)?.id;
      if (id) ok(await admin.auth.admin.deleteUser(id));
    }
    fs.rmSync(file, { force: true });
  }
});
