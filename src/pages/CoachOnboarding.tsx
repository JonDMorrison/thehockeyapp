import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { teamPalettes } from "@/lib/themes";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/app/Toast";
import { TemplatePicker } from "@/components/planning/TemplatePicker";
import {
  Loader2,
  ChevronLeft,
  Palette,
  Users,
  LayoutTemplate,
  Sparkles,
  Link2,
  Clipboard,
  ShieldCheck,
} from "lucide-react";

const AGE_DIVISIONS = ["U7", "U9", "U11", "U13", "U15", "U18", "Junior", "Other"] as const;
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
type CreateTeamResult = { success?: boolean; team_id?: string };
type TeamInviteResult = { success?: boolean; token?: string; error?: string };

const CoachOnboarding: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // Step 1 — team
  const [teamName, setTeamName] = useState("");
  const [ageDivision, setAgeDivision] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [paletteId, setPaletteId] = useState("toronto");
  const [nameError, setNameError] = useState<string | null>(null);

  // Created team
  const [teamId, setTeamId] = useState<string | null>(null);

  // Step 2 — parent-led roster invitation
  const [familyInviteLink, setFamilyInviteLink] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const selectedPalette = teamPalettes.find((p) => p.id === paletteId);

  const handleCreateTeam = async () => {
    const trimmed = teamName.trim();
    if (!trimmed) {
      setNameError(t("coachOnboarding.teamNameRequired"));
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

      queryClient.invalidateQueries({ queryKey: ["teams"] });
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
      const { data, error } = await supabase.rpc("regenerate_team_invite", { p_team_id: teamId });
      if (error) throw error;
      const result = data as unknown as TeamInviteResult;
      if (!result.success || !result.token) throw new Error(result.error || "Invite could not be created");
      setFamilyInviteLink(`${window.location.origin}/join/${result.token}`);
      toast.success("Family invite ready", "Share this secure link with parents and guardians.");
    } catch (error) {
      toast.error("Could not create family invite", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSubmitting(false);
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
        (user.user_metadata?.display_name as string | undefined)?.split(" ")[0] ||
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
      navigate(`/teams/${teamId}?onboarding=true`);
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
      navigate(`/teams/${teamId}?onboarding=true`);
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
      header={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => (step > 1 && !teamId ? setStep(step - 1) : navigate("/welcome"))}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <PageHeader title={t("welcome.roleSelect.coachTitle")} />
        </div>
      }
    >
      <PageContainer className="space-y-6">
        {/* Progress indicator */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("coachOnboarding.stepLabel", { current: step, total: TOTAL_STEPS })}
          </p>
          <div className="flex gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i < step ? "bg-team-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1 — TEAM */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <AppCardTitle className="text-xl">{t("coachOnboarding.step1Title")}</AppCardTitle>
              <AppCardDescription className="mt-1">
                {t("coachOnboarding.step1Subtitle")}
              </AppCardDescription>
            </div>

            <AppCard>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teamName">{t("coachOnboarding.teamNameLabel")}</Label>
                  <Input
                    id="teamName"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder={t("coachOnboarding.teamNamePlaceholder")}
                    className={nameError ? "border-destructive" : ""}
                    autoFocus
                  />
                  {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("coachOnboarding.ageDivisionLabel")}</Label>
                    <Select value={ageDivision} onValueChange={setAgeDivision}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("coachOnboarding.ageDivisionPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {AGE_DIVISIONS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {t(`coachOnboarding.ageDivision.${AGE_DIVISION_KEYS[d]}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("coachOnboarding.levelLabel")}</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("coachOnboarding.levelPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => (
                          <SelectItem key={l} value={l}>
                            {t(`coachOnboarding.level.${LEVEL_KEYS[l]}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </AppCard>

            <AppCard>
              <AppCardTitle className="text-lg flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4 text-team-primary" />
                {t("coachOnboarding.colorsLabel")}
              </AppCardTitle>
              <div className="space-y-4">
                <Select value={paletteId} onValueChange={setPaletteId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teamPalettes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPalette && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-lg shadow-sm"
                      style={{ backgroundColor: `hsl(${selectedPalette.primary})` }}
                    />
                    <div
                      className="w-10 h-10 rounded-lg shadow-sm border"
                      style={{ backgroundColor: `hsl(${selectedPalette.secondary})` }}
                    />
                    <div
                      className="w-10 h-10 rounded-lg shadow-sm"
                      style={{ backgroundColor: `hsl(${selectedPalette.tertiary})` }}
                    />
                    <span className="text-sm text-text-muted ml-2">
                      {selectedPalette.displayName}
                    </span>
                  </div>
                )}
              </div>
            </AppCard>

            <Button
              variant="team"
              size="xl"
              className="w-full"
              onClick={handleCreateTeam}
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("coachOnboarding.continue")}
            </Button>
          </div>
        )}

        {/* STEP 2 — INVITE FAMILIES */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <AppCardTitle className="text-xl flex items-center gap-2">
                <Users className="w-5 h-5 text-team-primary" />
                Invite your families
              </AppCardTitle>
              <AppCardDescription className="mt-1">
                Parents create and manage their player profile, then join your roster in about a minute.
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
                    Each family confirms that they are authorized to manage the player. Your team roster fills automatically when they join.
                  </AppCardDescription>
                </div>
              </div>

              {familyInviteLink ? (
                <button
                  type="button"
                  onClick={copyFamilyInvite}
                  className="mt-5 flex w-full items-center gap-3 rounded-xl border border-primary/25 bg-background/70 p-3 text-left"
                >
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{familyInviteLink}</span>
                  <Clipboard className="h-4 w-4 shrink-0 text-primary" />
                </button>
              ) : (
                <Button type="button" variant="team" className="mt-5 w-full" onClick={createFamilyInvite} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  Create family invite
                </Button>
              )}
            </AppCard>

            <div className="flex items-start gap-3 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
              <p className="text-sm leading-6 text-muted-foreground">
                This parent-led setup keeps children’s accounts, consent, and private photos under family control.
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
          <div className="space-y-6">
            <div>
              <AppCardTitle className="text-xl">{t("coachOnboarding.step3Title")}</AppCardTitle>
              <AppCardDescription className="mt-1">
                {t("coachOnboarding.step3Subtitle")}
              </AppCardDescription>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AppCard
                className="cursor-pointer hover:border-team-primary"
                onClick={goToTemplate}
              >
                <div className="flex flex-col items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-team-primary/10 flex items-center justify-center">
                    <LayoutTemplate className="w-6 h-6 text-team-primary" />
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

              <AppCard className="cursor-pointer hover:border-team-primary" onClick={goToAi}>
                <div className="flex flex-col items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-team-primary/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-team-primary" />
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
              <Button variant="team" size="xl" className="w-full" onClick={finish}>
                {t("coachOnboarding.finish")}
              </Button>
              <Button variant="ghost" className="w-full" onClick={finish}>
                {t("coachOnboarding.skipForNow")}
              </Button>
            </div>
          </div>
        )}
      </PageContainer>

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
