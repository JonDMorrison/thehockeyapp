import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { privateMediaReference, validateImageUpload } from "@/lib/media";
import { NHL_TEAMS, PLAYER_POSITIONS, type PlayerPosition } from "@/lib/playerProfile";
import { focusFirstInvalidField, getZodFieldErrors } from "@/lib/formValidation";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardDescription, AppCardTitle } from "@/components/app/AppCard";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RequiredMark } from "@/components/ui/required-mark";
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
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Heart,
  Loader2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Upload,
  UserRound,
} from "lucide-react";

const profileSchema = z.object({
  position: z.enum(["forward", "defence", "goalie", "unsure"], {
    required_error: "Choose a position or select Not sure yet",
  }),
  shoots: z.enum(["left", "right", "unknown"]),
  jersey_number: z.string().trim().max(3, "Jersey number must be 3 characters or fewer"),
  fav_nhl_city: z.string().trim().max(50, "Favourite team must be 50 characters or fewer"),
  fav_nhl_player: z.string().trim().max(100, "Favourite player must be 100 characters or fewer"),
  hockey_love: z.string().trim().max(500, "Answer must be 500 characters or fewer"),
  season_goals: z.string().trim().max(500, "Hockey dream must be 500 characters or fewer"),
});

type ProfileForm = {
  position: PlayerPosition | "";
  shoots: "left" | "right" | "unknown";
  jersey_number: string;
  fav_nhl_city: string;
  fav_nhl_player: string;
  hockey_love: string;
  season_goals: string;
};

const EMPTY_FORM: ProfileForm = {
  position: "",
  shoots: "unknown",
  jersey_number: "",
  fav_nhl_city: "",
  fav_nhl_player: "",
  hockey_love: "",
  season_goals: "",
};

const TOTAL_STEPS = 3;

