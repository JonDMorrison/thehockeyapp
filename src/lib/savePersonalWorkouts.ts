import { validateExerciseDetails } from "@/lib/validateExerciseDetails";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface PersonalWorkoutDay {
  date: string;
  title: string;
  notes?: string;
  mode?: string;
  tasks: Array<{
    sets_count?: number;
    rest_seconds?: number;
    equipment?: string;
    instructions?: string;
    label: string;
    task_type: string;
    sort_order?: number;
    target_type?: string;
    target_value?: number | null;
    shot_type?: string;
    shots_expected?: number | null;
    is_required?: boolean;
    video_url?: string | null;
  }>;
}

/** Save the complete set of days, or keep every previous card and task unchanged. */
export async function savePersonalWorkouts(playerId: string, tier: string, days: PersonalWorkoutDay[]) {
  validateExerciseDetails(days.flatMap(day => day.tasks));
  const { data, error } = await supabase.rpc("save_personal_workouts", {
    p_player_id: playerId,
    p_tier: tier,
    p_days: days.map(day => ({ ...day, tasks: day.tasks.map(task => ({ ...task, sets_count: ["minutes", "seconds"].includes(task.target_type ?? "") ? task.sets_count ?? 1 : 1 })) })) as unknown as Json,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data) || data.success !== true) throw new Error("The workout could not be saved. Please try again.");
  return data;
}
