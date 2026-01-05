import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { SkeletonCard } from "@/components/app/Skeleton";
import { toast } from "@/components/app/Toast";
import {
  Sparkles,
  Target,
  Dumbbell,
  Heart,
  Timer,
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface AIAssistSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  mode: "day_card" | "week_plan";
  date?: string; // for day_card
  startDate?: string; // for week_plan
  onApply: (data: any) => void;
}

interface GeneratedTask {
  task_type: string;
  label: string;
  target_type: string;
  target_value: number | null;
  shot_type: string;
  shots_expected: number | null;
  is_required: boolean;
}

interface GeneratedDayCard {
  title: string;
  notes?: string;
  tier: string;
  estimated_minutes: number;
  tasks: GeneratedTask[];
}

interface GeneratedWeekPlan {
  name: string;
  tier: string;
  start_date: string;
  days: Array<{
    date: string;
    title: string;
    notes?: string;
    estimated_minutes: number;
    tasks: GeneratedTask[];
  }>;
}

const focusOptions = [
  { id: "shooting_volume", label: "Shooting volume", icon: Target },
  { id: "quick_release", label: "Quick release", icon: Timer },
  { id: "backhand", label: "Backhand reps", icon: Target },
  { id: "conditioning", label: "Light conditioning", icon: Dumbbell },
  { id: "mobility", label: "Mobility work", icon: Heart },
  { id: "recovery", label: "Recovery focus", icon: Heart },
];

const taskTypeIcons: Record<string, React.ReactNode> = {
  shooting: <Target className="w-4 h-4" />,
  conditioning: <Dumbbell className="w-4 h-4" />,
  mobility: <Heart className="w-4 h-4" />,
  recovery: <Timer className="w-4 h-4" />,
  prep: <Sparkles className="w-4 h-4" />,
  other: <Clock className="w-4 h-4" />,
};

