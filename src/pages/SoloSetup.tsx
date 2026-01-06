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

const TRAINING_FOCUSES = [
  { id: "shooting", label: "Shooting", icon: Target, description: "Wrist shots, snap shots, accuracy" },
  { id: "conditioning", label: "Conditioning", icon: Dumbbell, description: "Strength, endurance, agility" },
  { id: "mobility", label: "Mobility", icon: Heart, description: "Stretching, flexibility, recovery" },
  { id: "skills", label: "Skills", icon: Zap, description: "Stickhandling, puck control" },
];

const DAYS_OPTIONS = [3, 4, 5, 6, 7];

const playerSchema = z.object({
  first_name: z.string().trim().min(1, "Name is required").max(50),
  birth_year: z.number().int().min(2000).max(new Date().getFullYear()),
});

const SoloSetup: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [step, setStep] = useState<"player" | "focus" | "schedule">("player");
  const [firstName, setFirstName] = useState("");
  const [birthYear, setBirthYear] = useState(new Date().getFullYear() - 12);
  const [selectedFocuses, setSelectedFocuses] = useState<string[]>(["shooting", "conditioning"]);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

      // Create the player
      const { data: player, error: playerError } = await supabase
        .from("players")
        .insert({
          owner_user_id: user!.id,
          first_name: firstName.trim(),
          birth_year: birthYear,
          shoots: "unknown",
        })
        .select()
        .single();

      if (playerError) throw playerError;

      // Add as guardian
      const { error: guardianError } = await supabase
        .from("player_guardians")
        .insert({
          player_id: player.id,
          user_id: user!.id,
          guardian_role: "owner",
        });

      if (guardianError) throw guardianError;

      // Create personal training plan
      const { error: planError } = await supabase
        .from("personal_training_plans")
        .insert({
          player_id: player.id,
          name: "My Training Plan",
          training_focus: selectedFocuses,
          days_per_week: daysPerWeek,
          tier: "base",
          is_active: true,
        });

      if (planError) throw planError;

      return player;
    },
    onSuccess: (player) => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success("You're all set!", "Your solo training is ready to go.");
      navigate(`/solo/dashboard/${player.id}`);
    },
    onError: (error: Error) => {
      toast.error("Setup failed", error.message);
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
      setErrors({});
      setStep("focus");
    } else if (step === "focus") {
      if (selectedFocuses.length === 0) {
        toast.error("Select at least one focus", "Pick what you want to work on.");
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

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={handleBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <p className="text-sm font-semibold">Train On My Own</p>
            <p className="text-xs text-muted-foreground">Step {stepNumber} of 3</p>
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
                s <= stepNumber ? "bg-orange-500" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === "player" && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Let's personalize your training</h1>
              <p className="text-muted-foreground">
                We'll create a custom plan just for you.
              </p>
            </div>

            <AppCard>
              <AppCardTitle className="text-lg mb-4">About You</AppCardTitle>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Your first name"
                    className={errors.first_name ? "border-destructive" : ""}
                    autoFocus
                  />
                  {errors.first_name && (
                    <p className="text-xs text-destructive">{errors.first_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthYear">Birth Year</Label>
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
              </div>
            </AppCard>
          </div>
        )}

        {step === "focus" && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold mb-2">What do you want to work on?</h1>
              <p className="text-muted-foreground">
                Select all that apply. You can change these later.
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
                        ? "border-orange-500 bg-orange-500/5"
                        : "border-border bg-card hover:border-orange-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isSelected ? "bg-orange-500 text-white" : "bg-muted"
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
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold mb-2">How often can you train?</h1>
              <p className="text-muted-foreground">
                Pick a realistic number. Consistency beats intensity.
              </p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {DAYS_OPTIONS.map((days) => (
                <button
                  key={days}
                  onClick={() => setDaysPerWeek(days)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    daysPerWeek === days
                      ? "border-orange-500 bg-orange-500/5"
                      : "border-border bg-card hover:border-orange-500/50"
                  }`}
                >
                  <p className="text-2xl font-bold">{days}</p>
                  <p className="text-xs text-muted-foreground">days</p>
                </button>
              ))}
            </div>

            <AppCard className="bg-orange-500/5 border-orange-500/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Your plan at a glance</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {daysPerWeek} training days per week focusing on{" "}
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
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          onClick={handleNext}
          disabled={createSoloPlayer.isPending}
        >
          {createSoloPlayer.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : step === "schedule" ? (
            <>
              Start Training
              <Sparkles className="w-5 h-5" />
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </AppShell>
  );
};

export default SoloSetup;