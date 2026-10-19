import { saveTeamWeekPlan } from "@/lib/saveTeamWeekPlan";
import { ProgramProgress, ProgramWeek, ProgramAction } from "@/components/program/ProgramVisuals";
import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AIGeneratedDraft, AIGeneratedTask, AIGeneratedDay } from "@/core";
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
import { getTierLabel, getDayLabel } from "@/lib/tierScaling";

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

const WeekPlanEditor: React.FC = () => {
  const { t } = useTranslation();
  const { id: teamId, planId } = useParams<{ id: string; planId?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const newPlanId = useRef(crypto.randomUUID());
  const programSetup = searchParams.get("inviteAfter") === "1";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  const tierOptions = [
    { value: "rec", label: t('practice.tierRec') },
    { value: "rep", label: t('practice.tierRep') },
    { value: "elite", label: t('practice.tierElite') },
  ];

  const isEditing = !!planId && planId !== "new";
  const templateId = searchParams.get("template");
  const aiDraft = (location.state as { aiDraft?: AIGeneratedDraft })?.aiDraft;

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
  const [isDirty, setIsDirty] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
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
        days: daysData.map((d: { id: string; date: string; title: string | null; notes: string | null; team_week_plan_tasks: Array<{ sort_order: number; task_type: string; label: string; target_type: string; target_value: number | null; shot_type: string; shots_expected: number | null; is_required: boolean }> }) => ({
          id: d.id,
          date: d.date,
          title: d.title || "",
          notes: d.notes || "",
          tasks: (d.team_week_plan_tasks || []).sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order),
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
        const templateDay = template.days.find((d: { day_of_week: number }) => d.day_of_week === dayOfWeek);

        newDays.push({
          date,
          title: templateDay?.title || "",
          notes: templateDay?.notes || "",
          tasks: templateDay?.workout_template_tasks?.map((t: { task_type: string; label: string; target_type: string; target_value: number | null; shot_type: string; shots_expected: number | null; is_required: boolean }, idx: number) => ({
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

  // Populate from AI draft
  useEffect(() => {
    if (aiDraft && !isEditing) {
      if (aiDraft.name) setName(aiDraft.name);
      if (aiDraft.tier) setTier(aiDraft.tier);
      if (aiDraft.start_date) setStartDate(aiDraft.start_date);

      if (aiDraft.days && Array.isArray(aiDraft.days)) {
        const newDays: PlanDay[] = aiDraft.days.map((d: AIGeneratedDay) => ({
          date: d.date,
          title: d.title || "",
          notes: d.notes || "",
          tasks: (d.tasks || []).map((t: AIGeneratedTask, idx: number) => ({
            sort_order: idx,
            task_type: t.task_type || "other",
            label: t.label || "",
            target_type: t.target_type || "none",
            target_value: t.target_value,
            shot_type: t.shot_type || "none",
            shots_expected: t.shots_expected,
            is_required: t.is_required !== false,
          })),
        }));
        setDays(newDays);
      }
    }
  }, [aiDraft, isEditing]);

  useEffect(() => {
    if (team?.palette_id) {
      setTeamTheme(team.palette_id);
    }
  }, [team?.palette_id, setTeamTheme]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (publishing: boolean = false) => {
      const saved = await saveTeamWeekPlan({
        id: planId || newPlanId.current, teamId: teamId!, name, startDate, tier,
        useTierScaling, days, publish: publishing,
      });
      return { weekPlanId: saved.id, publishing };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["team-week-plans", teamId] });
      queryClient.invalidateQueries({ queryKey: ["team-week-plan", result.weekPlanId] });
      if (!result.publishing) toast.success(t('common.saved'), t('practice.weekPlanSavedAsDraft'));
      setIsDirty(false);
      // Navigate back to dashboard after saving
      if (!result.publishing && !programSetup) navigate(`/teams/${teamId}`);
    },
    onError: (error: Error, publishing: boolean) => {
      if (!publishing) toast.error(t('practice.failedToSave'), error.message);
    },
  });

  // Check for conflicts before publishing
  const checkConflicts = async () => {
    const dates = days.filter(day => day.tasks.length > 0).map(day => day.date);
    if (!dates.length) return [];
    const [cards, games] = await Promise.all([
      supabase.from("practice_cards").select("date, published_at")
        .eq("team_id", teamId!).eq("program_source", "team").eq("mode", "normal").in("date", dates),
      supabase.from("team_game_days").select("date, enabled").eq("team_id", teamId!).in("date", dates),
    ]);
    if (cards.error) throw cards.error;
    if (games.error) throw games.error;
    return dates.flatMap(date => {
      const hasPublishedCard = !!cards.data?.some(card => card.date === date && card.published_at);
      const hasGameDay = !!games.data?.some(game => game.date === date && game.enabled);
      return hasPublishedCard || hasGameDay ? [{ date, hasPublishedCard, hasGameDay }] : [];
    });
  };

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-week-plans", teamId] });
      queryClient.invalidateQueries({ queryKey: ["practice-cards", teamId] });
      toast.success(t('practice.published'), t('practice.practiceCardsCreated'));
      setShowPublishDialog(false);
      setStatus("published");
      // Onboarding invites come after a successfully published program.
      navigate(`/teams/${teamId}${searchParams.get("inviteAfter") === "1" ? "?inviteFamilies=1&programReady=1" : ""}`);
    },
    onError: (error: Error) => {
      toast.error(t('practice.failedToPublish'), error.message);
    },
  });

  const handlePublishClick = async () => {
    try {
      const conflictList = await checkConflicts();
      setConflicts(conflictList);
      setShowPublishDialog(true);
    } catch {
      toast.error("Couldn’t check this week", "Please retry before publishing so existing workouts can be checked.");
    }
  };

  const handleDaySave = (updatedDay: DayData) => {
    setDays((prev) =>
      prev.map((d) => (d.date === updatedDay.date ? updatedDay : d))
    );
    setIsDirty(true);
    setEditingDay(null);
  };

  const openDayEditor = (day: PlanDay, index: number) => {
    const date = parseISO(day.date);
    setEditingDayLabel(format(date, "EEEE, MMM d"));
    setEditingDay(day);
  };

  // Show loading state while auth or data is loading
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

  // If not authenticated, render nothing while redirect happens
  if (!isAuthenticated) {
    return null;
  }

  const daysWithTasks = days.filter((d) => d.tasks.length > 0).length;

  return (
    <AppShell
      hideUserMenu={searchParams.get("inviteAfter") === "1"}
      hideNav
      header={
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Back to team plans"
              onClick={() => isDirty ? setShowLeaveDialog(true) : navigate(`/teams/${teamId}/builder`)}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">
                {programSetup ? "Make it yours" : isEditing ? t('practice.editPlan') : t('practice.newWeekPlan')}
              </h1>
              <p className="truncate text-xs text-text-muted">{team?.name}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveMutation.mutate(false)}
              disabled={saveMutation.isPending || !name}
            >
              <Save className="w-4 h-4 mr-1" />
              {programSetup ? 'Save draft' : t('common.save')}
            </Button>
            {!programSetup && (
            <Button
              size="sm"
              onClick={handlePublishClick}
              disabled={saveMutation.isPending || publishMutation.isPending || !name || daysWithTasks === 0}
            >
              <Send className="w-4 h-4 mr-1" />
              {t('practice.publish')}
            </Button>
            )}
          </div>
        </div>
      }
    >
      <PageContainer className={programSetup ? "max-w-3xl pb-28" : undefined}>
        {programSetup && <div className="space-y-5"><ProgramProgress step={2} /><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">{team?.name}</p><h2 className="mt-2 font-display text-3xl font-black">A plan that fits your team</h2><p className="mt-2 text-sm text-muted-foreground">Tap any day to change the activities. Rest days count, too.</p><p className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{daysWithTasks} training days · {7 - daysWithTasks} rest days</p></div></div>}
        {/* Status Badge */}
        {status === "published" && (
          <AppCard variant="muted" className="border-success/30 bg-success/5">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-success font-medium">{t('practice.publishedStatus')}</span>
              <span className="text-text-muted">— {t('practice.parentsCanSee')}</span>
            </div>
          </AppCard>
        )}

        {/* Basics */}
        <AppCard>
          {!programSetup && <AppCardTitle className="text-base mb-4">{t('practice.planSettings')}</AppCardTitle>}

          <div className="space-y-4">
            <div>
              <Label htmlFor="program-name">{programSetup ? 'Program name' : t('practice.planName')}</Label>
              <Input
                id="program-name"
                value={name}
                onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
                placeholder={t('practice.planNamePlaceholder')}
                className="mt-1.5"
              />
            </div>

            {!isEditing && (
              <div>
                <Label>{t('practice.weekStarting')}</Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-text-muted" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setIsDirty(true); }}
                  />
                </div>
              </div>
            )}

            <details open={programSetup ? undefined : true}>
              <summary className="cursor-pointer py-2 text-sm text-muted-foreground">Level & training targets</summary>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>{t('practice.tier')}</Label>
                <Select value={tier} onValueChange={(v) => { setTier(v); setIsDirty(true); }}>
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
                    aria-label="Scale training targets for team level"
                    checked={useTierScaling}
                    onCheckedChange={(v) => { setUseTierScaling(v); setIsDirty(true); }}
                  />
                  <span className="text-sm">{t('practice.scaleTargets')}</span>
                </div>
              </div>
            </div>
            </details>
          </div>
        </AppCard>

        {programSetup ? <section className="space-y-3"><h2 className="text-sm font-semibold">Your week · {format(parseISO(startDate), "MMM d")} – {format(addDays(parseISO(startDate), 6), "MMM d")}</h2><ProgramWeek days={days} onEdit={index => openDayEditor(days[index], index)} /></section> : (<>
        {/* Week Grid */}
        <div>
          <h2 className="text-sm font-semibold text-text-secondary mb-3">
            {t('practice.weekSchedule')}
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
                          ? t('practice.noTasks')
                          : t('practice.nTasks', { count: taskCount })}
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
        </>)}
      </PageContainer>

      {programSetup && <ProgramAction label="Publish & invite families" onClick={handlePublishClick} disabled={!name.trim() || daysWithTasks === 0} busy={saveMutation.isPending || publishMutation.isPending} />}
      {/* Day Editor Sheet */}
      {editingDay && (
        <DayEditorSheet
          open={!!editingDay}
          onOpenChange={(open) => !open && setEditingDay(null)}
          day={editingDay}
          dayLabel={editingDayLabel}
          onSave={handleDaySave}
          simple={programSetup}
        />
      )}

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('practice.publishWeekPlanTitle')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {t('practice.publishWeekPlanDesc', { count: daysWithTasks })}
                </p>

                {conflicts.length > 0 && (
                  <div className="p-3 rounded-lg bg-warning-muted border border-warning/20">
                    <div className="flex gap-2">
                      <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-warning">
                          {t('practice.conflictsWarning', { count: conflicts.length })}
                        </p>
                        <ul className="mt-1 space-y-1 text-text-muted">
                          {conflicts.map((c) => (
                            <li key={c.date}>
                              {format(parseISO(c.date), "MMM d")}
                              {c.hasGameDay && (
                                <span className="ml-1 text-warning">
                                  <Zap className="w-3 h-3 inline" /> {t('practice.gameDay')}
                                </span>
                              )}
                              {c.hasPublishedCard && !c.hasGameDay && (
                                <span className="ml-1"> — {t('practice.willBeReplaced')}</span>
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
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? t('practice.publishing') : t('practice.publish')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave without saving confirmation */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('practice.unsavedChangesTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('practice.unsavedChangesDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate(`/teams/${teamId}/builder`)}>
              {t('practice.discardChanges')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default WeekPlanEditor;
