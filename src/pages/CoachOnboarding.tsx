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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/app/Toast";
import {
  Loader2,
  ChevronLeft,
  Palette,
  Plus,
  Trash2,
  Users,
  LayoutTemplate,
  Sparkles,
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

interface RosterRow {
  first_name: string;
  last_initial: string;
  birth_year: string;
}

const emptyRow = (): RosterRow => ({ first_name: "", last_initial: "", birth_year: "" });

const TOTAL_STEPS = 3;

const CoachOnboarding: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — team
  const [teamName, setTeamName] = useState("");
  const [ageDivision, setAgeDivision] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [paletteId, setPaletteId] = useState("toronto");
  const [nameError, setNameError] = useState<string | null>(null);

  // Created team
  const [teamId, setTeamId] = useState<string | null>(null);

  // Step 2 — roster
  const [rows, setRows] = useState<RosterRow[]>([emptyRow()]);
  const [pasteText, setPasteText] = useState("");

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
      // Same core insert as TeamNew
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: trimmed,
          palette_id: paletteId,
          created_by_user_id: user!.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      const { error: roleError } = await supabase.from("team_roles").insert({
        team_id: team.id,
        user_id: user!.id,
        role: "head_coach",
      });

      if (roleError) throw roleError;

      // Tolerant update — columns may not exist until the migration is applied.
      if (ageDivision || level) {
        try {
          await supabase
            .from("teams")
            .update({
              age_division: ageDivision || null,
              level: level || null,
            })
            .eq("id", team.id);
        } catch {
          /* columns may not exist until migration applied; ignore */
        }
      }

      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setTeamId(team.id);
      setStep(2);
    } catch {
      toast.error(t("coachOnboarding.createTeamError"));
    } finally {
      setSubmitting(false);
    }
  };

  const updateRow = (index: number, key: keyof RosterRow, value: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [key]: value } : r))
    );
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (index: number) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const addFromPaste = () => {
    const parsed = pasteText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const tokens = line.split(/\s+/);
        return {
          first_name: tokens[0] || "",
          last_initial: (tokens[1] || "").slice(0, 1).toUpperCase(),
          birth_year: "",
        };
      });
    if (parsed.length === 0) return;
    setRows((prev) => {
      const existing = prev.filter((r) => r.first_name.trim());
      return [...existing, ...parsed];
    });
    setPasteText("");
  };

  const saveRoster = async () => {
    if (!teamId) {
      setStep(3);
      return;
    }
    const valid = rows.filter((r) => r.first_name.trim());
    if (valid.length === 0) {
      setStep(3);
      return;
    }
    setSubmitting(true);
    const defaultBirthYear = new Date().getFullYear() - 11;
    let failures = 0;

    for (const row of valid) {
      try {
        const birthYear = row.birth_year.trim()
          ? parseInt(row.birth_year, 10)
          : defaultBirthYear;

        const { data: player, error: playerError } = await supabase
          .from("players")
          .insert({
            owner_user_id: user!.id,
            first_name: row.first_name.trim(),
            last_initial: row.last_initial.trim() || null,
            birth_year: Number.isFinite(birthYear) ? birthYear : defaultBirthYear,
          })
          .select()
          .single();

        if (playerError || !player) {
          failures += 1;
          continue;
        }

        const { error: membershipError } = await supabase
          .from("team_memberships")
          .insert({
            team_id: teamId,
            player_id: player.id,
            status: "active",
          });

        if (membershipError) failures += 1;
      } catch {
        failures += 1;
      }
    }

    queryClient.invalidateQueries({ queryKey: ["team-dashboard", teamId] });
    setSubmitting(false);

    if (failures > 0) {
      toast.error(t("coachOnboarding.rosterPartialError", { count: failures }));
    }
    setStep(3);
  };

  const finish = () => {
    if (teamId) {
      navigate(`/teams/${teamId}?onboarding=true`);
    } else {
      navigate("/teams");
    }
  };

  const goToTemplate = () => {
    // TODO Phase 3: wire "Start from a template" to the template picker
    if (teamId) {
      navigate(`/teams/${teamId}/builder/new`);
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

        {/* STEP 2 — ROSTER */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <AppCardTitle className="text-xl flex items-center gap-2">
                <Users className="w-5 h-5 text-team-primary" />
                {t("coachOnboarding.step2Title")}
              </AppCardTitle>
              <AppCardDescription className="mt-1">
                {t("coachOnboarding.step2Subtitle")}
              </AppCardDescription>
            </div>

            <AppCard>
              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-start">
                    <div className="col-span-5 space-y-1">
                      {index === 0 && (
                        <Label className="text-xs">{t("coachOnboarding.rosterFirstName")}</Label>
                      )}
                      <Input
                        value={row.first_name}
                        onChange={(e) => updateRow(index, "first_name", e.target.value)}
                        placeholder="Jake"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      {index === 0 && (
                        <Label className="text-xs">{t("coachOnboarding.rosterLastInitial")}</Label>
                      )}
                      <Input
                        value={row.last_initial}
                        onChange={(e) =>
                          updateRow(index, "last_initial", e.target.value.slice(0, 1).toUpperCase())
                        }
                        maxLength={1}
                        placeholder="D"
                      />
                    </div>
                    <div className="col-span-4 space-y-1">
                      {index === 0 && (
                        <Label className="text-xs">{t("coachOnboarding.rosterBirthYearOptional")}</Label>
                      )}
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={row.birth_year}
                        onChange={(e) => updateRow(index, "birth_year", e.target.value)}
                        placeholder="2015"
                      />
                    </div>
                    <div className="col-span-1 flex items-end h-full">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className={index === 0 ? "mt-5" : ""}
                        onClick={() => removeRow(index)}
                        aria-label={t("coachOnboarding.removeRow")}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  <Plus className="w-4 h-4" />
                  {t("coachOnboarding.addRow")}
                </Button>
              </div>
            </AppCard>

            <AppCard>
              <Label className="text-sm font-medium">{t("coachOnboarding.pasteLabel")}</Label>
              <Textarea
                className="mt-2"
                rows={4}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={t("coachOnboarding.pastePlaceholder")}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={addFromPaste}
                disabled={!pasteText.trim()}
              >
                {t("coachOnboarding.pasteButton")}
              </Button>
            </AppCard>

            <div className="flex flex-col gap-3">
              <Button
                variant="team"
                size="xl"
                className="w-full"
                onClick={saveRoster}
                disabled={submitting}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
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
    </AppShell>
  );
};

export default CoachOnboarding;
