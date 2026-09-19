import { addDays, startOfWeek } from "date-fns";

/**
 * Return the Monday after the current calendar week.
 *
 * New programs are drafts that a coach still needs to review and publish, so
 * starting them in the current (possibly nearly finished) week makes the first
 * week stale before the coach can use it.
 */
export function getNextProgramWeekStart(referenceDate = new Date()): Date {
  return startOfWeek(addDays(referenceDate, 7), { weekStartsOn: 1 });
}
