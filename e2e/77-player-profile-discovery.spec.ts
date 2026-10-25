import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
test.use({
  storageState: { cookies: [], origins: [] },
  viewport: { width: 390, height: 844 },
  actionTimeout: 15000,
});
test("family discovers profile and photo upload, edits survive replacement, and coach opens the updated player card", async ({
  page,
}) => {
  test.skip(
    process.env.PROFILE_RELEASE_TEST !== "1",
    "Uses disposable real family and coach accounts.",
  );
  test.setTimeout(180000);
  const keys = JSON.parse(
    fs.readFileSync(process.env.ROLE_FIXTURE_KEY_FILE!, "utf8"),
  );
  const admin = createClient(
    process.env.VITE_SUPABASE_URL!,
    keys.find((k: any) => k.name === "service_role").api_key,
    { auth: { persistSession: false } },
  );
  const actors: any[] = [];
  let team: string | undefined, child: string | undefined;
  const file = `/tmp/profile-discovery-${process.pid}.private.json`;
  const remember = () =>
    fs.writeFileSync(
      file,
      JSON.stringify({ users: actors.map((a) => a.id), team, child }),
      { mode: 0o600 },
    );
  const ok = (r: any) => {
    expect(r.error).toBeNull();
    return r.data;
  };
  async function login(actor: any, redirect: string) {
    await page.evaluate(() => localStorage.clear());
    await page.goto(
      `/auth?mode=signin&redirect=${encodeURIComponent(redirect)}`,
    );
    await page.getByLabel(/^email/i).fill(actor.email);
    await page.getByLabel(/^password/i).fill(actor.password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
  }
  const upload = async (label: string, input: any = "public/favicon.png") => {
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: label, exact: true }).click();
    await (await chooser).setFiles(input);
  };
  try {
    for (const role of ["coach", "parent"]) {
      const email = `qa-profile-${role}-${randomUUID()}@example.com`,
        password = `Qa-${randomUUID()}`;
      const user = ok(
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        }),
      ).user;
      const client = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false } },
      );
      actors.push({ id: user.id, email, password, client });
      remember();
      ok(await client.auth.signInWithPassword({ email, password }));
    }
    const [coach, parent] = actors;
    team = ok(
      await coach.client.rpc("create_team_with_owner", {
        p_name: "Profile QA Hawks",
      }),
    ).team_id;
    remember();
    child = ok(
      await parent.client.rpc("create_managed_player", {
        p_first_name: "Portrait QA",
        p_birth_year: 2016,
      }),
    ).player_id;
    remember();
    const token = randomUUID().replaceAll("-", "");
    ok(
      await coach.client.from("team_invites").insert({
        team_id: team,
        token,
        created_by_user_id: coach.id,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      }),
    );
    ok(
      await parent.client.rpc("join_team_with_invite", {
        invite_token: token,
        p_player_id: child,
      }),
    );
    await page.addInitScript(
      (id) => localStorage.setItem(`first_run_dismissed_${id}`, "true"),
      child,
    );
    await page.goto("/auth");
    await login(parent, `/players/${child}/home`);
    const prompt = page.getByRole("region", {
      name: "Complete your player profile",
      exact: true,
    });
    await expect(prompt).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath("family-profile-prompt.png"),
      fullPage: true,
    });
    let profileReadFails = true;
    await page.route("**/rest/v1/players?**", (r) =>
      profileReadFails && r.request().method() === "GET"
        ? r.fulfill({
            status: 503,
            json: { message: "Controlled profile read failure" },
          })
        : r.continue(),
    );
    await prompt
      .getByRole("link", { name: "Add player photo", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Couldn’t load this player profile",
        exact: true,
      }),
    ).toBeVisible();
    profileReadFails = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Add player photo", exact: true }),
    ).toBeInViewport();
    await upload("Add player photo", {
      name: "wrong.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not an image"),
    });
    await expect(page.getByRole("alert")).toContainText("Choose a JPG");
    await upload("Add player photo");
    await expect(
      page.getByText(
        "Player photo saved. Your coaches can see it on your player card.",
        { exact: true },
      ),
    ).toBeVisible();
    const firstReference = ok(
      await parent.client
        .from("players")
        .select("profile_photo_url")
        .eq("id", child)
        .single(),
    ).profile_photo_url;
    await expect(
      page.getByRole("img", { name: "Portrait QA", exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page
          .getByRole("img", { name: "Portrait QA", exact: true })
          .evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    let failUpload = true;
    await page.route("**/storage/v1/object/player-photos/**", (r) =>
      failUpload && r.request().method() === "POST"
        ? r.fulfill({
            status: 503,
            json: {
              error: "Controlled upload failure",
              message: "Controlled upload failure",
            },
          })
        : r.continue(),
    );
    await upload("Change player photo");
    await expect(page.getByRole("alert")).toContainText("Photo not saved");
    expect(
      ok(
        await parent.client
          .from("players")
          .select("profile_photo_url")
          .eq("id", child)
          .single(),
      ).profile_photo_url,
    ).toBe(firstReference);
    failUpload = false;
    await page.goto(`/players/${child}/home`);
    await prompt
      .getByRole("link", { name: "Complete player profile", exact: true })
      .click();
    await expect(page.locator("#first_name")).toHaveValue("Portrait QA");
    await page.locator("#fav_nhl_player").fill("Quinn Hughes");
    await page.locator("#hockey_love").fill("Playing with my teammates");
    await page.locator("#season_goals").fill("Build a confident wrist shot");
    await page.locator("#position").click();
    await page.getByRole("option", { name: "Forward", exact: true }).click();
    await upload("Change player photo");
    await expect(
      page.getByText(
        "Player photo saved. Your coaches can see it on your player card.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.locator("#fav_nhl_player")).toHaveValue("Quinn Hughes");
    const secondReference = ok(
      await parent.client
        .from("players")
        .select("profile_photo_url")
        .eq("id", child)
        .single(),
    ).profile_photo_url;
    expect(secondReference).not.toBe(firstReference);
    await page
      .getByRole("button", { name: "Save", exact: true })
      .last()
      .click();
    await expect(
      page.getByRole("button", { name: "Edit player details", exact: true }),
    ).toBeVisible();
    await page.goto(`/players/${child}/home`);
    await expect(
      page.getByRole("heading", { name: "Let’s go, Portrait QA." }),
    ).toBeVisible();
    await expect(prompt).toHaveCount(0);
    await expect(
      page.getByRole("link", {
        name: "Change Portrait QA’s player photo",
        exact: true,
      }),
    ).toBeVisible();
    await login(coach, `/teams/${team}/roster`);
    const card = page.getByRole("article").filter({ hasText: "Portrait QA" });
    await expect(card).toContainText("View player profile");
    await expect
      .poll(() =>
        card
          .getByRole("img", { name: "Portrait QA", exact: true })
          .evaluate((img: HTMLImageElement) => img.naturalWidth),
      )
      .toBeGreaterThan(0);
    await card
      .getByRole("link", {
        name: "View Portrait QA's player profile",
        exact: true,
      })
      .click();
    await expect(page.getByText("Quinn Hughes", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Build a confident wrist shot", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Change player photo", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath("coach-player-profile.png"),
      fullPage: true,
    });
    await page.goto(`/players/${child}/home`);
    await expect(
      page.getByRole("heading", { name: "Let’s go, Portrait QA." }),
    ).toBeVisible();
    await expect(prompt).toHaveCount(0);
  } finally {
    await page.close();
    if (child) {
      const files = ok(await admin.storage.from("player-photos").list(child));
      if (files.length)
        ok(
          await admin.storage
            .from("player-photos")
            .remove(files.map((f: any) => `${child}/${f.name}`)),
        );
    }
    if (team) ok(await admin.from("teams").delete().eq("id", team));
    if (child) ok(await admin.from("players").delete().eq("id", child));
    for (const actor of actors) {
      await actor.client.auth.signOut({ scope: "global" });
      ok(await admin.auth.admin.deleteUser(actor.id));
    }
    fs.rmSync(file, { force: true });
  }
});
