import { useSyncExternalStore } from "react";

/** Date-only workouts follow the viewer's local calendar; instants stay in UTC. */
export function localCalendarKey(now = new Date()): string {
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return `${date}|${Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}`;
}

const listeners = new Set<() => void>();
let stop: (() => void) | undefined;
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!stop) {
    let previous = localCalendarKey();
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      clearTimeout(timer);
      const next = localCalendarKey();
      if (next !== previous) {
        previous = next;
        listeners.forEach((notify) => notify());
      }
      const now = new Date();
      const midnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      // Recheck timezone/clock changes too; sleeping tabs catch up on focus.
      timer = setTimeout(
        check,
        Math.min(60000, Math.max(1, midnight.getTime() - now.getTime())),
      );
    };
    check();
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    stop = () => {
      clearTimeout(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      stop?.();
      stop = undefined;
    }
  };
}

export function useLocalCalendarDay() {
  return useSyncExternalStore(
    subscribe,
    localCalendarKey,
    () => "1970-01-01|UTC",
  );
}
