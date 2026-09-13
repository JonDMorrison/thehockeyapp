import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/app/Toast";
import {
  Loader2,
  ChevronLeft,
  Target,
  Dumbbell,
  Heart,
  Zap,
  Calendar,
  ArrowRight,
  Sparkles
} from "lucide-react";

const DAYS_OPTIONS = [3, 4, 5, 6, 7];

const playerSchema = z.object({
  first_name: z.string().trim().min(1, "Name is required").max(50),
  birth_year: z.number().int().min(2000).max(new Date().getFullYear()),
});

const SoloSetup: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const TRAINING_FOCUSES = [
    { id: "shooting", label: t('solo.focusLabelShooting'), icon: Target, description: t('solo.focusDescShooting') },
    { id: "conditioning", label: t('solo.focusLabelConditioning'), icon: Dumbbell, description: t('solo.focusDescConditioning') },
    { id: "mobility", label: t('solo.focusLabelMobility'), icon: Heart, description: t('solo.focusDescMobility') },
    { id: "skills", label: t('solo.focusLabelSkills'), icon: Zap, description: t('solo.focusDescSkills') },
  ];

  const [step, setStep] = useState<"player" | "focus" | "schedule">("player");
  const [firstName, setFirstName] = useState("");
  const [birthYear, setBirthYear] = useState(new Date().getFullYear() - 12);
  const [selectedFocuses, setSelectedFocuses] = useState<string[]>(["shooting", "conditioning"]);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adultAcknowledged, setAdultAcknowledged] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Prefill name from user metadata
  useEffect(() => {
    if (user?.user_metadata?.display_name) {
      const name = user.user_metadata.display_name.split(" ")[0];
      setFirstName(name);
    }
  }, [user]);

  const createSoloPlayer = useMutation({
    mutationFn: async () => {
      // Validate
      const validation = playerSchema.safeParse({ first_name: firstName, birth_year: birthYear });
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      if (!adultAcknowledged) throw new Error("An adult must confirm responsibility for this profile.");
      const { data, error } = await supabase.rpc("create_solo_player_with_plan", {
        p_first_name: firstName.trim(),
        p_birth_year: birthYear,
        p_training_focus: selectedFocuses,
        p_days_per_week: daysPerWeek,
      });
      if (error) throw error;
      const player = data as unknown as { player_id?: string; first_name?: string };
      if (!player.player_id) throw new Error("Player profile was not created");
      return { id: player.player_id, first_name: player.first_name || firstName.trim() };
    },
    onSuccess: (player) => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success(t('solo.allSet'), t('solo.soloTrainingReady'));
      navigate(`/solo/dashboard/${player.id}`);
    },
    onError: (error: Error) => {
      toast.error(t('solo.setupFailed'), error.message);
    },
  });

  const toggleFocus = (focusId: string) => {
    setSelectedFocuses((prev) =>
      prev.includes(focusId)
        ? prev.filter((f) => f !== focusId)
        : [...prev, focusId]
    );
  };

  const handleNext = () => {
    if (step === "player") {
      const validation = playerSchema.safeParse({ first_name: firstName, birth_year: birthYear });
      if (!validation.success) {
        setErrors({ first_name: validation.error.errors[0].message });
        return;
      }
      if (!adultAcknowledged) {
        setErrors({ adult: "An adult must confirm responsibility for this profile." });
        return;
      }
      setErrors({});
      setStep("focus");
    } else if (step === "focus") {
      if (selectedFocuses.length === 0) {
        toast.error(t('solo.selectAtLeastOneFocus'), t('solo.pickWhatYouWantToWorkOn'));
        return;
      }
      setStep("schedule");
    } else {
      createSoloPlayer.mutate();
    }
  };

  const handleBack = () => {
    if (step === "focus") setStep("player");
    else if (step === "schedule") setStep("focus");
    else navigate("/welcome");
  };

  const currentYear = new Date().getFullYear();
  const birthYears = Array.from({ length: 20 }, (_, i) => currentYear - 5 - i);

  const stepNumber = step === "player" ? 1 : step === "focus" ? 2 : 3;

  // Show loading state while auth is checking
  if (authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  // If not authenticated, render nothing while redirect happens
  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={handleBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <p className="text-sm font-semibold">{t('solo.trainOnMyOwn')}</p>
            <p className="text-xs text-muted-foreground">{t('solo.stepNOf3', { n: stepNumber })}</p>
          </div>
        </div>
      }
    >
      <PageContainer className="pb-32">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= stepNumber ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === "player" && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">{t('solo.letsPersonalizeYourTraining')}</h1>
              <p className="text-muted-foreground">
                {t('solo.createCustomPlanForYou')}
              </p>
            </div>

            <AppCard>
              <AppCardTitle className="text-lg mb-4">{t('solo.aboutYou')}</AppCardTitle>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('solo.firstName')}</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('solo.yourFirstName')}
                    className={errors.first_name ? "border-destructive" : ""}
                    autoFocus
                  />
                  {errors.first_name && (
                    <p className="text-xs text-destructive">{errors.first_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthYear">{t('solo.birthYear')}</Label>
                  <select
                    id="birthYear"
                    value={birthYear}
                    onChange={(e) => setBirthYear(parseInt(e.target.value))}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {birthYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
                  <Checkbox
                    checked={adultAcknowledged}
                    onCheckedChange={(checked) => setAdultAcknowledged(checked === true)}
                    className="mt-0.5"
                  />
                  <span>I am 18 or older and I am creating this profile for myself or a player I am authorized to manage.</span>
                </label>
                {errors.adult && <p className="text-xs text-destructive">{errors.adult}</p>}
              </div>
            </AppCard>
          </div>
        )}

        {step === "focus" && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">{t('solo.whatDoYouWantToWorkOn')}</h1>
              <p className="text-muted-foreground">
                {t('solo.selectAllThatApply')}
              </p>
            </div>

            <div className="grid gap-3">
              {TRAINING_FOCUSES.map((focus) => {
                const isSelected = selectedFocuses.includes(focus.id);
                const Icon = focus.icon;

                return (
                  <button
                    key={focus.id}
                    onClick={() => toggleFocus(focus.id)}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isSelected ? "bg-primary text-white" : "bg-muted"
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{focus.label}</p>
                        <p className="text-sm text-muted-foreground">{focus.description}</p>
                      </div>
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === "schedule" && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">{t('solo.howOftenCanYouTrain')}</h1>
              <p className="text-muted-foreground">
                {t('solo.pickRealisticNumber')}
              </p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {DAYS_OPTIONS.map((days) => (
                <button
                  key={days}
                  onClick={() => setDaysPerWeek(days)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    daysPerWeek === days
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <p className="text-2xl font-bold">{days}</p>
                  <p className="text-xs text-muted-foreground">{t('solo.days')}</p>
                </button>
              ))}
            </div>

            <AppCard className="bg-primary/5 border-primary/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{t('solo.yourPlanAtAGlance')}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {daysPerWeek} {t('solo.trainingDaysPerWeekFocusingOn')}{" "}
                    {selectedFocuses.map((f, i) => {
                      const focus = TRAINING_FOCUSES.find((tf) => tf.id === f);
                      if (i === selectedFocuses.length - 1 && selectedFocuses.length > 1) {
                        return `and ${focus?.label.toLowerCase()}`;
                      }
                      return i === 0 ? focus?.label.toLowerCase() : `, ${focus?.label.toLowerCase()}`;
                    }).join("")}.
                  </p>
                </div>
              </div>
            </AppCard>
          </div>
        )}
      </PageContainer>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border">
        <Button
          size="xl"
          className="w-full bg-primary hover:bg-primary text-white"
          onClick={handleNext}
          disabled={createSoloPlayer.isPending}
        >
          {createSoloPlayer.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : step === "schedule" ? (
            <>
              {t('solo.startTraining')}
              <Sparkles className="w-5 h-5" />
            </>
          ) : (
            <>
              {t('solo.continue')}
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </AppShell>
  );
};

export default SoloSetup;
