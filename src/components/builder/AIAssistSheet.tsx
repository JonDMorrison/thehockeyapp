import { useTranslation } from 'react-i18next';
import React, { useState } from "react";
import { logger } from "@/core";
import type { AIGeneratedDraft } from "@/core";
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
  onApply: (data: AIGeneratedDraft) => void;
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
  const { t } = useTranslation();

  const focusOptions = [
    { id: "shooting_volume", label: t('practice.focusShootingVolume'), icon: Target },
    { id: "quick_release", label: t('practice.focusQuickRelease'), icon: Timer },
    { id: "backhand", label: t('practice.focusBackhandReps'), icon: Target },
    { id: "conditioning", label: t('practice.focusLightConditioning'), icon: Dumbbell },
    { id: "mobility", label: t('practice.focusMobilityWork'), icon: Heart },
    { id: "recovery", label: t('practice.focusRecoveryFocus'), icon: Heart },
  ];

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
        throw new Error(t('solo.sessionExpiredSignIn'));
      }

      const payload: Record<string, unknown> = {
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
          throw new Error(t('solo.sessionExpiredRefresh'));
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);

      return data.data;
    },
    onSuccess: (data) => {
      setGeneratedData(data);
      toast.success(t('practice.draftGenerated'), t('practice.reviewAndApplyWhenReady'));
    },
    onError: (error: Error) => {
      logger.error("AI generation error", { error });
      const isAuthError = error.message?.includes("session") || error.message?.includes("sign in");
      toast.error(
        isAuthError ? t('solo.sessionExpired') : t('practice.generationFailed'),
        error.message || t('practice.couldNotGenerateDraft')
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
                      : t('practice.completeTask')}
                    {task.shots_expected ? ` • ${task.shots_expected} shots` : ""}
                  </p>
                </div>
                {!task.is_required && (
                  <Tag variant="neutral" size="sm">{t('common.optional')}</Tag>
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
            <p className="text-sm text-text-muted">{t('practice.nDaysPlanned', { n: data.days.length })}</p>
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
                    {t('practice.nTasksCount', { n: day.tasks.length })} • ~{day.estimated_minutes} min
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
            {t('practice.aiAssist')}
          </SheetTitle>
          <SheetDescription>
            {mode === "day_card"
              ? t('practice.generateDayCardDraftForReview')
              : t('practice.generateWeekPlanDraftForReview')}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Show preview if generated */}
          {generatedData ? (
            <>
              <AppCard>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <AppCardTitle className="text-base">{t('practice.generatedDraft')}</AppCardTitle>
                </div>
                {renderPreview()}
              </AppCard>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleReset}>
                  {t('practice.generateNew')}
                </Button>
                <Button className="flex-1" onClick={handleApply}>
                  {t('practice.applyDraft')}
                </Button>
              </div>
            </>
          ) : generateMutation.isPending ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
              <div className="text-center text-sm text-text-muted">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                {t('practice.generatingYourDraft')}
              </div>
            </div>
          ) : (
            <>
              {/* Tier Selection */}
              <div>
                <Label className="text-sm font-medium">{t('practice.trainingTier')}</Label>
                <Select value={tier} onValueChange={(v) => setTier(v as any)}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rec">{t('practice.tierRecDesc')}</SelectItem>
                    <SelectItem value="rep">{t('practice.tierRepDesc')}</SelectItem>
                    <SelectItem value="elite">{t('practice.tierEliteDesc')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Time Budget */}
              <div>
                <Label className="text-sm font-medium">{t('practice.timeBudget')}</Label>
                <Select
                  value={timeBudget.toString()}
                  onValueChange={(v) => setTimeBudget(parseInt(v))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">{t('practice.nMinutes', { n: 15 })}</SelectItem>
                    <SelectItem value="25">{t('practice.nMinutes', { n: 25 })}</SelectItem>
                    <SelectItem value="35">{t('practice.nMinutes', { n: 35 })}</SelectItem>
                    <SelectItem value="45">{t('practice.nMinutes', { n: 45 })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Days per week (week plan only) */}
              {mode === "week_plan" && (
                <div>
                  <Label className="text-sm font-medium">{t('practice.daysPerWeek')}</Label>
                  <Select
                    value={daysPerWeek.toString()}
                    onValueChange={(v) => setDaysPerWeek(parseInt(v))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">{t('practice.nDays', { n: 3 })}</SelectItem>
                      <SelectItem value="4">{t('practice.nDays', { n: 4 })}</SelectItem>
                      <SelectItem value="5">{t('practice.nDays', { n: 5 })}</SelectItem>
                      <SelectItem value="6">{t('practice.nDays', { n: 6 })}</SelectItem>
                      <SelectItem value="7">{t('practice.nDays', { n: 7 })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Focus Areas */}
              <div>
                <Label className="text-sm font-medium mb-3 block">{t('practice.focusAreasOptional')}</Label>
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
                  <p className="text-sm font-medium">{t('practice.keepItSimple')}</p>
                  <p className="text-xs text-text-muted">{t('practice.threeTo5TasksPerDay')}</p>
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
                {t('practice.generateDraft')}
              </Button>

              <p className="text-xs text-text-muted text-center">
                {t('practice.aiContentIsAlwaysDraft')}
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
