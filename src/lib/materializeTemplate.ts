import { format, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/core";

/** A single task entry stored inside a program template's `tasks` jsonb array. */
export interface TemplateTaskEntry {
  /** 1-based absolute day index within the program (1..weeks*7). */
  day: number;
  label: string;
  task_type: string;
  target_type: string;
  target_value: number | null;
  shot_type: string;
  shots_expected: number | null;
}

/** Shape of a program template row used when materializing it onto a team. */
export interface ProgramTemplate {
  id: string;
  title: string;
  description: string | null;
  age_divisions: string[];
  levels: string[];
  weeks: number;
  tasks: TemplateTaskEntry[];
}

/**
 * Materialize a program template into draft practice_cards for a team.
 *
 * Tasks are grouped by `day`; each day with at least one task becomes a single
 * practice_card dated relative to `startMonday`, followed by its practice_tasks.
 *
 * Cards are created as DRAFTS (published_at = null) on purpose: the coach
 * reviews and publishes them rather than pushing un-reviewed work to players.
 * Per-card errors are tolerated (logged) so a partial failure doesn't abort the
 * whole import.
 */
export async function materializeTemplate(
  template: ProgramTemplate,
  teamId: string,
  userId: string,
  startMonday: Date
): Promise<{ cardsCreated: number }> {
  // Group template tasks by their absolute day index.
  const byDay = new Map<number, TemplateTaskEntry[]>();
  for (const task of template.tasks ?? []) {
    const list = byDay.get(task.day) ?? [];
    list.push(task);
    byDay.set(task.day, list);
  }

  let cardsCreated = 0;

  for (const [day, tasks] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
    if (tasks.length === 0) continue;

    try {
      const date = format(addDays(startMonday, day - 1), "yyyy-MM-dd");

      const { data: card, error: cardError } = await supabase
        .from("practice_cards")
        .insert({
          team_id: teamId,
          date,
          tier: "rep",
          title: template.title,
          notes: null,
          created_by_user_id: userId,
          // DRAFT — coach reviews then publishes.
          published_at: null,
          program_source: "team",
        })
        .select()
        .single();

      if (cardError || !card) {
        logger.error("materializeTemplate: failed to create card", {
          day,
          error: cardError,
        });
        continue;
      }

      const tasksToInsert = tasks.map((task, index) => ({
        practice_card_id: card.id,
        sort_order: index,
        task_type: task.task_type,
        label: task.label,
        target_type: task.target_type,
        target_value: task.target_value,
        shot_type: task.shot_type,
        shots_expected: task.shots_expected,
        is_required: true,
        coach_notes: null,
        video_url: null,
      }));

      if (tasksToInsert.length > 0) {
        const { error: tasksError } = await supabase
          .from("practice_tasks")
          .insert(tasksToInsert);

        if (tasksError) {
          logger.error("materializeTemplate: failed to insert tasks", {
            day,
            error: tasksError,
          });
          // Card already created; count it and continue.
        }
      }

      cardsCreated += 1;
    } catch (error) {
      logger.error("materializeTemplate: unexpected error for day", { day, error });
    }
  }

  return { cardsCreated };
}
