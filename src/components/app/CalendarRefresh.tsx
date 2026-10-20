import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalCalendarDay } from "@/hooks/useLocalCalendarDay";

/** Refresh active feeds after midnight or a timezone change without discarding forms. */
export function CalendarRefresh(): null {
  const calendar = useLocalCalendarDay();
  const previous = useRef(calendar);
  const queries = useQueryClient();
  useEffect(() => {
    if (previous.current !== calendar) {
      previous.current = calendar;
      void queries.invalidateQueries();
    }
  }, [calendar, queries]);
  return null;
}
