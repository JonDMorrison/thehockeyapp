import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard } from "@/components/app/AppCard";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/app/Toast";
import { format } from "date-fns";
import {
  ChevronLeft,
  Check,
  Target,
  Dumbbell,
  Timer,
  Heart,
  Send,
} from "lucide-react";

interface ExercisePreset {
  id: string;
  label: string;
  task_type: string;
  icon: React.ReactNode;
  target_value: number;
  target_type: string;
  shot_type: string;
  description: string;
}

const EXERCISE_PRESETS: ExercisePreset[] = [
  {
    id: "wrist_shots",
    label: "Wrist Shots",
    task_type: "shooting",
    icon: <Target className="w-5 h-5" />,
    target_value: 50,
    target_type: "reps",
    shot_type: "wrist",
    description: "50 shots",
  },
  {
    id: "snap_shots",
    label: "Snap Shots",
    task_type: "shooting",
    icon: <Target className="w-5 h-5" />,
    target_value: 30,
    target_type: "reps",
    shot_type: "snap",
    description: "30 shots",
  },
  {
    id: "slap_shots",
    label: "Slap Shots",
    task_type: "shooting",
    icon: <Target className="w-5 h-5" />,
    target_value: 25,
    target_type: "reps",
    shot_type: "slap",
    description: "25 shots",
  },
  {
    id: "backhand",
    label: "Backhand",
    task_type: "shooting",
    icon: <Target className="w-5 h-5" />,
    target_value: 25,
    target_type: "reps",
    shot_type: "backhand",
    description: "25 shots",
  },
  {
    id: "pushups",
    label: "Push-ups",
    task_type: "conditioning",
    icon: <Dumbbell className="w-5 h-5" />,
    target_value: 20,
    target_type: "reps",
    shot_type: "none",
    description: "20 reps",
  },
  {
    id: "squats",
    label: "Squats",
    task_type: "conditioning",
    icon: <Dumbbell className="w-5 h-5" />,
    target_value: 25,
    target_type: "reps",
    shot_type: "none",
    description: "25 reps",
  },
  {
    id: "planks",
    label: "Planks",
    task_type: "conditioning",
    icon: <Timer className="w-5 h-5" />,
    target_value: 60,
    target_type: "seconds",
    shot_type: "none",
    description: "60 seconds",
  },
  {
    id: "stretching",
    label: "Stretching",
    task_type: "mobility",
    icon: <Heart className="w-5 h-5" />,
    target_value: 5,
    target_type: "minutes",
    shot_type: "none",
    description: "5 minutes",
  },
  {
    id: "stickhandling",
    label: "Stickhandling",
    task_type: "shooting",
    icon: <Target className="w-5 h-5" />,
    target_value: 5,
    target_type: "minutes",
    shot_type: "none",
    description: "5 minutes",
  },
  {
    id: "lunges",
    label: "Lunges",
    task_type: "conditioning",
    icon: <Dumbbell className="w-5 h-5" />,
    target_value: 20,
    target_type: "reps",
    shot_type: "none",
    description: "20 reps (10 each leg)",
  },
];

const QuickAssign: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch team
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["team", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Check if there's already a practice card for today
  const { data: existingCard } = useQuery({
    queryKey: ["practice-card-today", id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_cards")
        .select("id, published_at")
        .eq("team_id", id)
        .eq("date", today)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  useEffect(() => {
    if (team?.palette_id) {
      setTeamTheme(team.palette_id);
    }
  }, [team?.palette_id, setTeamTheme]);

  const toggleExercise = (exerciseId: string) => {
    setSelectedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  };

  const assignMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      if (selectedExercises.size === 0) {
        throw new Error("Select at least one exercise");
      }

      let practiceCardId = existingCard?.id;

      // Create or update practice card
      if (practiceCardId) {
        // Delete existing tasks
        await supabase.from("practice_tasks").delete().eq("practice_card_id", practiceCardId);
        
        // Update card
        const { error } = await supabase
          .from("practice_cards")
          .update({
            published_at: publish ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", practiceCardId);
        if (error) throw error;
      } else {
        // Create new card
        const { data: newCard, error } = await supabase
          .from("practice_cards")
          .insert({
            team_id: id,
            date: today,
            tier: "rep",
            created_by_user_id: user!.id,
            published_at: publish ? new Date().toISOString() : null,
          })
          .select()
          .single();
        if (error) throw error;
        practiceCardId = newCard.id;
      }

      // Insert selected exercises as tasks
      const selectedPresets = EXERCISE_PRESETS.filter((p) => selectedExercises.has(p.id));
      const tasks = selectedPresets.map((preset, index) => ({
        practice_card_id: practiceCardId,
        sort_order: index,
        task_type: preset.task_type,
        label: preset.label,
        target_type: preset.target_type,
        target_value: preset.target_value,
        shot_type: preset.shot_type,
        shots_expected: preset.task_type === "shooting" ? preset.target_value : null,
        is_required: true,
      }));

      const { error: tasksError } = await supabase
        .from("practice_tasks")
        .insert(tasks);
      if (tasksError) throw tasksError;

      return { published: publish };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["team-dashboard", id] });
      queryClient.invalidateQueries({ queryKey: ["practice-cards", id] });
      
      if (result.published) {
        toast.success("Published!", "Players can now see today's workout.");
      } else {
        toast.success("Saved", "Workout saved as draft.");
      }
      
      navigate(`/teams/${id}`);
    },
    onError: (error: Error) => {
      toast.error("Failed", error.message);
    },
  });

  if (teamLoading || authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-64" />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate(`/teams/${id}`)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Assign Workout</h1>
              <p className="text-xs text-muted-foreground">
                {format(new Date(), "EEEE, MMM d")}
              </p>
            </div>
          </div>
        </div>
      }
    >
      <PageContainer className="space-y-4 pb-32">
        {/* Instructions */}
        <p className="text-sm text-muted-foreground">
          Tap exercises to build today's workout. Publish when ready.
        </p>

        {/* Exercise Grid */}
        <div className="grid grid-cols-2 gap-3">
          {EXERCISE_PRESETS.map((exercise) => {
            const isSelected = selectedExercises.has(exercise.id);
            return (
              <button
                key={exercise.id}
                onClick={() => toggleExercise(exercise.id)}
                className={`
                  relative p-4 rounded-xl text-left transition-all
                  ${isSelected 
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background" 
                    : "bg-card border border-border hover:border-primary/50"}
                `}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4" />
                  </div>
                )}
                <div className={`mb-2 ${isSelected ? "text-primary-foreground" : "text-primary"}`}>
                  {exercise.icon}
                </div>
                <div className="font-medium text-sm">{exercise.label}</div>
                <div className={`text-xs mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {exercise.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Existing card warning */}
        {existingCard && (
          <AppCard variant="muted" className="border-warning/30">
            <p className="text-sm text-muted-foreground">
              You already have a workout for today. This will replace it.
            </p>
          </AppCard>
        )}
      </PageContainer>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => assignMutation.mutate(false)}
            disabled={selectedExercises.size === 0 || assignMutation.isPending}
          >
            Save Draft
          </Button>
          <Button
            className="flex-1"
            onClick={() => assignMutation.mutate(true)}
            disabled={selectedExercises.size === 0 || assignMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            {assignMutation.isPending ? "Publishing..." : `Publish (${selectedExercises.size})`}
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

export default QuickAssign;
