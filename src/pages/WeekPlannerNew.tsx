import {
  ProgramProgress,
  ProgramPlans,
  ProgramWeek,
  ProgramAction,
} from "@/components/program/ProgramVisuals";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import React, { useState, useEffect, useRef } from "react";
import { logger } from "@/core";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Check, Sparkles } from "lucide-react";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  WEEK_THEMES,
  DAY_TEMPLATES,
  THEME_SCHEDULES,
  WeekThemeId,
  DayTemplate,
  getTasksForDay,
} from "@/lib/weekTemplates";
import { ThemeCard } from "@/components/builder/ThemeCard";
import {
  DayCardPreview,
  DayCardEmpty,
} from "@/components/builder/DayCardPreview";
import { DayPicker } from "@/components/builder/DayPicker";
import { TemplatePicker } from "@/components/planning/TemplatePicker";
import { LayoutTemplate } from "lucide-react";

type Step = "theme" | "customize";

interface DayPlan {
  dayIndex: number;
  dayName: string;
  date: string;
  template: DayTemplate;
}

const WeekPlannerNew: React.FC = () => {
  const { t } = useTranslation();
  const { id: teamId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const inviteAfter = search.get("inviteAfter") === "1";
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  const draftKey = `program-choice:v1:${teamId}`;
  const [restored] = useState(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) || "null");
      return inviteAfter &&
        saved &&
        WEEK_THEMES.some((t) => t.id === saved.theme) &&
        /^[0-9a-f-]{36}$/i.test(saved.id) &&
        format(parseISO(saved.start), "yyyy-MM-dd") === saved.start
        ? (saved as { theme: WeekThemeId; id: string; start: string })
        : null;
    } catch {
      return null;
    }
  });
  const [step, setStep] = useState<Step>(restored ? "customize" : "theme");
  const [selectedTheme, setSelectedTheme] = useState<WeekThemeId | null>(
    restored?.theme ?? null,
  );
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>(() =>
    restored
      ? THEME_SCHEDULES[restored.theme].map((id, i) => ({
          dayIndex: i,
          dayName: format(addDays(parseISO(restored.start), i), "EEEE"),
          date: format(addDays(parseISO(restored.start), i), "yyyy-MM-dd"),
          template: DAY_TEMPLATES.find((d) => d.id === id)!,
        }))
      : [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // Calculate start date (next Monday)
  const [startDate, setStartDate] = useState(() =>
    restored
      ? parseISO(restored.start)
      : startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 }),
  );
  const draftId = useRef(restored?.id ?? crypto.randomUUID());
  const [saveError, setSaveError] = useState("");

  const dayNames = [
    t("common.monday"),
    t("common.tuesday"),
    t("common.wednesday"),
    t("common.thursday"),
    t("common.friday"),
    t("common.saturday"),
    t("common.sunday"),
  ];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch team
  const { data: team, isLoading: teamLoading } = useQuery({
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

  useEffect(() => {
    if (team?.palette_id) {
      setTeamTheme(team.palette_id);
    }
  }, [team?.palette_id, setTeamTheme]);

  // Generate week plan when theme is selected
  const handleThemeSelect = (themeId: WeekThemeId) => {
    setSelectedTheme(themeId);

    const schedule = THEME_SCHEDULES[themeId];
    const newWeekPlan: DayPlan[] = schedule.map((dayTemplateId, index) => {
      const template = DAY_TEMPLATES.find((d) => d.id === dayTemplateId)!;
      return {
        dayIndex: index,
        dayName: dayNames[index],
        date: format(addDays(startDate, index), "yyyy-MM-dd"),
        template,
      };
    });

    setWeekPlan(newWeekPlan);
    setStep("customize");
  };

  useEffect(() => {
    if (inviteAfter && selectedTheme) {
      try {
        sessionStorage.setItem(
          draftKey,
          JSON.stringify({
            theme: selectedTheme,
            id: draftId.current,
            start: format(startDate, "yyyy-MM-dd"),
          }),
        );
      } catch {
        /* Draft remains in memory when storage is unavailable. */
      }
    }
  }, [draftKey, inviteAfter, selectedTheme, startDate]);

  // Swap a day
  const handleSwapDay = (dayIndex: number) => {
    setEditingDayIndex(dayIndex);
    setPickerOpen(true);
  };

  // Delete a day (make it rest day)
  const handleDeleteDay = (dayIndex: number) => {
    const restDay = DAY_TEMPLATES.find((d) => d.id === "rest_day")!;
    setWeekPlan((prev) =>
      prev.map((day) =>
        day.dayIndex === dayIndex ? { ...day, template: restDay } : day,
      ),
    );
  };

  // Add a day
  const handleAddDay = (dayIndex: number) => {
    setEditingDayIndex(dayIndex);
    setPickerOpen(true);
  };

  // Select a new day template
  const handleDaySelect = (template: DayTemplate) => {
    if (editingDayIndex === null) return;

    const existingDay = weekPlan.find((d) => d.dayIndex === editingDayIndex);

    if (existingDay) {
      // Update existing day
      setWeekPlan((prev) =>
        prev.map((day) =>
          day.dayIndex === editingDayIndex ? { ...day, template } : day,
        ),
      );
    } else {
      // Add new day
      setWeekPlan((prev) =>
        [
          ...prev,
          {
            dayIndex: editingDayIndex,
            dayName: dayNames[editingDayIndex],
            date: format(addDays(startDate, editingDayIndex), "yyyy-MM-dd"),
            template,
          },
        ].sort((a, b) => a.dayIndex - b.dayIndex),
      );
    }

    setEditingDayIndex(null);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !teamId) throw new Error("Missing user or team");

      const theme = WEEK_THEMES.find((t) => t.id === selectedTheme);

      setSaveError("");
      // Reuse the draft on retry, including when a response was lost.
      const { data: plan, error: planError } = await supabase
        .from("team_week_plans")
        .upsert({
          id: draftId.current,
          team_id: teamId,
          created_by_user_id: user.id,
          name: theme?.title || "Week Plan",
          start_date: format(startDate, "yyyy-MM-dd"),
          status: "draft",
        })
        .select()
        .single();

      if (planError) throw planError;

      const { error: clearError } = await supabase
        .from("team_week_plan_days")
        .delete()
        .eq("team_week_plan_id", plan.id);
      if (clearError) throw clearError;
      // Create days and tasks
      for (const day of weekPlan) {
        if (day.template.id === "rest_day") continue;

        const { data: dayData, error: dayError } = await supabase
          .from("team_week_plan_days")
          .insert({
            team_week_plan_id: plan.id,
            date: format(addDays(startDate, day.dayIndex), "yyyy-MM-dd"),
            title: day.template.title,
            notes: day.template.subtitle,
          })
          .select()
          .single();

        if (dayError) throw dayError;

        // Insert tasks
        const tasks = getTasksForDay(day.template.id);
        if (tasks.length > 0) {
          const taskInserts = tasks.map((task, index) => ({
            team_week_plan_day_id: dayData.id,
            label: task.label,
            task_type: task.type,
            sort_order: index,
            shots_expected: task.shots || null,
            shot_type: task.shotType || "none",
            target_value: task.minutes || task.reps || null,
            target_type: task.minutes ? "minutes" : task.reps ? "reps" : "none",
            is_required: task.isRequired || false,
          }));

          const { error: tasksError } = await supabase
            .from("team_week_plan_tasks")
            .insert(taskInserts);

          if (tasksError) throw tasksError;
        }
      }

      return plan;
    },
    onSuccess: (plan) => {
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* Optional session draft. */
      }
      queryClient.invalidateQueries({ queryKey: ["team-week-plans", teamId] });
      toast.success(t("practice.weekPlanCreated"));
      navigate(
        `/teams/${teamId}/builder/${plan.id}${inviteAfter ? "?inviteAfter=1" : ""}`,
      );
    },
    onError: (error) => {
      setSaveError(
        "Your plan couldn’t be saved. Your choices are still here—please retry.",
      );
      logger.error("Save error", { error });
      toast.error(t("practice.failedToSavePlan"));
    },
  });

  if (teamLoading || authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <AppShell
      hideUserMenu={inviteAfter}
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              step === "customize" ? "Choose a different plan" : "Back to team"
            }
            onClick={() => {
              if (step === "customize") {
                setStep("theme");
              } else {
                navigate(`/teams/${teamId}${inviteAfter ? "" : "/builder"}`);
              }
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-lg font-bold">
              {step === "theme"
                ? inviteAfter
                  ? "Start a program"
                  : t("practice.newWeekPlan")
                : t("practice.customizeWeek")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {format(startDate, "MMM d")} –{" "}
              {format(addDays(startDate, 6), "MMM d")}
            </p>
          </div>
        </div>
      }
    >
      <PageContainer className={inviteAfter ? "max-w-3xl pb-28" : undefined}>
        {inviteAfter ? (
          <div className="space-y-6">
            <ProgramProgress step={1} />
            <div className="text-center">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
                {team?.name}
              </p>
              <h2 className="font-display text-3xl font-black">
                {step === "theme"
                  ? "A good week starts with a plan"
                  : "Your week at a glance"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {step === "theme"
                  ? "Pick a starting point. You can change every day."
                  : "A starting point, not a rulebook. Make it yours next."}
              </p>
              {step === "customize" && (
                <p className="mt-3 text-xs font-semibold text-primary">
                  {
                    WEEK_THEMES.find((theme) => theme.id === selectedTheme)
                      ?.title
                  }{" "}
                  ·{" "}
                  {
                    weekPlan.filter((day) => day.template.id !== "rest_day")
                      .length
                  }{" "}
                  training days
                </p>
              )}
            </div>
            {step === "theme" ? (
              <>
                <ProgramPlans onSelect={handleThemeSelect} />
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setTemplatePickerOpen(true)}
                >
                  Browse more templates
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-white/10 bg-card p-4">
                  <Label htmlFor="program-start">Starts</Label>
                  <Input
                    id="program-start"
                    className="mt-2 min-h-12"
                    type="date"
                    value={format(startDate, "yyyy-MM-dd")}
                    onChange={(e) => {
                      if (e.target.value)
                        setStartDate(parseISO(e.target.value));
                    }}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Seven days, through {format(addDays(startDate, 6), "MMM d")}
                    . Families see the plan after you publish.
                  </p>
                </div>
                <ProgramWeek
                  days={weekPlan.map((day) => ({
                    date: format(
                      addDays(startDate, day.dayIndex),
                      "yyyy-MM-dd",
                    ),
                    title: day.template.title,
                    tasks: getTasksForDay(day.template.id).map((task) => ({
                      label: task.label,
                      task_type: task.type,
                      shots_expected: task.shots,
                    })),
                  }))}
                />
                {saveError && (
                  <p role="alert" className="text-sm text-destructive">
                    {saveError}
                  </p>
                )}
                <ProgramAction
                  label="Customize this plan"
                  onClick={() => saveMutation.mutate()}
                  busy={saveMutation.isPending}
                  disabled={!weekPlan.some((d) => d.template.id !== "rest_day")}
                />
              </>
            )}
          </div>
        ) : step === "theme" ? (
          <>
            {/* Question */}
            <div className="text-center py-4">
              <h2 className="text-xl font-bold text-foreground mb-2">
                {inviteAfter
                  ? "Start with a ready-made week"
                  : t("practice.whatDoYouWantToWorkOn")}
              </h2>
              <p className="text-muted-foreground">
                {inviteAfter
                  ? "Pick a focus. Review the days, then make it yours."
                  : t("practice.pickFocusAndWellSetUpYourWeek")}
              </p>
            </div>

            {/* Start from template */}
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => setTemplatePickerOpen(true)}
            >
              <LayoutTemplate className="w-5 h-5 mr-2" />
              {inviteAfter
                ? "Browse more templates"
                : t("templates.startFromTemplate")}
            </Button>

            {/* Theme Cards */}
            <div className="grid grid-cols-1 gap-3">
              {WEEK_THEMES.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  id={theme.id}
                  title={theme.title}
                  description={theme.description}
                  icon={theme.icon}
                  gradient={theme.gradient}
                  tag={"tag" in theme ? theme.tag : undefined}
                  selected={selectedTheme === theme.id}
                  onClick={() => handleThemeSelect(theme.id)}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Week Grid */}
            <div className="space-y-3">
              {dayNames.slice(0, 7).map((dayName, index) => {
                const dayPlan = weekPlan.find((d) => d.dayIndex === index);

                if (dayPlan) {
                  return (
                    <DayCardPreview
                      key={index}
                      dayName={dayName}
                      template={dayPlan.template}
                      onSwap={() => handleSwapDay(index)}
                      onDelete={() => handleDeleteDay(index)}
                      onClick={() => handleSwapDay(index)}
                    />
                  );
                }

                return (
                  <DayCardEmpty
                    key={index}
                    dayName={dayName}
                    onAdd={() => handleAddDay(index)}
                  />
                );
              })}
            </div>

            {/* Save Button */}
            <div className="pt-4 pb-8">
              <Button
                className="w-full"
                size="lg"
                onClick={() => saveMutation.mutate()}
                disabled={
                  saveMutation.isPending ||
                  weekPlan.filter((d) => d.template.id !== "rest_day")
                    .length === 0
                }
              >
                {saveMutation.isPending ? (
                  t("common.saving")
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    {t("solo.saveWeekPlan")}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </PageContainer>

      {/* Day Picker Sheet */}
      <DayPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleDaySelect}
        title={
          editingDayIndex !== null
            ? `${dayNames[editingDayIndex]} - ${t("solo.chooseType")}`
            : t("solo.chooseDayType")
        }
      />

      {/* Program Template Picker */}
      {user && teamId && (
        <TemplatePicker
          teamId={teamId}
          userId={user.id}
          ageDivision={
            (team as { age_division?: string | null } | undefined)
              ?.age_division ?? null
          }
          level={(team as { level?: string | null } | undefined)?.level ?? null}
          open={templatePickerOpen}
          onOpenChange={setTemplatePickerOpen}
          onDone={() => {
            if (inviteAfter)
              toast.success(
                "Drafts ready to review. Publish them before inviting families.",
              );
            navigate(`/teams/${teamId}/practice`);
          }}
        />
      )}
    </AppShell>
  );
};

export default WeekPlannerNew;
