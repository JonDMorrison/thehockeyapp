/** Match database CURRENT_DATE to the calendar used by the app's date-only screens. */
export const localCalendarFetch: typeof fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!new URL(url).pathname.startsWith("/rest/v1/")) return fetch(input, init);

  let timezone = "UTC";
  try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { /* Older browser fallback. */ }
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
  // Query builders add count, return and upsert preferences. Preserve all of them.
  const preferences = (headers.get("Prefer") || "").split(",").map(value => value.trim())
    .filter(value => value && !/^timezone\s*=/i.test(value));
  headers.set("Prefer", [...preferences, `timezone=${timezone}`].join(","));
  return fetch(input, { ...init, headers });
};
