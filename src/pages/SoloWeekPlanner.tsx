import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfWeek } from "date-fns";
import { ChevronLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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

export default function SoloWeekPlanner() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  // Fetch player
  const { data: player, isLoading } = useQuery({
    queryKey: ['player', playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, first_name, owner_user_id')
        .eq('id', playerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!playerId,
  });

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
      setWeekPlan(prev => prev.map(day => 
        day.dayIndex === editingDayIndex ? { ...day, template } : day
      ));
    } else {
      setWeekPlan(prev => [...prev, {
        dayIndex: editingDayIndex,
        dayName: dayNames[editingDayIndex],
        date: format(addDays(startDate, editingDayIndex), "yyyy-MM-dd"),
        template,
      }].sort((a, b) => a.dayIndex - b.dayIndex));
    }
    
    setEditingDayIndex(null);
  };

  // Save mutation - creates personal practice cards for each day
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!player) throw new Error("Missing player");

      // Create practice cards for each day
      for (const day of weekPlan) {
        if (day.template.id === "rest_day") continue;

        const { data: card, error: cardError } = await supabase
          .from("personal_practice_cards")
          .insert({
            player_id: playerId,
            date: day.date,
            title: day.template.title,
            notes: day.template.subtitle,
            tier: "rep",
            mode: "normal",
          })
          .select()
          .single();

        if (cardError) throw cardError;

        // Insert tasks
        const tasks = getTasksForDay(day.template.id);
        if (tasks.length > 0) {
          const taskInserts = tasks.map((task, index) => ({
            personal_practice_card_id: card.id,
            label: task.label,
            task_type: task.type,
            sort_order: index,
            shots_expected: task.shots || null,
            target_value: task.minutes || task.reps || null,
            target_type: task.minutes ? "minutes" : task.reps ? "reps" : "none",
            is_required: task.isRequired || false,
          }));

          const { error: tasksError } = await supabase
            .from("personal_practice_tasks")
            .insert(taskInserts);

          if (tasksError) throw tasksError;
        }
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["solo-dashboard", playerId] });
      toast.success("Week plan created!");
      navigate(`/solo/dashboard/${playerId}`);
    },
    onError: (error: Error) => {
      console.error("Save error:", error);
      toast.error("Failed to save plan");
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="p-5 space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                if (step === "customize") {
                  setStep("theme");
                } else {
                  navigate(`/solo/planning/${playerId}`);
                }
              }}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">
                {step === "theme" ? "Weekly Routine" : "Customize Week"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {format(startDate, "MMM d")} – {format(addDays(startDate, 6), "MMM d")}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-6">
          {step === "theme" ? (
            <>
              {/* Question */}
              <div className="text-center py-4">
                <h2 className="text-xl font-bold text-foreground mb-2">
                  What do you want to focus on?
                </h2>
                <p className="text-muted-foreground">
                  Pick a theme and we'll set up your week
                </p>
              </div>

              {/* Theme Cards */}
              <div className="grid grid-cols-1 gap-3 mt-4">
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
              <div className="pt-6 pb-8">
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
        </div>

        {/* Day Picker Sheet */}
        <DayPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={handleDaySelect}
          title={editingDayIndex !== null ? `${dayNames[editingDayIndex]} - Choose type` : "Choose day type"}
        />
      </div>
    </AppShell>
  );
}
