import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/app/Toast";
import { Loader2, ChevronLeft, AlertTriangle } from "lucide-react";

const playerSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(50),
  last_initial: z.string().trim().max(1).optional(),
  birth_year: z.number().int().min(2000).max(new Date().getFullYear()),
  shoots: z.enum(["left", "right", "unknown"]),
  jersey_number: z.string().trim().max(3).optional(),
  fav_nhl_city: z.string().trim().max(50).optional(),
  fav_nhl_player: z.string().trim().max(100).optional(),
  hockey_love: z.string().trim().max(500).optional(),
  season_goals: z.string().trim().max(500).optional(),
});

type PlayerFormData = z.infer<typeof playerSchema>;
type CreatePlayerResult = { success?: boolean; player_id?: string; first_name?: string };

const PlayerNew: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState<PlayerFormData>({
    first_name: "",
    last_initial: "",
    birth_year: new Date().getFullYear() - 10,
    shoots: "unknown",
    jersey_number: "",
    fav_nhl_city: "",
    fav_nhl_player: "",
    hockey_love: "",
    season_goals: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [adultAcknowledged, setAdultAcknowledged] = useState(false);
  const [photoSharingAllowed, setPhotoSharingAllowed] = useState(false);
  const [aiPersonalizationAllowed, setAiPersonalizationAllowed] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Check for duplicate players
  const { data: existingPlayers } = useQuery({
    queryKey: ["players-check", user?.id, formData.first_name, formData.birth_year],
    queryFn: async () => {
      if (!formData.first_name.trim()) return [];

      const { data } = await supabase
        .from("players")
        .select("id, first_name, birth_year")
        .eq("owner_user_id", user!.id)
        .ilike("first_name", formData.first_name.trim())
        .eq("birth_year", formData.birth_year);

      return data || [];
    },
    enabled: !!user && formData.first_name.trim().length > 0,
  });

  useEffect(() => {
    setShowDuplicateWarning((existingPlayers?.length || 0) > 0);
  }, [existingPlayers]);

  const createPlayer = useMutation({
    mutationFn: async (data: PlayerFormData) => {
      const { data: result, error } = await supabase.rpc("create_managed_player", {
        p_first_name: data.first_name.trim(),
        p_last_initial: data.last_initial?.trim() || undefined,
        p_birth_year: data.birth_year,
        p_shoots: data.shoots,
        p_jersey_number: data.jersey_number?.trim() || undefined,
        p_fav_nhl_city: data.fav_nhl_city?.trim() || undefined,
        p_fav_nhl_player: data.fav_nhl_player?.trim() || undefined,
        p_hockey_love: data.hockey_love?.trim() || undefined,
        p_season_goals: data.season_goals?.trim() || undefined,
        p_photo_sharing_allowed: photoSharingAllowed,
        p_ai_personalization_allowed: aiPersonalizationAllowed,
      });
      if (error) throw error;
      const player = result as unknown as CreatePlayerResult;
      if (!player.player_id) throw new Error("Player profile was not created");
      return { id: player.player_id, first_name: player.first_name || data.first_name.trim() };
    },
    onSuccess: (player) => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success(t("players.new.toastAddedTitle"), t("players.new.toastAddedDescription", { name: player.first_name }));

      // Check if we need to return to team join flow
      const returnToJoin = sessionStorage.getItem("returnToJoin");
      const pendingToken = sessionStorage.getItem("pendingJoinToken");

      if (returnToJoin && pendingToken) {
        sessionStorage.removeItem("returnToJoin");
        // Keep pendingJoinToken so the join flow can use it
        navigate(`/join/${pendingToken}/player`);
      } else {
        navigate(`/players/${player.id}/home`);
      }
    },
    onError: (error: Error) => {
      toast.error(t("players.new.toastFailedTitle"), error.message);
    },
  });

  const validate = () => {
    try {
      playerSchema.parse(formData);
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
    if (!validate()) return;
    if (!adultAcknowledged) {
      setErrors((current) => ({ ...current, consent: "An adult account holder must confirm this profile." }));
      return;
    }
    createPlayer.mutate(formData);
  };

  const updateField = <K extends keyof PlayerFormData>(key: K, value: PlayerFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const currentYear = new Date().getFullYear();
  const birthYears = Array.from({ length: 20 }, (_, i) => currentYear - 5 - i);

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/players")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <PageHeader title={t("players.new.title")} />
        </div>
      }
    >
      <PageContainer>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <AppCard>
            <AppCardTitle className="text-lg mb-4">{t("players.new.basicInfoTitle")}</AppCardTitle>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="first_name">{t("players.new.firstNameLabel")}</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    className={errors.first_name ? "border-destructive" : ""}
                    placeholder="Jake"
                    autoFocus
                  />
                  {errors.first_name && (
                    <p className="text-xs text-destructive">{errors.first_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_initial">{t("players.new.lastInitialLabel")}</Label>
                  <Input
                    id="last_initial"
                    value={formData.last_initial}
                    onChange={(e) => updateField("last_initial", e.target.value.slice(0, 1).toUpperCase())}
                    placeholder="D"
                    maxLength={1}
                  />
                </div>
              </div>

              {showDuplicateWarning && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning-muted text-warning-foreground">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">{t("players.new.duplicateWarningTitle")}</p>
                    <p className="text-xs opacity-80">
                      {t("players.new.duplicateWarningDescription", { name: formData.first_name, year: formData.birth_year })}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="birth_year">{t("players.new.birthYearLabel")}</Label>
                  <Select
                    value={String(formData.birth_year)}
                    onValueChange={(v) => updateField("birth_year", parseInt(v))}
                  >
                    <SelectTrigger className={errors.birth_year ? "border-destructive" : ""}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {birthYears.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shoots">{t("players.new.shootsLabel")}</Label>
                  <Select
                    value={formData.shoots}
                    onValueChange={(v) => updateField("shoots", v as "left" | "right" | "unknown")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">{t("teams.addChild.shootsLeft")}</SelectItem>
                      <SelectItem value="right">{t("teams.addChild.shootsRight")}</SelectItem>
                      <SelectItem value="unknown">{t("players.new.shootsUnknown")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jersey_number">{t("players.new.jerseyNumberLabel")}</Label>
                <Input
                  id="jersey_number"
                  value={formData.jersey_number}
                  onChange={(e) => updateField("jersey_number", e.target.value.slice(0, 3))}
                  placeholder="17"
                  maxLength={3}
                  className="w-24"
                />
              </div>
            </div>
          </AppCard>

          {/* Fun Stuff */}
          <AppCard>
            <AppCardTitle className="text-lg mb-1">{t("players.new.funStuffTitle")}</AppCardTitle>
            <AppCardDescription className="mb-4">
              {t("players.new.funStuffDescription")}
            </AppCardDescription>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="fav_nhl_city">{t("players.new.favNhlCityLabel")}</Label>
                  <Select
                    value={formData.fav_nhl_city || ""}
                    onValueChange={(v) => updateField("fav_nhl_city", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("players.new.selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {teamPalettes.map((p) => (
                        <SelectItem key={p.id} value={p.displayName}>
                          {p.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fav_nhl_player">{t("players.new.favPlayerLabel")}</Label>
                  <Input
                    id="fav_nhl_player"
                    value={formData.fav_nhl_player}
                    onChange={(e) => updateField("fav_nhl_player", e.target.value)}
                    placeholder="McDavid"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hockey_love">{t("players.new.hockeyLoveLabel")}</Label>
                <Textarea
                  id="hockey_love"
                  value={formData.hockey_love}
                  onChange={(e) => updateField("hockey_love", e.target.value)}
                  placeholder="Scoring goals, being with teammates..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="season_goals">{t("players.new.seasonGoalsLabel")}</Label>
                <Textarea
                  id="season_goals"
                  value={formData.season_goals}
                  onChange={(e) => updateField("season_goals", e.target.value)}
                  placeholder="Improve skating speed, make the travel team..."
                  rows={2}
                />
              </div>
            </div>
          </AppCard>

          <AppCard>
            <div className="flex items-start gap-3">
              <Checkbox
                id="adult-acknowledgement"
                checked={adultAcknowledged}
                onCheckedChange={(checked) => {
                  setAdultAcknowledged(checked === true);
                  if (checked === true) setErrors((current) => ({ ...current, consent: "" }));
                }}
                aria-describedby={errors.consent ? "consent-error" : "consent-help"}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="adult-acknowledgement" className="text-sm leading-5">
                  I am this player, or I am their parent or legal guardian and I am authorized to create this profile.
                </Label>
                <p id="consent-help" className="text-xs text-muted-foreground mt-1">
                  Player profiles are managed through an adult account. Review our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
                </p>
                {errors.consent && <p id="consent-error" className="text-xs text-destructive mt-1">{errors.consent}</p>}
              </div>
            </div>

            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Optional permissions</p>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <Checkbox checked={photoSharingAllowed} onCheckedChange={(checked) => setPhotoSharingAllowed(checked === true)} className="mt-0.5" />
                <span>
                  Allow private training photos to be shared with authorized team staff.
                  <span className="mt-0.5 block text-xs text-muted-foreground">Photos are never public and this can be changed later.</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <Checkbox checked={aiPersonalizationAllowed} onCheckedChange={(checked) => setAiPersonalizationAllowed(checked === true)} className="mt-0.5" />
                <span>
                  Allow player details to personalize AI-assisted training suggestions.
                  <span className="mt-0.5 block text-xs text-muted-foreground">AI access is optional; core training works without it.</span>
                </span>
              </label>
            </div>
          </AppCard>

          {/* Submit */}
          <Button
            type="submit"
            variant="team"
            size="xl"
            className="w-full"
            disabled={createPlayer.isPending}
          >
            {createPlayer.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("players.new.saveButton")}
          </Button>
        </form>
      </PageContainer>
    </AppShell>
  );
};

export default PlayerNew;
