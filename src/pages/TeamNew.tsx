import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
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
import { Loader2, ChevronLeft, Palette, AlertCircle, RefreshCw } from "lucide-react";

const teamSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").max(100),
  season_label: z.string().trim().max(50).optional(),
  palette_id: z.string(),
});

type TeamFormData = z.infer<typeof teamSchema>;

const TeamNew: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState<TeamFormData>({
    name: "",
    season_label: "",
    palette_id: "toronto",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const createTeam = useMutation({
    mutationFn: async (data: TeamFormData) => {
      // Create the team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: data.name.trim(),
          season_label: data.season_label?.trim() || null,
          palette_id: data.palette_id,
          created_by_user_id: user!.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add creator as head coach
      const { error: roleError } = await supabase
        .from("team_roles")
        .insert({
          team_id: team.id,
          user_id: user!.id,
          role: "head_coach",
        });

      if (roleError) throw roleError;

      return team;
    },
    onSuccess: (team) => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success(t("teams.new.toastSuccess"), `${team.name} ${t("teams.new.toastSuccessReady")}`);
      // Redirect to team home with onboarding flag
      navigate(`/teams/${team.id}?onboarding=true`);
    },
    onError: (error: Error) => {
      if (error.message.includes("row-level security") || error.message.includes("permission")) {
        setBackendError(t("teams.new.permissionsError"));
      } else {
        setBackendError(error.message);
      }
    },
  });

  const validate = () => {
    try {
      teamSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBackendError(null);
    if (!validate()) return;
    createTeam.mutate(formData);
  };

  const updateField = <K extends keyof TeamFormData>(key: K, value: TeamFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const selectedPalette = teamPalettes.find((p) => p.id === formData.palette_id);

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
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/teams")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <PageHeader title={t("teams.new.title")} />
        </div>
      }
    >
      <PageContainer>
        <form onSubmit={handleSubmit} className="space-y-6">
          <AppCard>
            <AppCardTitle className="text-lg mb-4">{t("teams.new.detailsTitle")}</AppCardTitle>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("teams.new.teamNameLabel")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                  placeholder="Toronto Hawks"
                  autoFocus
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="season_label">{t("teams.new.seasonLabel")}</Label>
                <Input
                  id="season_label"
                  value={formData.season_label}
                  onChange={(e) => updateField("season_label", e.target.value)}
                  placeholder="2024-25 · U12 Rep"
                />
              </div>
            </div>
          </AppCard>

          <AppCard>
            <AppCardTitle className="text-lg flex items-center gap-2 mb-1">
              <Palette className="w-4 h-4 text-team-primary" />
              {t("teams.new.colorsTitle")}
            </AppCardTitle>
            <AppCardDescription className="mb-4">
              {t("teams.new.colorsDescription")}
            </AppCardDescription>

            <div className="space-y-4">
              <Select
                value={formData.palette_id}
                onValueChange={(v) => updateField("palette_id", v)}
              >
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
                    title={t("teams.new.colorPrimary")}
                  />
                  <div
                    className="w-10 h-10 rounded-lg shadow-sm border"
                    style={{ backgroundColor: `hsl(${selectedPalette.secondary})` }}
                    title={t("teams.new.colorSecondary")}
                  />
                  <div
                    className="w-10 h-10 rounded-lg shadow-sm"
                    style={{ backgroundColor: `hsl(${selectedPalette.tertiary})` }}
                    title={t("teams.new.colorTertiary")}
                  />
                  <span className="text-sm text-text-muted ml-2">
                    {selectedPalette.displayName}
                  </span>
                </div>
              )}
            </div>
          </AppCard>

          {backendError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">{t("teams.new.errorTitle")}</p>
                  <p className="text-sm text-muted-foreground">{backendError}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-8">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBackendError(null);
                    createTeam.mutate(formData);
                  }}
                  disabled={createTeam.isPending}
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  {t("teams.new.tryAgain")}
                </Button>
                <a
                  href="https://lovable.dev/support"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {t("teams.new.contactSupport")}
                </a>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="team"
            size="xl"
            className="w-full"
            disabled={createTeam.isPending}
          >
            {createTeam.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("teams.new.submit")}
          </Button>
        </form>
      </PageContainer>
    </AppShell>
  );
};

export default TeamNew;
