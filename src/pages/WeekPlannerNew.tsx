import React, { useState, useEffect, useMemo } from "react";
import { logger } from "@/core";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Check, Sparkles } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
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
import { DayCardPreview, DayCardEmpty } from "@/components/builder/DayCardPreview";
import { DayPicker } from "@/components/builder/DayPicker";

type Step = "theme" | "customize";

interface DayPlan {
  dayIndex: number;
  dayName: string;
  date: string;
  template: DayTemplate;
}

const WeekPlannerNew: React.FC = () => {
  const { id: teamId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  const [step, setStep] = useState<Step>("theme");
  const [selectedTheme, setSelectedTheme] = useState<WeekThemeId | null>(null);
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);

  // Calculate start date (next Monday)
  const startDate = useMemo(() => {
    return startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 });
  }, []);

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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
      const template = DAY_TEMPLATES.find(d => d.id === dayTemplateId)!;
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

  // Swap a day
  const handleSwapDay = (dayIndex: number) => {
    setEditingDayIndex(dayIndex);
    setPickerOpen(true);
  };

  // Delete a day (make it rest day)
  const handleDeleteDay = (dayIndex: number) => {
    const restDay = DAY_TEMPLATES.find(d => d.id === "rest_day")!;
    setWeekPlan(prev => prev.map(day => 
      day.dayIndex === dayIndex ? { ...day, template: restDay } : day
    ));
  };

  // Add a day
  const handleAddDay = (dayIndex: number) => {
    setEditingDayIndex(dayIndex);
    setPickerOpen(true);
  };

  // Select a new day template
  const handleDaySelect = (template: DayTemplate) => {
    if (editingDayIndex === null) return;
    
    const existingDay = weekPlan.find(d => d.dayIndex === editingDayIndex);
    
    if (existingDay) {
      // Update existing day
      setWeekPlan(prev => prev.map(day => 
        day.dayIndex === editingDayIndex ? { ...day, template } : day
      ));
    } else {
      // Add new day
      setWeekPlan(prev => [...prev, {
        dayIndex: editingDayIndex,
        dayName: dayNames[editingDayIndex],
        date: format(addDays(startDate, editingDayIndex), "yyyy-MM-dd"),
        template,
      }].sort((a, b) => a.dayIndex - b.dayIndex));
    }
    
    setEditingDayIndex(null);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !teamId) throw new Error("Missing user or team");

      const theme = WEEK_THEMES.find(t => t.id === selectedTheme);
      
      // Create the week plan
      const { data: plan, error: planError } = await supabase
        .from("team_week_plans")
        .insert({
          team_id: teamId,
          created_by_user_id: user.id,
          name: theme?.title || "Week Plan",
          start_date: format(startDate, "yyyy-MM-dd"),
          status: "draft",
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create days and tasks
      for (const day of weekPlan) {
        if (day.template.id === "rest_day") continue;

        const { data: dayData, error: dayError } = await supabase
          .from("team_week_plan_days")
          .insert({
            team_week_plan_id: plan.id,
            date: day.date,
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
      queryClient.invalidateQueries({ queryKey: ["team-week-plans", teamId] });
      toast.success("Week plan created!");
      navigate(`/teams/${teamId}/builder/${plan.id}`);
    },
    onError: (error) => {
      logger.error("Save error", { error });
      toast.error("Failed to save plan");
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

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              if (step === "customize") {
                setStep("theme");
              } else {
                navigate(`/teams/${teamId}/builder`);
              }
            }}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">
              {step === "theme" ? "New Week Plan" : "Customize Week"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {format(startDate, "MMM d")} – {format(addDays(startDate, 6), "MMM d")}
            </p>
          </div>
        </div>
      }
    >
      <PageContainer>
        {step === "theme" ? (
          <>
            {/* Question */}
            <div className="text-center py-4">
              <h2 className="text-xl font-bold text-foreground mb-2">
                What do you want to work on?
              </h2>
              <p className="text-muted-foreground">
                Pick a focus and we'll set up your week
              </p>
            </div>

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
                const dayPlan = weekPlan.find(d => d.dayIndex === index);
                
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
                disabled={saveMutation.isPending || weekPlan.filter(d => d.template.id !== "rest_day").length === 0}
              >
                {saveMutation.isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Save Week Plan
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
        title={editingDayIndex !== null ? `${dayNames[editingDayIndex]} - Choose type` : "Choose day type"}
      />
    </AppShell>
  );
};

export default WeekPlannerNew;
