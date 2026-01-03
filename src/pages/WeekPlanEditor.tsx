import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/app/Toast";
import { format, parseISO, addDays, startOfWeek } from "date-fns";
import {
  ChevronLeft,
  Save,
  Send,
  Edit,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Zap,
} from "lucide-react";
import { DayEditorSheet, DayData, PlanTask } from "@/components/builder/DayEditorSheet";
import { applyTierScaling, getTierLabel, getDayLabel } from "@/lib/tierScaling";

interface WeekPlan {
  id: string;
  name: string;
  start_date: string;
  tier: string;
  status: string;
  use_tier_scaling: boolean;
}

interface PlanDay {
  id?: string;
  date: string;
  title: string;
  notes: string;
  tasks: PlanTask[];
}

interface ConflictInfo {
  date: string;
  hasPublishedCard: boolean;
  hasGameDay: boolean;
}

const tierOptions = [
  { value: "rec", label: "Rec" },
  { value: "rep", label: "Rep" },
  { value: "elite", label: "Elite" },
];

const WeekPlanEditor: React.FC = () => {
  const { id: teamId, planId } = useParams<{ id: string; planId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  const isEditing = !!planId && planId !== "new";
  const templateId = searchParams.get("template");

  // Form state
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  const [tier, setTier] = useState("rep");
  const [useTierScaling, setUseTierScaling] = useState(true);
  const [days, setDays] = useState<PlanDay[]>([]);
  const [status, setStatus] = useState("draft");

  // Editor state
  const [editingDay, setEditingDay] = useState<DayData | null>(null);
  const [editingDayLabel, setEditingDayLabel] = useState("");
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch team
  const { data: team } = useQuery({
    queryKey: ["team", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("id", teamId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!teamId,
  });

  // Fetch existing plan
  const { data: existingPlan, isLoading: planLoading } = useQuery({
    queryKey: ["team-week-plan", planId],
    queryFn: async () => {
      const { data: plan, error: planError } = await supabase
        .from("team_week_plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (planError) throw planError;

      // Fetch days with tasks
      const { data: daysData, error: daysError } = await supabase
        .from("team_week_plan_days")
        .select(`
          *,
          team_week_plan_tasks (*)
        `)
        .eq("team_week_plan_id", planId)
        .order("date");

      if (daysError) throw daysError;

      return {
        plan: plan as WeekPlan,
        days: daysData.map((d: any) => ({
          id: d.id,
          date: d.date,
          title: d.title || "",
          notes: d.notes || "",
          tasks: (d.team_week_plan_tasks || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
        })),
      };
    },
    enabled: !!user && !!planId && isEditing,
  });

  // Fetch template if selected
  const { data: template } = useQuery({
    queryKey: ["workout-template-full", templateId],
    queryFn: async () => {
      const { data: templateData, error: templateError } = await supabase
        .from("workout_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      const { data: daysData, error: daysError } = await supabase
        .from("workout_template_days")
        .select(`
          *,
          workout_template_tasks (*)
        `)
        .eq("workout_template_id", templateId)
        .order("day_of_week");

      if (daysError) throw daysError;

      return {
        template: templateData,
        days: daysData,
      };
    },
    enabled: !!user && !!templateId,
  });

  // Initialize days when start date changes
  useEffect(() => {
    if (!isEditing && !existingPlan) {
      const start = parseISO(startDate);
      const newDays: PlanDay[] = [];
      
      for (let i = 0; i < 7; i++) {
        const date = format(addDays(start, i), "yyyy-MM-dd");
        newDays.push({
          date,
          title: "",
          notes: "",
          tasks: [],
        });
      }
      
      setDays(newDays);
    }
  }, [startDate, isEditing, existingPlan]);

  // Populate from existing plan
  useEffect(() => {
    if (existingPlan) {
      setName(existingPlan.plan.name);
      setStartDate(existingPlan.plan.start_date);
      setTier(existingPlan.plan.tier);
      setUseTierScaling(existingPlan.plan.use_tier_scaling);
      setStatus(existingPlan.plan.status);
      
      // Ensure we have all 7 days
      const start = parseISO(existingPlan.plan.start_date);
      const fullDays: PlanDay[] = [];
      
      for (let i = 0; i < 7; i++) {
        const date = format(addDays(start, i), "yyyy-MM-dd");
        const existingDay = existingPlan.days.find((d) => d.date === date);
        
        fullDays.push(
          existingDay || {
            date,
            title: "",
            notes: "",
            tasks: [],
          }
        );
      }
      
      setDays(fullDays);
    }
  }, [existingPlan]);

  // Populate from template
  useEffect(() => {
    if (template && !isEditing) {
      setName(template.template.name);
      setTier(template.template.tier);
      
      const start = parseISO(startDate);
      const newDays: PlanDay[] = [];
      
      for (let i = 0; i < 7; i++) {
        const date = format(addDays(start, i), "yyyy-MM-dd");
        const dayOfWeek = (i + 1) % 7; // Monday = 1, Sunday = 0
        const templateDay = template.days.find((d: any) => d.day_of_week === dayOfWeek);
        
        newDays.push({
          date,
          title: templateDay?.title || "",
          notes: templateDay?.notes || "",
          tasks: templateDay?.workout_template_tasks?.map((t: any, idx: number) => ({
            sort_order: idx,
            task_type: t.task_type,
            label: t.label,
            target_type: t.target_type,
            target_value: t.target_value,
            shot_type: t.shot_type,
            shots_expected: t.shots_expected,
            is_required: t.is_required,
          })) || [],
        });
      }
      
      setDays(newDays);
    }
  }, [template, startDate, isEditing]);

  useEffect(() => {
    if (team?.palette_id) {
      setTeamTheme(team.palette_id);
    }
  }, [team?.palette_id, setTeamTheme]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      let weekPlanId = planId;

      if (isEditing) {
        // Update existing plan
        const { error: updateError } = await supabase
          .from("team_week_plans")
          .update({
            name,
            tier,
            use_tier_scaling: useTierScaling,
            updated_at: new Date().toISOString(),
          })
          .eq("id", planId);

        if (updateError) throw updateError;

        // Delete old days and tasks
        await supabase
          .from("team_week_plan_days")
          .delete()
          .eq("team_week_plan_id", planId);
      } else {
        // Create new plan
        const { data: newPlan, error: createError } = await supabase
          .from("team_week_plans")
          .insert({
            team_id: teamId,
            name,
            start_date: startDate,
            tier,
            use_tier_scaling: useTierScaling,
            status: "draft",
            created_by_user_id: user!.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        weekPlanId = newPlan.id;
      }

      // Insert days
      for (const day of days) {
        if (day.tasks.length === 0 && !day.title && !day.notes) continue;

        const { data: newDay, error: dayError } = await supabase
          .from("team_week_plan_days")
          .insert({
            team_week_plan_id: weekPlanId,
            date: day.date,
            title: day.title || null,
            notes: day.notes || null,
          })
          .select()
          .single();

        if (dayError) throw dayError;

        // Insert tasks
        if (day.tasks.length > 0) {
          const tasksToInsert = day.tasks.map((task, idx) => ({
            team_week_plan_day_id: newDay.id,
            sort_order: idx,
            task_type: task.task_type,
            label: task.label,
            target_type: task.target_type,
            target_value: task.target_value,
            shot_type: task.shot_type,
            shots_expected: task.shots_expected,
            is_required: task.is_required,
          }));

          const { error: tasksError } = await supabase
            .from("team_week_plan_tasks")
            .insert(tasksToInsert);

          if (tasksError) throw tasksError;
        }
      }

      return { weekPlanId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["team-week-plans", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-week-plan", result.weekPlanId] });
      toast.success("Saved", "Week plan saved as draft.");
      
      if (!isEditing) {
        navigate(`/teams/${teamId}/builder/${result.weekPlanId}`, { replace: true });
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to save", error.message);
    },
  });

  // Check for conflicts before publishing
  const checkConflicts = async () => {
    const conflictList: ConflictInfo[] = [];
    
    for (const day of days) {
      if (day.tasks.length === 0) continue;

      // Check for existing published card
      const { data: existingCard } = await supabase
        .from("practice_cards")
        .select("id, published_at")
        .eq("team_id", teamId)
        .eq("date", day.date)
        .eq("mode", "normal")
        .maybeSingle();

      // Check for game day
      const { data: gameDay } = await supabase
        .from("team_game_days")
        .select("enabled")
        .eq("team_id", teamId)
        .eq("date", day.date)
        .maybeSingle();

      if (existingCard?.published_at || gameDay?.enabled) {
        conflictList.push({
          date: day.date,
          hasPublishedCard: !!existingCard?.published_at,
          hasGameDay: !!gameDay?.enabled,
        });
      }
    }

    return conflictList;
  };

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      // First save the plan
      await saveMutation.mutateAsync();

      // Then publish each day as a practice card
      for (const day of days) {
        if (day.tasks.length === 0) continue;

        // Check if card exists
        const { data: existingCard } = await supabase
          .from("practice_cards")
          .select("id")
          .eq("team_id", teamId)
          .eq("date", day.date)
          .eq("mode", "normal")
          .maybeSingle();

        let practiceCardId = existingCard?.id;

        if (existingCard) {
          // Update existing card
          const { error: updateError } = await supabase
            .from("practice_cards")
            .update({
              tier,
              title: day.title || null,
              notes: day.notes || null,
              published_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingCard.id);

          if (updateError) throw updateError;

          // Delete old tasks
          await supabase
            .from("practice_tasks")
            .delete()
            .eq("practice_card_id", existingCard.id);
        } else {
          // Create new card
          const { data: newCard, error: createError } = await supabase
            .from("practice_cards")
            .insert({
              team_id: teamId,
              date: day.date,
              mode: "normal",
              tier,
              title: day.title || null,
              notes: day.notes || null,
              created_by_user_id: user!.id,
              published_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (createError) throw createError;
          practiceCardId = newCard.id;
        }

        // Insert tasks with tier scaling
        const tasksToInsert = day.tasks.map((task, idx) => ({
          practice_card_id: practiceCardId,
          sort_order: idx,
          task_type: task.task_type,
          label: task.label,
          target_type: task.target_type,
          target_value: useTierScaling
            ? applyTierScaling(task.target_value, tier)
            : task.target_value,
          shot_type: task.shot_type,
          shots_expected: useTierScaling
            ? applyTierScaling(task.shots_expected, tier)
            : task.shots_expected,
          is_required: task.is_required,
        }));

        const { error: tasksError } = await supabase
          .from("practice_tasks")
          .insert(tasksToInsert);

        if (tasksError) throw tasksError;
      }

      // Update plan status
      const currentPlanId = isEditing ? planId : undefined;
      if (currentPlanId) {
        await supabase
          .from("team_week_plans")
          .update({ status: "published", updated_at: new Date().toISOString() })
          .eq("id", currentPlanId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-week-plans", teamId] });
      queryClient.invalidateQueries({ queryKey: ["practice-cards", teamId] });
      toast.success("Published!", "Practice cards created for the week.");
      setShowPublishDialog(false);
      setStatus("published");
    },
    onError: (error: Error) => {
      toast.error("Failed to publish", error.message);
    },
  });

  const handlePublishClick = async () => {
    const conflictList = await checkConflicts();
    setConflicts(conflictList);
    setShowPublishDialog(true);
  };

  const handleDaySave = (updatedDay: DayData) => {
    setDays((prev) =>
      prev.map((d) => (d.date === updatedDay.date ? updatedDay : d))
    );
    setEditingDay(null);
  };

  const openDayEditor = (day: PlanDay, index: number) => {
    const date = parseISO(day.date);
    setEditingDayLabel(format(date, "EEEE, MMM d"));
    setEditingDay(day);
  };

  if (planLoading || authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  const daysWithTasks = days.filter((d) => d.tasks.length > 0).length;

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate(`/teams/${teamId}/builder`)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">
                {isEditing ? "Edit Plan" : "New Week Plan"}
              </h1>
              <p className="text-xs text-text-muted">{team?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !name}
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button
              size="sm"
              onClick={handlePublishClick}
              disabled={saveMutation.isPending || publishMutation.isPending || !name || daysWithTasks === 0}
            >
              <Send className="w-4 h-4 mr-1" />
              Publish
            </Button>
          </div>
        </div>
      }
    >
      <PageContainer>
        {/* Status Badge */}
        {status === "published" && (
          <AppCard variant="muted" className="border-success/30 bg-success/5">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-success font-medium">Published</span>
              <span className="text-text-muted">— Parents can see the workouts</span>
            </div>
          </AppCard>
        )}

        {/* Basics */}
        <AppCard>
          <AppCardTitle className="text-base mb-4">Plan Settings</AppCardTitle>

          <div className="space-y-4">
            <div>
              <Label>Plan Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Week 1 - Shooting Focus"
                className="mt-1.5"
              />
            </div>

            {!isEditing && (
              <div>
                <Label>Week Starting</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-text-muted" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Tier</Label>
                <Select value={tier} onValueChange={setTier}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tierOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end pb-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={useTierScaling}
                    onCheckedChange={setUseTierScaling}
                  />
                  <span className="text-sm">Scale targets</span>
                </div>
              </div>
            </div>
          </div>
        </AppCard>

        {/* Week Grid */}
        <div>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">
            Week Schedule
          </h2>

          <div className="grid grid-cols-1 gap-2">
            {days.map((day, index) => {
              const date = parseISO(day.date);
              const dayName = getDayLabel(date.getDay());
              const taskCount = day.tasks.length;

              return (
                <AppCard
                  key={day.date}
                  className="cursor-pointer hover:shadow-medium transition-shadow p-3"
                  onClick={() => openDayEditor(day, index)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-muted flex flex-col items-center justify-center">
                      <span className="text-xs text-text-muted">{dayName}</span>
                      <span className="text-lg font-bold">{format(date, "d")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {day.title || format(date, "EEEE")}
                      </p>
                      <p className="text-sm text-text-muted">
                        {taskCount === 0
                          ? "No tasks"
                          : `${taskCount} task${taskCount !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                    {taskCount > 0 && (
                      <Tag variant="accent" size="sm">
                        {taskCount}
                      </Tag>
                    )}
                    <Edit className="w-4 h-4 text-text-muted" />
                  </div>
                </AppCard>
              );
            })}
          </div>
        </div>
      </PageContainer>

      {/* Day Editor Sheet */}
      {editingDay && (
        <DayEditorSheet
          open={!!editingDay}
          onOpenChange={(open) => !open && setEditingDay(null)}
          day={editingDay}
          dayLabel={editingDayLabel}
          onSave={handleDaySave}
        />
      )}

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Week Plan?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will create practice cards for {daysWithTasks} day
                  {daysWithTasks !== 1 ? "s" : ""} that parents can see.
                </p>

                {conflicts.length > 0 && (
                  <div className="p-3 rounded-lg bg-warning-muted border border-warning/20">
                    <div className="flex gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-warning">
                          {conflicts.length} date{conflicts.length !== 1 ? "s" : ""} have existing content:
                        </p>
                        <ul className="mt-1 space-y-1 text-text-muted">
                          {conflicts.map((c) => (
                            <li key={c.date}>
                              {format(parseISO(c.date), "MMM d")}
                              {c.hasGameDay && (
                                <span className="ml-1 text-warning">
                                  <Zap className="w-3 h-3 inline" /> Game Day
                                </span>
                              )}
                              {c.hasPublishedCard && !c.hasGameDay && (
                                <span className="ml-1"> — will be replaced</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? "Publishing..." : "Publish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default WeekPlanEditor;
