import { supabase } from "@/integrations/supabase/client";
import type { DayData } from "@/components/builder/DayEditorSheet";
import { getRecommendedCoachingVideoUrl } from "@/lib/coachingVideos";

/** One transaction: a failed save never deletes the last complete plan or publication. */
export async function saveTeamWeekPlan(options: {
  id: string;
  teamId: string;
  name: string;
  startDate: string;
  tier: string;
  useTierScaling: boolean;
  days: DayData[];
  publish?: boolean;
}) {
  const { data, error } = await supabase.rpc("save_team_week_plan", {
    p_id: options.id,
    p_team_id: options.teamId,
    p_name: options.name,
    p_start_date: options.startDate,
    p_tier: options.tier,
    p_use_tier_scaling: options.useTierScaling,
    p_publish: options.publish ?? false,
    p_days: options.days.map(day => ({
      date: day.date,
      title: day.title,
      notes: day.notes,
      tasks: day.tasks.map((task, index) => ({
        sort_order: index,
        task_type: task.task_type,
        label: task.label,
        target_type: task.target_type,
        target_value: task.target_value,
        shot_type: task.shot_type,
        shots_expected: task.shots_expected,
        is_required: task.is_required,
        video_url: getRecommendedCoachingVideoUrl({ label: task.label, taskType: task.task_type, shotType: task.shot_type }),
      })),
    })),
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data) || data.success !== true) {
    throw new Error("The program could not be saved. Please try again.");
  }
  return { id: options.id };
}
