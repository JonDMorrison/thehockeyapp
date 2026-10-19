import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import fs from "node:fs";

test.use({
  storageState: { cookies: [], origins: [] },
  timezoneId: "America/Vancouver",
});
test("coach adds a child, recovers a team-add failure, switches roles immediately and sees scoped roster progress", async ({
  page,
}, info) => {
  test.skip(
    process.env.ROSTER_RELEASE_TEST !== "1",
    "Uses disposable real coach/family records.",
  );
  test.setTimeout(180000);
  page.setDefaultTimeout(15000);
  await page.setViewportSize({
    width: info.project.name === "webkit" ? 320 : 390,
    height: 844,
  });
  const key = JSON.parse(
    fs.readFileSync(process.env.ROLE_FIXTURE_KEY_FILE!, "utf8"),
  ).find((k: { name: string }) => k.name === "service_role").api_key;
  const admin = createClient(process.env.VITE_SUPABASE_URL!, key, {
    auth: { persistSession: false },
  });
  const client = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const ok = (r: any) => {
    expect(r.error).toBeNull();
    return r.data;
  };
  const email = `qa-roster-switch-${randomUUID()}@example.com`,
    password = `QA-${randomUUID()}`;
  let uid = "",
    playerId = "";
  const teams: string[] = [],
    cards: string[] = [];
  const remember = () =>
    fs.writeFileSync(
      `/tmp/roster-switch-${process.pid}.private.json`,
      JSON.stringify({ uid, playerId, teams, cards }),
      { mode: 0o600 },
    );
  try {
    uid = ok(
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      }),
    ).user.id;
    remember();
    ok(await client.auth.signInWithPassword({ email, password }));
    for (const name of ["Family Switch QA Hawks", "Other QA Team"]) {
      teams.push(
        ok(
          await client.rpc("create_team_with_owner", {
            p_name: name,
            p_age_division: "U13",
            p_level: "rep",
          }),
        ).team_id,
      );
      remember();
    }
    const team = teams[0];
    console.info("Fixture ready; opening coach roster");
    await page.goto(
      `/auth?mode=signin&redirect=${encodeURIComponent(`/teams/${team}/roster`)}`,
    );
    await page.getByLabel(/^email/i).fill(email);
    await page.getByLabel(/^password/i).fill(password);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Add Player", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Switch workspace or role" })
      .click();
    await expect(page.getByRole("menuitem", { name: /Grace QA/ })).toHaveCount(
      0,
    );
    await page.keyboard.press("Escape");
    console.info("Opening add-player dialog");
    await page.getByRole("button", { name: "Add Player", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("#childFirstName").fill("Grace QA");
    await dialog.locator("#childAdultAcknowledgement").check();
    let creates = 0,
      fail = true;
    await page.route("**/rest/v1/rpc/create_managed_player", (r) => {
      creates++;
      return r.continue();
    });
    await page.route("**/rest/v1/rpc/add_my_player_to_team", (r) =>
      fail
        ? r.fulfill({
            status: 503,
            json: { message: "Controlled membership failure" },
          })
        : r.continue(),
    );
    console.info("Creating managed child through coach dialog");
    await dialog
      .getByRole("button", { name: "Create & Add Player", exact: true })
      .click();
    await expect(
      page.getByText("Controlled membership failure", { exact: true }),
    ).toBeVisible();
    const saved = ok(
      await client
        .from("players")
        .select("id")
        .eq("owner_user_id", uid)
        .eq("first_name", "Grace QA"),
    );
    expect(saved).toHaveLength(1);
    playerId = saved[0].id;
    remember();
    fail = false;
    await dialog
      .getByRole("button", { name: "Add to Team", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    expect(creates).toBe(1);
    await page
      .getByRole("button", { name: "Switch workspace or role" })
      .click();
    console.info("Switching immediately to newly created child");
    await page.getByRole("menuitem", { name: /Grace QA/ }).click();
    await expect(page).toHaveURL(new RegExp(`/players/${playerId}/home$`));
    await page
      .getByRole("button", { name: "Close welcome", exact: true })
      .click();
    expect(
      await page.evaluate(() => localStorage.getItem("hockey-app-active-view")),
    ).toBe("parent");
    await page.goto("/today");
    await expect(page).toHaveURL(new RegExp(`/players/${playerId}/home$`));
    await page.reload();
    await page
      .getByRole("button", { name: "Player options", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Player Settings", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Notifications", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Notifications", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: info.outputPath("family-mobile-header.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Switch workspace or role" })
      .click();
    await page
      .getByRole("menuitem", { name: /Family Switch QA Hawks/ })
      .click();
    await expect(page).toHaveURL(new RegExp(`/teams/${team}$`));
    console.info("Checking real scoped roster activity");
    ok(
      await client.rpc("add_my_player_to_team", {
        p_team_id: teams[1],
        p_player_id: playerId,
      }),
    );
    const now = new Date(),
      date = (d: Date) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Vancouver",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d);
    for (const [teamId, completedAt] of [
      [team, now],
      [team, new Date(now.getTime() - 7 * 86400000)],
      [teams[1], now],
    ] as const) {
      const card = randomUUID();
      cards.push(card);
      remember();
      ok(
        await admin.from("practice_cards").insert({
          id: card,
          team_id: teamId,
          date: date(completedAt),
          mode: "normal",
          tier: "rep",
          title: "Scoped roster QA",
          created_by_user_id: uid,
          published_at: completedAt.toISOString(),
          program_source: "team",
        }),
      );
      ok(
        await admin.from("session_completions").insert({
          player_id: playerId,
          practice_card_id: card,
          status: "complete",
          completed_by: "parent",
          completed_at: completedAt.toISOString(),
          program_source: "team",
        }),
      );
    }
    ok(
      await client
        .from("players")
        .update({ jersey_number: "12", shoots: "left", position: "forward" })
        .eq("id", playerId),
    );
    await page.goto(`/teams/${team}/roster`);
    const card = page.getByRole("article").filter({
      has: page.getByRole("link", { name: /Grace QA's player profile/ }),
    });
    await expect(card).toContainText("1 workout this week");
    await expect(card).toContainText("#12");
    await page.screenshot({
      path: info.outputPath("real-roster-mobile.png"),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Add Player", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Switch to Grace QA’s dashboard",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`/players/${playerId}/home$`));
    expect(
      ok(
        await client
          .from("players")
          .select("id")
          .eq("owner_user_id", uid)
          .eq("first_name", "Grace QA"),
      ),
    ).toHaveLength(1);
  } finally {
    if (!playerId && uid) {
      const r = await admin
        .from("players")
        .select("id")
        .eq("owner_user_id", uid);
      playerId = r.data?.[0]?.id || "";
    }
    if (playerId)
      ok(
        await admin
          .from("session_completions")
          .delete()
          .eq("player_id", playerId),
      );
    if (cards.length)
      ok(await admin.from("practice_cards").delete().in("id", cards));
    for (const id of teams) ok(await admin.from("teams").delete().eq("id", id));
    if (uid) {
      ok(await admin.from("players").delete().eq("owner_user_id", uid));
      await client.auth.signOut({ scope: "global" });
      ok(await admin.auth.admin.deleteUser(uid));
    }
    fs.unlinkSync(`/tmp/roster-switch-${process.pid}.private.json`);
  }
});
