import { format, subDays, parseISO } from "date-fns";

/**
 * Calculate streak from a list of completed date strings (YYYY-MM-DD).
 * Returns currentStreak and bestStreak.
 */
function calculateStreakFromDates(completedDates: string[]): {
  currentStreak: number;
  bestStreak: number;
} {
  const unique = [...new Set(completedDates)].sort();

  if (unique.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Best streak
  let bestStreak = 1;
  let tempStreak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = parseISO(unique[i - 1]);
    const curr = parseISO(unique[i]);
    const diff = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff === 1) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  // Current streak (count back from today)
  let currentStreak = 0;
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  const yesterday = format(subDays(now, 1), "yyyy-MM-dd");
  const reversed = [...unique].reverse();

  let startOffset: number;
  if (reversed.includes(today)) {
    startOffset = 0;
  } else if (reversed.includes(yesterday)) {
    startOffset = 1;
  } else {
    return { currentStreak: 0, bestStreak };
  }

  for (let i = startOffset; i < 365; i++) {
    const d = format(subDays(now, i), "yyyy-MM-dd");
    if (reversed.includes(d)) {
      currentStreak++;
    } else {
      break;
    }
  }

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
  };
}

export { calculateStreakFromDates };
