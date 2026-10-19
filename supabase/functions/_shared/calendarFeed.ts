const MAX_ICAL_BYTES = 2 * 1024 * 1024;

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || /\.(localhost|local|internal)$/.test(host)) return true;
  if (/^(0\.|10\.|127\.|169\.254\.|192\.168\.)/.test(host)) return true;
  const match172 = host.match(/^172\.(\d{1,3})\./);
  if (match172 && Number(match172[1]) >= 16 && Number(match172[1]) <= 31) return true;
  // Only apply IPv6 prefixes to IPv6 addresses, not public names such as fc.example.com.
  if (host.includes(":")) {
    if (host === "::" || host === "::1" || /^(fe[89ab]|fc|fd)/.test(host)) return true;
    // Reject mapped address literals rather than bypassing the IPv4 restrictions.
    if (host.startsWith("::ffff:")) return true;
  }
  return false;
}

export function normalizeICalUrl(url: string): string {
  return url.replace(/^webcal:\/\//i, "https://");
}

export function isValidICalUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizeICalUrl(url));
    return parsed.protocol === "https:" && !parsed.username && !parsed.password
      && (parsed.port === "" || parsed.port === "443") && !isPrivateHostname(parsed.hostname);
  } catch { return false; }
}

export async function fetchICal(url: string, fetcher: typeof fetch = fetch): Promise<string> {
  if (!isValidICalUrl(url)) throw new Error("Invalid iCal URL format");
  let response: Response;
  try { response = await fetcher(normalizeICalUrl(url), {
    headers: { "User-Agent": "TheHockeyApp/1.0" }, redirect: "error", signal: AbortSignal.timeout(10_000),
  }); } catch { throw new Error("Could not download the calendar. Please try again."); }
  if (!response.ok || Number(response.headers.get("content-length") || 0) > MAX_ICAL_BYTES) {
    await response.body?.cancel();
    throw new Error(response.ok ? "Calendar file is too large" : `Calendar request failed with status ${response.status}`);
  }
  if (!response.body) throw new Error("The calendar feed is empty");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0, content = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_ICAL_BYTES) throw new Error("Calendar file is too large");
      content += decoder.decode(value, { stream: true });
    }
    content += decoder.decode();
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally { reader.releaseLock(); }
  const trimmed = content.trim();
  if (!/^BEGIN:VCALENDAR(?:\r?\n)/i.test(trimmed) || !/(?:\r?\n)END:VCALENDAR$/i.test(trimmed)) {
    throw new Error("This link did not return a valid iCalendar feed. Your existing schedule was kept.");
  }
  return content;
}
