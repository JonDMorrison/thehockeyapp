import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveView } from "@/contexts/ActiveViewContext";
import { teamPalettes } from "@/lib/themes";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import {
  AppCard,
  AppCardTitle,
  AppCardDescription,
} from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import teamHuddleImage from "@/assets/brand/team-huddle-v2.jpg";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/app/Toast";
import { focusFirstInvalidField } from "@/lib/formValidation";
import { TemplatePicker } from "@/components/planning/TemplatePicker";
import {
  Loader2,
  ChevronLeft,
  ArrowRight,
  Check,
  Clock3,
  Users,
  LayoutTemplate,
  Sparkles,
  Link2,
  Clipboard,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";

const AGE_DIVISIONS = [
  "U7",
  "U9",
  "U11",
  "U13",
  "U15",
  "U18",
  "Junior",
  "Other",
] as const;
const LEVELS = ["AAA", "AA", "A", "Rep", "House", "Other"] as const;

const AGE_DIVISION_KEYS: Record<string, string> = {
  U7: "u7",
  U9: "u9",
  U11: "u11",
  U13: "u13",
  U15: "u15",
  U18: "u18",
  Junior: "junior",
  Other: "other",
};

const LEVEL_KEYS: Record<string, string> = {
  AAA: "aaa",
  AA: "aa",
  A: "a",
  Rep: "rep",
  House: "house",
  Other: "other",
};

const TOTAL_STEPS = 3;
const FEATURED_PALETTE_IDS = ["brand", "chicago", "vancouver", "toronto"];
const featuredPalettes = teamPalettes.filter((palette) =>
  FEATURED_PALETTE_IDS.includes(palette.id),
);
type CreateTeamResult = { success?: boolean; team_id?: string };
type TeamInviteResult = { success?: boolean; token?: string; error?: string };

const CoachOnboarding: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setActiveView, setActiveTeamId } = useActiveView();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // Step 1 — team
  const [teamName, setTeamName] = useState("");
  const [ageDivision, setAgeDivision] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [paletteId, setPaletteId] = useState("brand");
  const [nameError, setNameError] = useState<string | null>(null);

  // Created team
  const [teamId, setTeamId] = useState<string | null>(null);

  // Step 2 — parent-led roster invitation
  const [familyInviteLink, setFamilyInviteLink] = useState("");
  const [collectPlayerProfile, setCollectPlayerProfile] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const selectedPalette =
    teamPalettes.find((p) => p.id === paletteId) ?? teamPalettes[0];
  const progressSteps = [
    t("coachOnboarding.progress.team"),
    t("coachOnboarding.progress.families"),
    t("coachOnboarding.progress.firstWeek"),
  ];

  const handleCreateTeam = async () => {
    const trimmed = teamName.trim();
    if (!trimmed) {
      setNameError(t("coachOnboarding.teamNameRequired"));
      focusFirstInvalidField({ name: "required" }, { name: "teamName" });
      return;
    }
    setNameError(null);
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("create_team_with_owner", {
        p_name: trimmed,
        p_palette_id: paletteId,
        p_age_division: ageDivision || undefined,
        p_level: level || undefined,
      });
      if (error) throw error;
      const team = data as unknown as CreateTeamResult;
      if (!team.team_id) throw new Error("Team was not created");

      void queryClient.invalidateQueries({ queryKey: ["teams"] });
      void queryClient.invalidateQueries({ queryKey: ["user-coach-roles"] });
      void queryClient.invalidateQueries({ queryKey: ["welcome-check"] });
      setActiveView("coach");
      setActiveTeamId(team.team_id);
      setTeamId(team.team_id);
      setStep(2);
    } catch {
      toast.error(t("coachOnboarding.createTeamError"));
    } finally {
      setSubmitting(false);
    }
  };

  const createFamilyInvite = async () => {
    if (!teamId) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("regenerate_team_invite", {
        p_team_id: teamId,
      });
      if (error) throw error;
      const result = data as unknown as TeamInviteResult;
      if (!result.success || !result.token)
        throw new Error(result.error || "Invite could not be created");

      const { error: optionError } = await supabase
        .from("team_invites")
        .update({ collect_player_profile: collectPlayerProfile })
        .eq("team_id", teamId)
        .eq("status", "active");
      if (optionError) throw optionError;

      setFamilyInviteLink(`${window.location.origin}/join/${result.token}`);
      toast.success(
        "Family invite ready",
        "Share this secure link with parents and guardians.",
      );
    } catch (error) {
      toast.error(
        "Could not create family invite",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileCollectionChange = async (enabled: boolean) => {
    const previous = collectPlayerProfile;
    setCollectPlayerProfile(enabled);
    if (!teamId || !familyInviteLink) return;

    const { error } = await supabase
      .from("team_invites")
      .update({ collect_player_profile: enabled })
      .eq("team_id", teamId)
      .eq("status", "active");

    if (error) {
      setCollectPlayerProfile(previous);
      toast.error("Could not update invite", "Please try the profile toggle again.");
    }
  };

  const copyFamilyInvite = async () => {
    await navigator.clipboard.writeText(familyInviteLink);
    toast.success("Copied", "Family invite link copied.");
  };

  const sendCoachWelcomeEmail = async () => {
    if (!teamId || !user?.email) return;
    try {
      // Best-effort team code: read the latest active invite short_code.
      let teamCode = "";
      const { data: invite } = await supabase
        .from("team_invites")
        .select("short_code")
        .eq("team_id", teamId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      teamCode = invite?.short_code || "";

      const coachName =
        (user.user_metadata?.display_name as string | undefined)?.split(
          " ",
        )[0] ||
        (user.user_metadata?.display_name as string | undefined) ||
        user.email.split("@")[0];

      await supabase.functions.invoke("send-transactional-email", {
        body: {
          type: "coach_welcome",
          to: user.email,
          data: { coachName, teamName, teamCode, teamId },
        },
      });
    } catch {
      /* email is fire-and-forget; never block onboarding */
    }
  };

  const finish = () => {
    // Fire-and-forget welcome email — must never affect navigation.
    sendCoachWelcomeEmail().catch(() => {});
    if (teamId) {
      navigate(`/teams/${teamId}`);
    } else {
      navigate("/teams");
    }
  };

  const goToTemplate = () => {
    if (teamId) {
      setTemplatePickerOpen(true);
    } else {
      finish();
    }
  };

  const goToAi = () => {
    // Open the existing program builder / AI flow on the coach dashboard.
    if (teamId) {
      navigate(`/teams/${teamId}`);
    } else {
      finish();
    }
  };

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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppShell
      hideNav
      hideUserMenu
      header={
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("coachOnboarding.back")}
              onClick={() =>
                step > 1 && !teamId ? setStep(step - 1) : navigate("/welcome")
              }
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="h-6 w-px bg-border" aria-hidden="true" />
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-foreground sm:text-base">
                {t("coachOnboarding.headerTitle")}
              </p>
              <p className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-primary sm:block">
                {t("welcome.roleSelect.coachTitle")}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1.5 text-xs text-muted-foreground sm:flex">
            <Clock3 className="h-3.5 w-3.5 text-primary" />
            {t("coachOnboarding.estimatedTime")}
          </div>
        </div>
      }
    >
      <div className="relative min-h-full overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 performance-grid opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 top-0 h-[32rem] w-[32rem] rounded-full bg-primary/[0.07] blur-3xl"
        />
        <PageContainer className="relative max-w-5xl space-y-8 py-7 sm:py-10">
          {/* Progress indicator */}
          <nav
            aria-label={t("coachOnboarding.progressLabel")}
            className="rounded-xl border border-border/70 bg-card/60 px-4 py-3 shadow-subtle backdrop-blur-sm sm:px-5"
          >
            <ol className="grid grid-cols-3 gap-2 sm:gap-4">
              {progressSteps.map((label, index) => {
                const progressStep = index + 1;
                const isComplete = progressStep < step;
                const isCurrent = progressStep === step;

                return (
                  <li
                    key={label}
                    aria-current={isCurrent ? "step" : undefined}
                    className="relative flex items-center gap-2.5"
                  >
                    <span
                      className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold transition-colors sm:h-8 sm:w-8 ${
                        isComplete || isCurrent
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {isComplete ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        progressStep
                      )}
                    </span>
                    <span
                      className={
                        isCurrent
                          ? "text-xs font-semibold text-foreground sm:text-sm"
                          : "text-xs font-medium text-muted-foreground sm:text-sm"
                      }
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* STEP 1 — TEAM */}
          {step === 1 && (
            <section
              aria-labelledby="team-setup-title"
              className="animate-fade-up"
            >
              <div className="mb-6 max-w-2xl sm:mb-8">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                  {t("coachOnboarding.stepLabel", {
                    current: step,
                    total: TOTAL_STEPS,
                  })}
                </p>
                <h1
                  id="team-setup-title"
                  className="font-display text-3xl font-black tracking-[-0.035em] text-foreground sm:text-4xl"
                >
                  {t("coachOnboarding.step1Title")}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-text-secondary sm:text-base">
                  {t("coachOnboarding.step1Subtitle")}
                </p>
              </div>

              <form
                className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCreateTeam();
                }}
              >
                <AppCard
                  className="border-white/[0.09] bg-card/90"
                  contentClassName="p-5 sm:p-6"
                >
                  <div className="mb-6 border-b border-border/70 pb-4">
                    <AppCardTitle className="text-base">
                      {t("coachOnboarding.detailsTitle")}
                    </AppCardTitle>
                    <AppCardDescription className="mt-1">
                      {t("coachOnboarding.detailsSubtitle")}
                    </AppCardDescription>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label
                        htmlFor="teamName"
                        className="flex items-center justify-between gap-3"
                      >
                        <span>{t("coachOnboarding.teamNameLabel")}</span>
                        <span className="text-xs font-normal text-primary">
                          {t("coachOnboarding.required")}
                        </span>
                      </Label>
                      <Input
                        id="teamName"
                        value={teamName}
                        onChange={(event) => {
                          setTeamName(event.target.value);
                          if (nameError && event.target.value.trim()) {
                            setNameError(null);
                          }
                        }}
                        placeholder={t("coachOnboarding.teamNamePlaceholder")}
                        className={`h-14 bg-background/70 px-4 text-base ${
                          nameError ? "border-destructive" : "border-border/90"
                        }`}
                        aria-invalid={Boolean(nameError)}
                        aria-describedby={
                          nameError ? "team-name-error" : undefined
                        }
                        autoFocus
                      />
                      {nameError && (
                        <p
                          id="team-name-error"
                          role="alert"
                          className="text-xs text-destructive"
                        >
                          {nameError}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label
                          htmlFor="ageDivision"
                          className="flex items-center justify-between gap-3"
                        >
                          <span>{t("coachOnboarding.ageDivisionLabel")}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {t("coachOnboarding.optional")}
                          </span>
                        </Label>
                        <Select
                          value={ageDivision}
                          onValueChange={setAgeDivision}
                        >
                          <SelectTrigger
                            id="ageDivision"
                            className="h-12 bg-background/70 px-4"
                          >
                            <SelectValue
                              placeholder={t(
                                "coachOnboarding.ageDivisionPlaceholder",
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {AGE_DIVISIONS.map((division) => (
                              <SelectItem key={division} value={division}>
                                {t(
                                  `coachOnboarding.ageDivision.${AGE_DIVISION_KEYS[division]}`,
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="teamLevel"
                          className="flex items-center justify-between gap-3"
                        >
                          <span>{t("coachOnboarding.levelLabel")}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {t("coachOnboarding.optional")}
                          </span>
                        </Label>
                        <Select value={level} onValueChange={setLevel}>
                          <SelectTrigger
                            id="teamLevel"
                            className="h-12 bg-background/70 px-4"
                          >
                            <SelectValue
                              placeholder={t(
                                "coachOnboarding.levelPlaceholder",
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {LEVELS.map((teamLevel) => (
                              <SelectItem key={teamLevel} value={teamLevel}>
                                {t(
                                  `coachOnboarding.level.${LEVEL_KEYS[teamLevel]}`,
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </AppCard>

                <AppCard
                  className="overflow-hidden border-white/[0.09] bg-card/90 lg:row-span-2"
                  contentClassName="p-0"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={teamHuddleImage}
                      alt="Youth hockey team gathered around their coach"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#08090d] via-[#08090d]/30 to-black/10" />
                    <div
                      className="absolute inset-x-0 top-0 h-1"
                      style={{
                        backgroundColor: `hsl(${selectedPalette.primary})`,
                      }}
                    />
                    <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/80 backdrop-blur-md">
                      {t("coachOnboarding.previewLabel")}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="font-display text-xl font-black tracking-tight text-white">
                        {teamName.trim() ||
                          t("coachOnboarding.previewTeamName")}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/65">
                        <span>
                          {ageDivision || t("coachOnboarding.previewAge")}
                        </span>
                        <span
                          className="h-1 w-1 rounded-full bg-white/35"
                          aria-hidden="true"
                        />
                        <span>
                          {level || t("coachOnboarding.previewLevel")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <fieldset className="p-4">
                    <div className="mb-3">
                      <legend className="text-sm font-semibold text-foreground">
                        {t("coachOnboarding.colorsLabel")}
                      </legend>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {t("coachOnboarding.colorsSubtitle")}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {featuredPalettes.map((palette) => {
                        const isSelected = palette.id === paletteId;

                        return (
                          <button
                            key={palette.id}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => setPaletteId(palette.id)}
                            className={`flex min-h-11 items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border/80 bg-background/50 text-muted-foreground hover:border-white/25 hover:text-foreground"
                            }`}
                          >
                            <span
                              className="flex -space-x-1"
                              aria-hidden="true"
                            >
                              {[
                                palette.primary,
                                palette.secondary,
                                palette.tertiary,
                              ].map((color, colorIndex) => (
                                <span
                                  key={`${palette.id}-${colorIndex}`}
                                  className="h-4 w-4 rounded-full border border-black/30"
                                  style={{ backgroundColor: `hsl(${color})` }}
                                />
                              ))}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold">
                              {palette.id === "brand"
                                ? t("coachOnboarding.brandPaletteShort")
                                : palette.displayName}
                            </span>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <Label
                        htmlFor="allPalettes"
                        className="text-xs text-muted-foreground"
                      >
                        {t("coachOnboarding.allColorsLabel")}
                      </Label>
                      <Select value={paletteId} onValueChange={setPaletteId}>
                        <SelectTrigger
                          id="allPalettes"
                          className="h-10 bg-background/50"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {teamPalettes.map((palette) => (
                            <SelectItem key={palette.id} value={palette.id}>
                              {palette.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </fieldset>
                </AppCard>

                <div className="space-y-3 lg:col-start-1">
                  <Button
                    type="submit"
                    variant="team"
                    size="xl"
                    className="w-full justify-between px-5 sm:px-6"
                    disabled={submitting}
                  >
                    <span className="flex items-center gap-2">
                      {submitting && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {t("coachOnboarding.createAndContinue")}
                    </span>
                    {!submitting && <ArrowRight className="h-4 w-4" />}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    {t("coachOnboarding.nextStepHint")}
                  </p>
                </div>
              </form>
            </section>
          )}

          {/* STEP 2 — INVITE FAMILIES */}
          {step === 2 && (
            <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
              <div>
                <AppCardTitle className="text-xl flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Invite your families
                </AppCardTitle>
                <AppCardDescription className="mt-1">
                  Parents create and manage their player profile, then join your
                  roster in about a minute.
                </AppCardDescription>
              </div>

              <AppCard className="overflow-hidden border-primary/25 bg-gradient-to-br from-card to-primary/5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Link2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <AppCardTitle>One link builds the roster</AppCardTitle>
                    <AppCardDescription className="mt-1 leading-5">
                      Each family confirms that they are authorized to manage
                      the player. Your team roster fills automatically when they
                      join.
                    </AppCardDescription>
                  </div>
                </div>

                <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-background/60 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <ClipboardList className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label htmlFor="coach-collect-player-profile" className="font-semibold">
                      Collect player profiles
                    </Label>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Families will be asked for position, favourite player, hockey dream, what they love about hockey, and an optional photo after joining.
                    </p>
                  </div>
                  <Switch
                    id="coach-collect-player-profile"
                    checked={collectPlayerProfile}
                    onCheckedChange={handleProfileCollectionChange}
                    disabled={submitting}
                    aria-label="Collect player profiles with this invite"
                  />
                </div>

                {familyInviteLink ? (
                  <button
                    type="button"
                    onClick={copyFamilyInvite}
                    className="mt-5 flex w-full items-center gap-3 rounded-xl border border-primary/25 bg-background/70 p-3 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {familyInviteLink}
                    </span>
                    <Clipboard className="h-4 w-4 shrink-0 text-primary" />
                  </button>
                ) : (
                  <Button
                    type="button"
                    variant="team"
                    className="mt-5 w-full"
                    onClick={createFamilyInvite}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4" />
                    )}
                    Create family invite
                  </Button>
                )}
              </AppCard>

              <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm leading-6 text-muted-foreground">
                  This parent-led setup keeps children’s accounts, consent, and
                  private photos under family control.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  variant="team"
                  size="xl"
                  className="w-full"
                  onClick={() => setStep(3)}
                  disabled={submitting}
                >
                  {t("coachOnboarding.continue")}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep(3)}
                  disabled={submitting}
                >
                  {t("coachOnboarding.skipForNow")}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 — FIRST WEEK */}
          {step === 3 && (
            <div className="mx-auto max-w-3xl space-y-6 animate-fade-up">
              <div>
                <AppCardTitle className="text-xl">
                  {t("coachOnboarding.step3Title")}
                </AppCardTitle>
                <AppCardDescription className="mt-1">
                  {t("coachOnboarding.step3Subtitle")}
                </AppCardDescription>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AppCard
                  className="cursor-pointer hover:border-primary"
                  onClick={goToTemplate}
                >
                  <div className="flex flex-col items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <LayoutTemplate className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <AppCardTitle className="text-base">
                        {t("coachOnboarding.templateTitle")}
                      </AppCardTitle>
                      <AppCardDescription className="mt-1">
                        {t("coachOnboarding.templateDescription")}
                      </AppCardDescription>
                    </div>
                  </div>
                </AppCard>

                <AppCard
                  className="cursor-pointer hover:border-primary"
                  onClick={goToAi}
                >
                  <div className="flex flex-col items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <AppCardTitle className="text-base">
                        {t("coachOnboarding.aiTitle")}
                      </AppCardTitle>
                      <AppCardDescription className="mt-1">
                        {t("coachOnboarding.aiDescription")}
                      </AppCardDescription>
                    </div>
                  </div>
                </AppCard>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  variant="team"
                  size="xl"
                  className="w-full"
                  onClick={finish}
                >
                  {t("coachOnboarding.finish")}
                </Button>
                <Button variant="ghost" className="w-full" onClick={finish}>
                  {t("coachOnboarding.skipForNow")}
                </Button>
              </div>
            </div>
          )}
        </PageContainer>
      </div>

      {teamId && (
        <TemplatePicker
          teamId={teamId}
          userId={user!.id}
          ageDivision={ageDivision || null}
          level={level || null}
          open={templatePickerOpen}
          onOpenChange={setTemplatePickerOpen}
          onDone={finish}
        />
      )}
    </AppShell>
  );
};

export default CoachOnboarding;