const PlayerTeamOnboarding: React.FC = () => {
  const { playerId, teamId } = useParams<{ playerId: string; teamId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedPlayerId = useRef<string | null>(null);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["team-player-onboarding", teamId, playerId, user?.id],
    queryFn: async () => {
      const [{ data: player, error: playerError }, { data: membership, error: membershipError }] = await Promise.all([
        supabase.from("players").select("*").eq("id", playerId!).single(),
        supabase
          .from("team_memberships")
          .select("id, teams(id, name)")
          .eq("team_id", teamId!)
          .eq("player_id", playerId!)
          .eq("status", "active")
          .single(),
      ]);

      if (playerError) throw playerError;
      if (membershipError) throw membershipError;
      const team = membership.teams as { id: string; name: string } | null;
      return { player, team };
    },
    enabled: !!user && !!playerId && !!teamId,
  });

  useEffect(() => {
    if (!data?.player || initializedPlayerId.current === data.player.id) return;
    initializedPlayerId.current = data.player.id;
    setForm({
      position: (data.player.position as PlayerPosition | null) || "",
      shoots: (data.player.shoots as ProfileForm["shoots"] | null) || "unknown",
      jersey_number: data.player.jersey_number || "",
      fav_nhl_city: data.player.fav_nhl_city || "",
      fav_nhl_player: data.player.fav_nhl_player || "",
      hockey_love: data.player.hockey_love || "",
      season_goals: data.player.season_goals || "",
    });
  }, [data?.player]);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const updateField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: "" }));
  };

  const validateBasics = () => {
    if (form.position) return true;
    const nextErrors = { position: "Choose a position or select Not sure yet" };
    setErrors(nextErrors);
    focusFirstInvalidField(nextErrors, { position: "player-position" });
    return false;
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validationError = validateImageUpload(file);
    if (validationError) {
      toast.error("Choose another photo", validationError);
      event.target.value = "";
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const saveProfile = useMutation({
    mutationFn: async () => {
      const parsed = profileSchema.safeParse(form);
      if (!parsed.success) {
        const nextErrors = getZodFieldErrors(parsed.error);
        setErrors(nextErrors);
        focusFirstInvalidField(nextErrors, {
          position: "player-position",
          jersey_number: "player-jersey-number",
          fav_nhl_city: "player-favourite-team",
          fav_nhl_player: "player-favourite-player",
          hockey_love: "player-hockey-love",
          season_goals: "player-hockey-dream",
        });
        throw new Error("Check the highlighted player details");
      }

      let profilePhotoUrl = data?.player.profile_photo_url || null;
      if (photoFile && playerId) {
        const extensionByType: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
          "image/heic": "heic",
          "image/heif": "heif",
        };
        const extension = extensionByType[photoFile.type] || "jpg";
        const storagePath = `${playerId}/profile.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("player-photos")
          .upload(storagePath, photoFile, { upsert: true, contentType: photoFile.type });
        if (uploadError) throw uploadError;
        profilePhotoUrl = privateMediaReference("player-photos", storagePath);
      }

      const { error: updateError } = await supabase
        .from("players")
        .update({
          position: parsed.data.position,
          shoots: parsed.data.shoots,
          jersey_number: parsed.data.jersey_number || null,
          fav_nhl_city: parsed.data.fav_nhl_city || null,
          fav_nhl_player: parsed.data.fav_nhl_player || null,
          hockey_love: parsed.data.hockey_love || null,
          season_goals: parsed.data.season_goals || null,
          profile_photo_url: profilePhotoUrl,
        })
        .eq("id", playerId!);
      if (updateError) throw updateError;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["player", playerId] }),
        queryClient.invalidateQueries({ queryKey: ["players"] }),
        queryClient.invalidateQueries({ queryKey: ["team-roster", teamId] }),
        queryClient.invalidateQueries({ queryKey: ["roster-player", teamId, playerId] }),
      ]);
      toast.success("Player profile ready", `${data?.player.first_name || "Player"} is ready to join the team.`);
      navigate(`/players/${playerId}/home`, { replace: true });
    },
    onError: (saveError: Error) => {
      if (saveError.message === "Check the highlighted player details") return;
      toast.error("Could not save player profile", saveError.message || "Please try again.");
    },
  });

  const skip = () => navigate(`/players/${playerId}/home`, { replace: true });

  if (authLoading || isLoading) {
    return (
      <AppShell hideNav>
        <PageContainer className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </PageContainer>
      </AppShell>
    );
  }

  if (!isAuthenticated) return null;

  if (error || !data?.player || !data.team) {
    return (
      <AppShell hideNav>
        <PageContainer className="flex min-h-screen items-center justify-center">
          <AppCard className="max-w-md text-center">
            <AppCardTitle>Player profile unavailable</AppCardTitle>
            <AppCardDescription className="mt-2">
              This player is not on the team, or you do not have permission to update the profile.
            </AppCardDescription>
            <Button className="mt-5" onClick={() => navigate("/today")}>Go to Today</Button>
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell hideNav>
      <PageContainer className="mx-auto max-w-2xl py-6 sm:py-10">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Welcome to {data.team.name}</p>
          <h1 className="mt-2 text-2xl font-bold">Tell the coaches about {data.player.first_name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One short profile helps the coaching staff know their players. You can change these answers later.
          </p>
        </div>

        <div className="mb-6" aria-label={`Step ${step} of ${TOTAL_STEPS}`}>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {step} of {TOTAL_STEPS}</span>
            <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        {step === 1 && (
          <AppCard>
            <AppCardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" />
              Hockey basics
            </AppCardTitle>
            <AppCardDescription className="mt-1">Start with how they play today.</AppCardDescription>

            <div className="mt-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="player-position">Position<RequiredMark /></Label>
                <Select value={form.position} onValueChange={(value) => updateField("position", value as PlayerPosition)}>
                  <SelectTrigger
                    id="player-position"
                    className={errors.position ? "border-destructive" : ""}
                    aria-invalid={Boolean(errors.position)}
                    aria-describedby={errors.position ? "player-position-error" : undefined}
                  >
                    <SelectValue placeholder="Choose a position" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYER_POSITIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.position && <p id="player-position-error" role="alert" className="text-xs text-destructive">{errors.position}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="player-jersey-number">Jersey number <span className="font-normal text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="player-jersey-number"
                    value={form.jersey_number}
                    onChange={(event) => updateField("jersey_number", event.target.value.slice(0, 3))}
                    maxLength={3}
                    placeholder="17"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player-shoots">Shoots</Label>
                  <Select value={form.shoots} onValueChange={(value) => updateField("shoots", value as ProfileForm["shoots"])}>
                    <SelectTrigger id="player-shoots"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                      <SelectItem value="unknown">Not sure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </AppCard>
        )}

        {step === 2 && (
          <AppCard>
            <AppCardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Their hockey story
            </AppCardTitle>
            <AppCardDescription className="mt-1">These are optional. A short answer is perfect.</AppCardDescription>

            <div className="mt-5 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="player-favourite-team">Favourite NHL team</Label>
                  <Select value={form.fav_nhl_city} onValueChange={(value) => updateField("fav_nhl_city", value)}>
                    <SelectTrigger id="player-favourite-team"><SelectValue placeholder="Choose a team" /></SelectTrigger>
                    <SelectContent>
                      {NHL_TEAMS.map((team) => <SelectItem key={team} value={team}>{team}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player-favourite-player">Favourite player</Label>
                  <Input
                    id="player-favourite-player"
                    value={form.fav_nhl_player}
                    onChange={(event) => updateField("fav_nhl_player", event.target.value)}
                    maxLength={100}
                    placeholder="e.g. Sarah Nurse"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="player-hockey-love" className="flex items-center gap-2"><Star className="h-4 w-4 text-primary" />Favourite thing about hockey</Label>
                <Textarea
                  id="player-hockey-love"
                  value={form.hockey_love}
                  onChange={(event) => updateField("hockey_love", event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Being with teammates, scoring goals, learning new skills…"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="player-hockey-dream" className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Hockey dream</Label>
                <Textarea
                  id="player-hockey-dream"
                  value={form.season_goals}
                  onChange={(event) => updateField("season_goals", event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Play college hockey, make the travel team, become a goalie…"
                />
              </div>
            </div>
          </AppCard>
        )}

        {step === 3 && (
          <AppCard className="text-center">
            <AppCardTitle className="flex items-center justify-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Add a player photo
            </AppCardTitle>
            <AppCardDescription className="mt-1">Optional, but it helps coaches recognize everyone quickly.</AppCardDescription>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={handlePhotoChange}
              className="hidden"
            />

            <div className="mt-6">
              {photoPreview ? (
                <img src={photoPreview} alt="Selected player" className="mx-auto h-32 w-32 rounded-full object-cover ring-4 ring-primary/15" />
              ) : (
                <Avatar
                  src={data.player.profile_photo_url}
                  fallback={`${data.player.first_name} ${data.player.last_initial || ""}`}
                  size="xl"
                  className="mx-auto"
                />
              )}
              <Button type="button" variant="outline" className="mt-4" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" />
                {photoPreview || data.player.profile_photo_url ? "Choose another photo" : "Choose photo"}
              </Button>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-left">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-xs leading-5 text-muted-foreground">
                Player photos are private. Only the player’s guardians and authorized team staff can view them.
              </p>
            </div>
          </AppCard>
        )}

        <div className="mt-6 flex gap-3">
          {step > 1 && (
            <Button type="button" variant="outline" size="lg" onClick={() => setStep((current) => current - 1)} disabled={saveProfile.isPending}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button
              type="button"
              variant="team"
              size="lg"
              className="flex-1"
              onClick={() => {
                if (step === 1 && !validateBasics()) return;
                setStep((current) => current + 1);
              }}
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" variant="team" size="lg" className="flex-1" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
              {saveProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save player profile
            </Button>
          )}
        </div>

        <Button type="button" variant="ghost" className="mt-2 w-full text-muted-foreground" onClick={skip} disabled={saveProfile.isPending}>
          Skip for now
        </Button>
      </PageContainer>
    </AppShell>
  );
};

export default PlayerTeamOnboarding;
