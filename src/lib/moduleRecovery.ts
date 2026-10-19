const RELOAD_KEY = "hockeyapp-module-reload-at";
let reloadPending = false;

export function isModuleLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading (?:CSS )?chunk [\s\S]*failed|Unable to preload CSS/i.test(
    message,
  );
}

/** Recover a stale deployment once; a persistent outage must never cause a reload loop. */
export function recoverModuleLoad(): boolean {
  if (reloadPending) return true;
  if (!navigator.onLine || window.location.pathname === "/auth") return false;
  try {
    const previous = Number(sessionStorage.getItem(RELOAD_KEY));
    const now = Date.now();
    if (previous && now - previous < 60000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    // Without a durable guard, automatic reload is unsafe.
    return false;
  }
  reloadPending = true;
  window.location.reload();
  return true;
}

export function installModuleRecovery(): void {
  window.addEventListener("vite:preloadError", (event) => {
    const payload = (event as Event & { payload?: unknown }).payload;
    if (isModuleLoadError(payload)) recoverModuleLoad();
  });
}
