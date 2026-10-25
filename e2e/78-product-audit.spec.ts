import { test, expect, type Page } from "@playwright/test";
const uid = "10000000-0000-4000-8000-000000000001",
  pid = "20000000-0000-4000-8000-000000000001";
test.use({
  storageState: { cookies: [], origins: [] },
  viewport: { width: 390, height: 844 },
});
async function session(page: Page) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const user = {
    id: uid,
    aud: "authenticated",
    role: "authenticated",
    email: "fixture@example.com",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const access_token = [
    Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
    Buffer.from(
      JSON.stringify({
        sub: uid,
        aud: "authenticated",
        role: "authenticated",
        exp,
      }),
    ).toString("base64url"),
    "fixture",
  ].join(".");
  await page.addInitScript(
    ({ user, access_token, exp }) => {
      localStorage.setItem(
        "sb-public-journey-test-auth-token",
        JSON.stringify({
          user,
          access_token,
          expires_at: exp,
          expires_in: 3600,
          refresh_token: "fixture",
          token_type: "bearer",
        }),
      );
    },
    { user, access_token, exp },
  );
  await page.route("**/rest/v1/task_completions?*", (r) =>
    r.fulfill({ json: [] }),
  );
  await page.route("**/auth/v1/**", (r) => r.fulfill({ json: user }));
}
test("profile reminder dismisses permanently per player, including when opened", async ({
  page,
}) => {
  await session(page);
  await page.goto("/e2e/fixtures/product-audit.html?case=prompt");
  await expect(
    page.getByRole("region", { name: "Complete your player profile" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dismiss profile reminder" }).click();
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Complete your player profile" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Switch sibling" }).click();
  await expect(page.getByText("Let the team meet Blair")).toBeVisible();
  await page
    .getByRole("link", { name: "Complete player profile", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Complete your player profile" }),
  ).toHaveCount(0);
});
test("coach switcher offers only real workspaces and preserves recovery", async ({
  page,
}) => {
  await session(page);
  let outage = false;
  await page.route("**/rest/v1/**", (r) => {
    const path = new URL(r.request().url()).pathname;
    if (outage)
      return r.fulfill({ status: 503, json: { message: "Controlled outage" } });
    return r.fulfill({
      json: path.endsWith("team_roles")
        ? [
            {
              team_id: "team",
              role: "head_coach",
              teams: { id: "team", name: "Hawks" },
            },
          ]
        : [],
    });
  });
  await page.goto("/e2e/fixtures/product-audit.html?case=switcher");
  await page.getByRole("button", { name: "Switch workspace" }).click();
  await expect(
    page.getByRole("menuitem", { name: /association/i }),
  ).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: /Hawks/ })).toBeVisible();
  outage = true;
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Retry workspaces" }),
  ).toBeVisible();
  outage = false;
  await page.getByRole("button", { name: "Retry workspaces" }).click();
  await expect(
    page.getByRole("button", { name: "Switch workspace" }),
  ).toBeVisible();
});
test("photo framing saves a real 512px JPEG, keeps original, can be readjusted and cancelled", async ({
  page,
}) => {
  await session(page);
  let player: any = {
    id: pid,
    profile_photo_url: null,
    profile_photo_original_url: null,
    profile_photo_frame: null,
  };
  const uploads = new Map<string, Buffer>();
  let patches = 0;
  await page.route("**/rest/v1/players?*", (r) => {
    if (r.request().method() === "PATCH") {
      player = { ...player, ...r.request().postDataJSON() };
      patches++;
      return r.fulfill({ json: { id: pid } });
    }
    return r.fulfill({ json: player });
  });
  await page.route("**/storage/v1/**", async (r) => {
    const path = new URL(r.request().url()).pathname;
    const name = path.split("/").slice(5).join("/");
    if (path.includes("/object/sign/"))
      return r.fulfill({
        json: { signedURL: `/object/sign/player-photos/${name}?token=fixture` },
      });
    if (
      path.includes("/object/player-photos/") &&
      r.request().method() === "POST"
    ) {
      const raw = r.request().postDataBuffer()!;
      const start = raw.indexOf(Buffer.from([255, 216]));
      const end = raw.lastIndexOf(Buffer.from([255, 217])) + 2;
      uploads.set(name, raw.subarray(start, end));
      return r.fulfill({ json: { Key: name } });
    }
    if (path.includes("/object/sign/"))
      return r.fulfill({ body: uploads.get(name)!, contentType: "image/jpeg" });
    return r.fulfill({ json: [] });
  });
  // Signed URL responses and media GET share a path, so handle GET first.
  await page.route("**/storage/v1/object/sign/player-photos/**", (r) => {
    const path = new URL(r.request().url()).pathname;
    const name = path.split("/").slice(6).join("/");
    return r.request().method() === "GET"
      ? r.fulfill({ body: uploads.get(name)!, contentType: "image/jpeg" })
      : r.fulfill({
          json: {
            signedURL: `/object/sign/player-photos/${name}?token=fixture`,
          },
        });
  });
  await page.goto("/e2e/fixtures/product-audit.html?case=photo");
  await page.getByRole("button", { name: "Edit player photo" }).click();
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 400;
    c.height = 800;
    const g = c.getContext("2d")!;
    g.fillStyle = "white";
    g.fillRect(0, 0, 400, 800);
    g.fillStyle = "blue";
    g.fillRect(80, 80, 160, 160);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Player photo file").setInputFiles({
    name: "portrait.png",
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  });
  await expect(page.getByLabel("Zoom", { exact: true })).toBeVisible();
  await page.getByLabel("Zoom", { exact: true }).fill("2");
  await page.getByLabel("Vertical position").fill("0.1");
  await page.getByRole("button", { name: "Save photo", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(patches).toBe(1);
  expect(player.profile_photo_frame.zoom).toBe(2);
  expect(uploads.size).toBe(2);
  const crop = [...uploads.entries()].find(([k]) =>
    k.endsWith("-avatar.jpg"),
  )![1];
  expect([...crop.subarray(0, 2)]).toEqual([255, 216]);
  const size = await page.evaluate(async (encoded) => {
    const image = new Image();
    image.src = "data:image/jpeg;base64," + encoded;
    await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  }, crop.toString("base64"));
  expect(size).toEqual([512, 512]);
  await page.getByRole("button", { name: "Edit player photo" }).click();
  await expect(page.getByLabel("Zoom", { exact: true })).toHaveValue("2");
  await page.getByLabel("Zoom", { exact: true }).fill("1.5");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(patches).toBe(1);
  await page.getByRole("button", { name: "Edit player photo" }).click();
  await page.getByRole("button", { name: "Save photo", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(uploads.size).toBe(3); // Original was retained.
});
test("offline challenge save survives reload and replays once without changing date", async ({
  page,
  context,
}) => {
  await session(page);
  let saves = 0;
  await page.route("**/rest/v1/rpc/save_shooting_challenge_day", (r) => {
    saves++;
    const body = r.request().postDataJSON();
    expect(body.p_date).toBe("2026-10-25");
    expect(body.p_shots).toBe(450);
    return r.fulfill({ json: { shots: 450, version: 1 } });
  });
  await page.goto("/e2e/fixtures/product-audit.html?case=entry");
  await page.getByLabel("Daily shot total").fill("450");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Save today’s total" }).click();
  await expect(
    page.getByText(/Waiting to sync. Saved on this device for this date/),
  ).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByLabel("Daily shot total")).toHaveValue("450");
  await page.getByRole("button", { name: "Reconnect and sync" }).click();
  await expect(page.getByText("Shots saved after reconnecting.")).toBeVisible();
  expect(saves).toBe(1);
  expect(
    await page.evaluate(
      () =>
        Object.keys(localStorage).filter((k) => k.startsWith("shot-draft:"))
          .length,
    ),
  ).toBe(0);
});
test("locked scoring rules and private review keep approval separate from points", async ({
  page,
}) => {
  await session(page);
  let payload: any;
  await page.route("**/rest/v1/rpc/review_shooting_entry", (r) => {
    payload = r.request().postDataJSON();
    return r.fulfill({ json: { reviewed: true } });
  });
  await page.goto("/e2e/fixtures/product-audit.html?case=rules");
  await page.getByText("Daily cap settings", { exact: true }).click();
  await expect(page.getByLabel("Daily leaderboard cap")).toBeDisabled();
  await page.getByText("Coach review · 1 to review").click();
  await page.getByLabel("Private review note").fill("Confirmed with family");
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(
    page.getByText("Entry reviewed. Leaderboard credit is unchanged."),
  ).toBeVisible();
  expect(payload.p_version).toBe(1);
});

test("training photos queue durably offline, retry without duplicates and require deliberate deletion", async ({
  page,
  context,
}) => {
  await session(page);
  let photos: any[] = [];
  const operations: string[] = [];
  await page.route("**/rest/v1/player_consents?*", (r) =>
    r.fulfill({
      json: {
        guardian_user_id: uid,
        photo_sharing_allowed: true,
        relationship_confirmed: true,
      },
    }),
  );
  await page.route("**/rest/v1/session_photos*", (r) => {
    const method = r.request().method();
    if (method === "POST") {
      const record = r.request().postDataJSON();
      operations.push("link");
      photos.push({ ...record, created_at: new Date().toISOString() });
      return r.fulfill({ json: record });
    }
    if (method === "DELETE") {
      operations.push("unlink");
      photos = [];
      return r.fulfill({ json: { id: "removed" } });
    }
    return r.fulfill({ json: photos });
  });
  await page.route("**/storage/v1/**", (r) => {
    const path = new URL(r.request().url()).pathname;
    if (r.request().method() === "DELETE") {
      operations.push("remove object");
      return r.fulfill({ json: [] });
    }
    if (path.includes("/object/sign/"))
      return r.fulfill({
        json: {
          signedURL: "/object/sign/session-photos/fixture?token=fixture",
        },
      });
    operations.push("upload");
    return r.fulfill({ json: { Key: "fixture" } });
  });
  await page.goto("/e2e/fixtures/product-audit.html?case=photos");
  await expect(
    page.getByRole("button", { name: "Choose a photo", exact: true }),
  ).toBeVisible();
  const data = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.locator("input[type=file]").setInputFiles({
    name: "practice.png",
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  });
  await context.setOffline(true);
  await page.getByRole("button", { name: "Save Photo", exact: true }).click();
  await expect(
    page.getByText(/1 photo\(s\) kept on this device/),
  ).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Retry photo uploads" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry photo uploads" }).click();
  await expect(
    page.getByRole("button", { name: "Retry photo uploads" }),
  ).toHaveCount(0);
  expect(photos.length).toBe(1);
  expect(operations).toEqual(["upload", "link"]);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Delete training photo" }).click();
  expect(photos.length).toBe(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete training photo" }).click();
  await expect(
    page.getByRole("button", { name: "Delete training photo" }),
  ).toHaveCount(0);
  expect(operations.slice(-2)).toEqual(["unlink", "remove object"]);
});
