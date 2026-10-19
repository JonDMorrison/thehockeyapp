import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });
for (const width of [320, 1440]) {
  test(`a failed page module recovers once at ${width}px without changing its URL`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    let requests = 0,
      documents = 0;
    page.on("response", (response) => {
      if (
        response.request().isNavigationRequest() &&
        response.request().frame() === page.mainFrame() &&
        response.status() === 200
      )
        documents++;
    });
    // Model an open tab on the previous deployment: both entry and lazy
    // module URLs change when the refreshed document loads the latest build.
    let firstDocument = true;
    await page.route("**/contact?qa=module*", async (route) => {
      if (!route.request().isNavigationRequest()) return route.continue();
      if (!firstDocument) return route.continue();
      firstDocument = false;
      const response = await route.fetch();
      const html = (await response.text()).replace(
        /(src="\/assets\/index-[^"]+\.js)"/,
        '$1?qa_stale=1"',
      );
      return route.fulfill({ response, body: html });
    });
    await page.route(
      /\/assets\/index-[^/]+\.js\?qa_stale=1$/,
      async (route) => {
        const response = await route.fetch();
        return route.fulfill({
          response,
          body: (await response.text()).replace(
            /Contact-[A-Za-z0-9_-]+\.js/g,
            "$&?qa_stale=1",
          ),
        });
      },
    );
    await page.route(/\/assets\/Contact-[^/]+\.js(?:\?.*)?$/, (r) =>
      ++requests === 1
        ? r.fulfill({
            status: 503,
            headers: { "cache-control": "no-store" },
            contentType: "application/javascript",
            body: "",
          })
        : r.continue(),
    );
    await page.goto("/contact?qa=module#message", { waitUntil: "commit" });
    await expect(
      page.getByRole("heading", {
        name: "Talk to a real person.",
        exact: true,
      }),
    ).toBeVisible({ timeout: 20000 });
    expect(requests).toBe(2);
    expect(documents).toBe(2);
    await expect(page).toHaveURL(/\/contact\?qa=module#message$/);
  });
}
test("a persistent page-module failure stops after one automatic refresh and allows manual retry", async ({
  page,
}) => {
  const fail = true;
  let documents = 0;
  page.on("response", (response) => {
    if (
      response.request().isNavigationRequest() &&
      response.request().frame() === page.mainFrame() &&
      response.status() === 200
    )
      documents++;
  });
  await page.route(/\/assets\/Contact-[^/]+\.js(?:\?.*)?$/, (r) =>
    fail
      ? r.fulfill({
          status: 503,
          headers: { "cache-control": "no-store" },
          contentType: "application/javascript",
          body: "",
        })
      : r.continue(),
  );
  await page.goto("/contact?qa=persistent", { waitUntil: "commit" });
  await expect(
    page.getByRole("heading", { name: "This page couldn’t load", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(1500); // Assert the bounded recovery doesn't keep navigating.
  expect(documents).toBe(2);
  await page.getByRole("button", { name: "Reload", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "This page couldn’t load", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(1000);
  expect(documents).toBe(3);
});
test("an unrelated rendering error is reported without an automatic refresh", async ({
  page,
}) => {
  let documents = 0;
  page.on("response", (response) => {
    if (
      response.request().isNavigationRequest() &&
      response.request().frame() === page.mainFrame() &&
      response.status() === 200
    )
      documents++;
  });
  await page.route(/\/assets\/Contact-[^/]+\.js(?:\?.*)?$/, (r) =>
    r.fulfill({
      contentType: "application/javascript",
      body: 'export default function Contact(){throw new Error("Controlled unrelated render failure")}',
    }),
  );
  await page.goto("/contact", { waitUntil: "commit" });
  await expect(
    page.getByRole("heading", { name: "Something went wrong", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  expect(documents).toBe(1);
});

test("a failed sign-in module leaves one-time authentication URLs under manual control", async ({
  page,
}) => {
  let documents = 0;
  page.on("response", (response) => {
    if (
      response.request().isNavigationRequest() &&
      response.request().frame() === page.mainFrame() &&
      response.status() === 200
    )
      documents++;
  });
  await page.route(/\/assets\/Auth-[^/]+\.js(?:\?.*)?$/, (r) =>
    r.fulfill({
      status: 503,
      headers: { "cache-control": "no-store" },
      contentType: "application/javascript",
      body: "",
    }),
  );
  await page.goto("/auth?mode=signin", { waitUntil: "commit" });
  await expect(
    page.getByRole("heading", { name: "This page couldn’t load", exact: true }),
  ).toBeVisible();
  expect(documents).toBe(1);
});
test("offline mode offers retry without automatically navigating away", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "onLine", { get: () => false }),
  );
  let documents = 0;
  page.on("response", (response) => {
    if (
      response.request().isNavigationRequest() &&
      response.request().frame() === page.mainFrame() &&
      response.status() === 200
    )
      documents++;
  });
  await page.route(/\/assets\/Contact-[^/]+\.js(?:\?.*)?$/, (r) =>
    r.fulfill({
      status: 503,
      headers: { "cache-control": "no-store" },
      contentType: "application/javascript",
      body: "",
    }),
  );
  await page.goto("/contact", { waitUntil: "commit" });
  await expect(
    page.getByRole("heading", { name: "This page couldn’t load", exact: true }),
  ).toBeVisible();
  expect(documents).toBe(1);
});
