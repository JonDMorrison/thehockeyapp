import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface PersonalWorkoutDay {
  date: string;
  title: string;
  notes?: string;
  mode?: string;
  tasks: Array<{
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
  const { data, error } = await supabase.rpc("save_personal_workouts", {
    p_player_id: playerId,
    p_tier: tier,
    p_days: days as unknown as Json,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data) || data.success !== true) throw new Error("The workout could not be saved. Please try again.");
  return data;
}