export const AIAssistSheet: React.FC<AIAssistSheetProps> = ({
  open,
  onOpenChange,
  teamId,
  mode,
  date,
  startDate,
  onApply,
}) => {
  const [tier, setTier] = useState<"rec" | "rep" | "elite">("rep");
  const [timeBudget, setTimeBudget] = useState<number>(25);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(5);
  const [selectedFocus, setSelectedFocus] = useState<string[]>([]);
  const [keepSimple, setKeepSimple] = useState(true);
  const [generatedData, setGeneratedData] = useState<GeneratedDayCard | GeneratedWeekPlan | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      // Verify session is valid before calling
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const payload: any = {
        type: mode,
        team_id: teamId,
        tier,
        time_budget: timeBudget,
        focus_areas: selectedFocus.length > 0 ? selectedFocus : undefined,
        keep_simple: keepSimple,
      };

      if (mode === "day_card") {
        payload.date = date;
      } else {
        payload.start_date = startDate;
        payload.days_per_week = daysPerWeek;
      }

      const { data, error } = await supabase.functions.invoke("generate-workout-ai", {
        body: payload,
      });

      if (error) {
        // Check for auth errors
        if (error.message?.includes("401") || error.message?.includes("JWT") || error.message?.includes("Invalid")) {
          throw new Error("Your session has expired. Please refresh and sign in again.");
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);

      return data.data;
    },
    onSuccess: (data) => {
      setGeneratedData(data);
      toast.success("Draft generated!", "Review and apply when ready.");
    },
    onError: (error: Error) => {
      console.error("AI generation error:", error);
      const isAuthError = error.message?.includes("session") || error.message?.includes("sign in");
      toast.error(
        isAuthError ? "Session Expired" : "Generation failed", 
        error.message || "Couldn't generate a draft right now. Try again."
      );
    },
  });

  const toggleFocus = (id: string) => {
    setSelectedFocus((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    if (generatedData) {
      onApply(generatedData);
      onOpenChange(false);
      setGeneratedData(null);
    }
  };

  const handleReset = () => {
    setGeneratedData(null);
  };

  const renderPreview = () => {
    if (!generatedData) return null;

    if (mode === "day_card") {
      const data = generatedData as GeneratedDayCard;
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{data.title}</p>
              <p className="text-sm text-text-muted">~{data.estimated_minutes} min</p>
            </div>
            <Tag variant="tier">{data.tier.toUpperCase()}</Tag>
          </div>

          {data.notes && (
            <p className="text-sm text-text-secondary italic">{data.notes}</p>
          )}

          <div className="space-y-2">
            {data.tasks.map((task, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-surface-muted"
              >
                <div className="text-team-primary">
                  {taskTypeIcons[task.task_type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.label}</p>
                  <p className="text-xs text-text-muted">
                    {task.target_type !== "none" && task.target_value
                      ? `${task.target_value} ${task.target_type}`
                      : "Complete task"}
                    {task.shots_expected ? ` • ${task.shots_expected} shots` : ""}
                  </p>
                </div>
                {!task.is_required && (
                  <Tag variant="neutral" size="sm">Optional</Tag>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Week plan preview
    const data = generatedData as GeneratedWeekPlan;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{data.name}</p>
            <p className="text-sm text-text-muted">{data.days.length} days planned</p>
          </div>
          <Tag variant="tier">{data.tier.toUpperCase()}</Tag>
        </div>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {data.days.map((day, i) => (
            <AppCard key={i} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{day.title}</p>
                  <p className="text-xs text-text-muted">
                    {day.tasks.length} tasks • ~{day.estimated_minutes} min
                  </p>
                </div>
                <Tag variant="neutral" size="sm">{day.date}</Tag>
              </div>
            </AppCard>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-team-primary" />
            AI Assist
          </SheetTitle>
          <SheetDescription>
            {mode === "day_card"
              ? "Generate a practice card draft for review"
              : "Generate a week plan draft for review"}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Show preview if generated */}
          {generatedData ? (
            <>
              <AppCard>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <AppCardTitle className="text-base">Generated Draft</AppCardTitle>
                </div>
                {renderPreview()}
              </AppCard>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleReset}>
                  Generate New
                </Button>
                <Button className="flex-1" onClick={handleApply}>
                  Apply Draft
                </Button>
              </div>
            </>
          ) : generateMutation.isPending ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
              <div className="text-center text-sm text-text-muted">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                Generating your draft...
              </div>
            </div>
          ) : (
            <>
              {/* Tier Selection */}
              <div>
                <Label className="text-sm font-medium">Training Tier</Label>
                <Select value={tier} onValueChange={(v) => setTier(v as any)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rec">Rec — Shorter, simpler</SelectItem>
                    <SelectItem value="rep">Rep — Balanced</SelectItem>
                    <SelectItem value="elite">Elite — Higher volume</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Budget */}
              <div>
                <Label className="text-sm font-medium">Time Budget</Label>
                <Select
                  value={timeBudget.toString()}
                  onValueChange={(v) => setTimeBudget(parseInt(v))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="25">25 minutes</SelectItem>
                    <SelectItem value="35">35 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Days per week (week plan only) */}
              {mode === "week_plan" && (
                <div>
                  <Label className="text-sm font-medium">Days per Week</Label>
                  <Select
                    value={daysPerWeek.toString()}
                    onValueChange={(v) => setDaysPerWeek(parseInt(v))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="4">4 days</SelectItem>
                      <SelectItem value="5">5 days</SelectItem>
                      <SelectItem value="6">6 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Focus Areas */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Focus Areas (optional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {focusOptions.map((option) => {
                    const isSelected = selectedFocus.includes(option.id);
                    return (
                      <div
                        key={option.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-team-primary bg-team-primary/5"
                            : "border-border hover:bg-surface-muted"
                        }`}
                        onClick={() => toggleFocus(option.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleFocus(option.id)}
                        />
                        <option.icon className="w-4 h-4 text-text-muted" />
                        <span className="text-sm">{option.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Keep Simple Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-muted">
                <div>
                  <p className="text-sm font-medium">Keep it simple</p>
                  <p className="text-xs text-text-muted">3-5 tasks per day</p>
                </div>
                <Switch checked={keepSimple} onCheckedChange={setKeepSimple} />
              </div>

              {/* Generate Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Draft
              </Button>

              <p className="text-xs text-text-muted text-center">
                AI-generated content is always a draft. Review before publishing.
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
