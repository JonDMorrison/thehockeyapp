import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { teamPalettes, CUSTOM_PALETTE_ID, customPaletteOption, getTeamPalette, CustomColors } from "@/lib/themes";
import { ColorPickerPopover } from "@/components/team/ColorPickerPopover";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { SkeletonCard } from "@/components/app/Skeleton";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/components/app/Toast";
import {
  ChevronLeft,
  Loader2,
  Palette,
  Image,
  Shield,
  UserPlus,
  Trash2,
  Upload,
  Camera,
  AlertTriangle,
} from "lucide-react";
import { InviteAdultModal } from "@/components/team/InviteAdultModal";
import { TeamBioSection, TeamChallengesToggle } from "@/components/team/TeamBioSection";
import { ScheduleSyncSection } from "@/components/team/ScheduleSyncSection";
import { TrainingPreferencesSection } from "@/components/team/TrainingPreferencesSection";
import { JoinAsPlayerSection } from "@/components/team/JoinAsPlayerSection";
import { AddChildSection } from "@/components/team/AddChildSection";
import { Link } from "react-router-dom";

const roleLabels: Record<string, string> = {
  head_coach: "Head Coach",
  assistant_coach: "Asst. Coach",
  manager: "Manager",
};

interface TeamRole {
  id: string;
  user_id: string;
  role: string;
  profiles?: {
    display_name: string | null;
    email: string | null;
  } | null;
}

const teamInfoSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").max(100),
  season_label: z.string().trim().max(50).optional(),
});

const TeamSettings: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  const [name, setName] = useState("");
  const [seasonLabel, setSeasonLabel] = useState("");
  const [paletteId, setPaletteId] = useState("toronto");
  const [customPrimary, setCustomPrimary] = useState("221 83% 53%");
  const [customSecondary, setCustomSecondary] = useState("0 0% 100%");
  const [customTertiary, setCustomTertiary] = useState("221 70% 45%");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [roleToRemove, setRoleToRemove] = useState<TeamRole | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const photoInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch team
  const { data: team, isLoading } = useQuery({
    queryKey: ["team", id],
    queryFn: async () => {
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select("*")
        .eq("id", id)
        .single();

      if (teamError) throw teamError;

      // Fetch team roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("team_roles")
        .select("id, user_id, role")
        .eq("team_id", id);

      if (rolesError) throw rolesError;

      // Fetch profiles
      const userIds = rolesData.map((r) => r.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", userIds);

      const rolesWithProfiles = rolesData.map((r) => ({
        ...r,
        profiles: profilesData?.find((p) => p.user_id === r.user_id) || null,
      }));

      return { ...teamData, team_roles: rolesWithProfiles };
    },
    enabled: !!user && !!id,
  });

  // Fetch pending invites
  const { data: pendingInvites } = useQuery({
    queryKey: ["team-invites", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_adult_invites")
        .select("*")
        .eq("team_id", id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Initialize form values - only once when team data first loads
  useEffect(() => {
    if (team && !initializedRef.current) {
      initializedRef.current = true;
      setName(team.name);
      setSeasonLabel(team.season_label || "");
      setPaletteId(team.palette_id);
      // Load custom colors if available
      if (team.custom_primary) setCustomPrimary(team.custom_primary);
      if (team.custom_secondary) setCustomSecondary(team.custom_secondary);
      if (team.custom_tertiary) setCustomTertiary(team.custom_tertiary);
      // Apply theme with custom colors if custom palette
      if (team.palette_id === CUSTOM_PALETTE_ID && team.custom_primary) {
        setTeamTheme(team.palette_id, {
          primary: team.custom_primary,
          secondary: team.custom_secondary || "0 0% 100%",
          tertiary: team.custom_tertiary || "221 70% 45%",
        });
      } else {
        setTeamTheme(team.palette_id);
      }
    }
  }, [team]);

  const currentUserRole = team?.team_roles?.find(
    (r: TeamRole) => r.user_id === user?.id
  )?.role;
  const isHeadCoach = currentUserRole === "head_coach";

  // Update team info
  const updateTeam = useMutation({
    mutationFn: async () => {
      const validated = teamInfoSchema.parse({ name, season_label: seasonLabel });
      
      const updateData: Record<string, any> = {
        name: validated.name,
        season_label: validated.season_label || null,
        palette_id: paletteId,
      };
      
      // Include custom colors if using custom palette
      if (paletteId === CUSTOM_PALETTE_ID) {
        updateData.custom_primary = customPrimary;
        updateData.custom_secondary = customSecondary;
        updateData.custom_tertiary = customTertiary;
      }
      
      const { error } = await supabase
        .from("teams")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", id] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      if (paletteId === CUSTOM_PALETTE_ID) {
        setTeamTheme(paletteId, {
          primary: customPrimary,
          secondary: customSecondary,
          tertiary: customTertiary,
        });
      } else {
        setTeamTheme(paletteId);
      }
      toast.success("Saved", "Team settings updated.");
    },
    onError: (error: Error) => {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(newErrors);
      } else {
        toast.error("Failed to save", error.message);
      }
    },
  });

  // Upload media
  const uploadMedia = async (file: File, type: "photo" | "logo") => {
    const setUploading = type === "photo" ? setUploadingPhoto : setUploadingLogo;
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `teams/${id}/${type}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("team-media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("team-media")
        .getPublicUrl(filePath);

      const updateField = type === "photo" ? "team_photo_url" : "team_logo_url";
      const { error: updateError } = await supabase
        .from("teams")
        .update({ [updateField]: urlData.publicUrl })
        .eq("id", id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["team", id] });
      toast.success("Uploaded", `Team ${type} updated.`);
    } catch (error: unknown) {
      toast.error("Upload failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  };

  // Remove adult
  const removeRole = useMutation({
    mutationFn: async (role: TeamRole) => {
      const { error } = await supabase
        .from("team_roles")
        .delete()
        .eq("id", role.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", id] });
      toast.success("Removed", "Adult removed from team.");
      setRoleToRemove(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to remove", error.message);
    },
  });

  // Revoke invite
  const revokeInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from("team_adult_invites")
        .update({ status: "revoked" })
        .eq("id", inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invites", id] });
      toast.success("Revoked", "Invite has been cancelled.");
    },
    onError: (error: Error) => {
      toast.error("Failed to revoke", error.message);
    },
  });

  // Delete team
  const deleteTeam = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Team deleted", "Your team has been permanently deleted.");
      navigate("/teams", { replace: true });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete", error.message);
    },
  });

  // Get the selected palette - for custom, use custom colors
  const selectedPalette = paletteId === CUSTOM_PALETTE_ID 
    ? getTeamPalette(CUSTOM_PALETTE_ID, { primary: customPrimary, secondary: customSecondary, tertiary: customTertiary })
    : teamPalettes.find((p) => p.id === paletteId);
  const teamRoles = (team?.team_roles || []) as TeamRole[];

  // Show loading state while auth or data is loading
  if (isLoading || authLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
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
            onClick={() => navigate(`/teams/${id}`)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <PageHeader title="Team Settings" />
        </div>
      }
    >
      <PageContainer>
        {/* Team Info */}
        <AppCard>
          <AppCardTitle className="text-lg mb-4">Team Info</AppCardTitle>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="season_label">Season Label</Label>
              <Input
                id="season_label"
                value={seasonLabel}
                onChange={(e) => setSeasonLabel(e.target.value)}
                placeholder="2024-25 · U12 Rep"
              />
            </div>

            <Button
              variant="team"
              onClick={() => updateTeam.mutate()}
              disabled={updateTeam.isPending}
            >
              {updateTeam.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </AppCard>

        {/* Appearance */}
        <AppCard>
          <AppCardTitle className="text-lg flex items-center gap-2 mb-1">
            <Image className="w-4 h-4 text-team-primary" />
            Appearance
          </AppCardTitle>
          <AppCardDescription className="mb-4">
            Customize your team's look
          </AppCardDescription>

          <div className="space-y-6">
            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Team Photo</Label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar
                    src={team?.team_photo_url}
                    fallback={team?.name || "T"}
                    size="xl"
                  />
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    className="absolute -bottom-1 -right-1 rounded-full"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Camera className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadMedia(file, "photo");
                  }}
                />
                <div className="text-sm text-text-muted">
                  JPG or PNG, max 5MB
                </div>
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Team Logo</Label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-16 h-16 rounded-lg bg-surface-muted border border-border flex items-center justify-center overflow-hidden">
                    {team?.team_logo_url ? (
                      <img
                        src={team.team_logo_url}
                        alt="Team logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Upload className="w-6 h-6 text-text-muted" />
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="icon-sm"
                    className="absolute -bottom-1 -right-1 rounded-full"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                  </Button>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadMedia(file, "logo");
                  }}
                />
                <div className="text-sm text-text-muted">
                  PNG preferred, max 5MB
                </div>
              </div>
            </div>

            {/* Palette Selection */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-text-muted" />
                Team Colors
              </Label>
              <Select value={paletteId} onValueChange={setPaletteId}>
                <SelectTrigger>
                  <SelectValue>
                    {selectedPalette && (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1">
                          <div
                            className="w-4 h-4 rounded-full border border-background shadow-sm"
                            style={{ backgroundColor: `hsl(${selectedPalette.primary})` }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border border-background shadow-sm"
                            style={{ backgroundColor: `hsl(${selectedPalette.secondary})` }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border border-background shadow-sm"
                            style={{ backgroundColor: `hsl(${selectedPalette.tertiary})` }}
                          />
                        </div>
                        <span>{selectedPalette.displayName}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {/* Custom option first */}
                  <SelectItem value={CUSTOM_PALETTE_ID}>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1">
                        <div
                          className="w-4 h-4 rounded-full border border-background shadow-sm"
                          style={{ backgroundColor: `hsl(${customPrimary})` }}
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-background shadow-sm"
                          style={{ backgroundColor: `hsl(${customSecondary})` }}
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-background shadow-sm"
                          style={{ backgroundColor: `hsl(${customTertiary})` }}
                        />
                      </div>
                      <span>Custom</span>
                    </div>
                  </SelectItem>
                  {/* Preset palettes */}
                  {teamPalettes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1">
                          <div
                            className="w-4 h-4 rounded-full border border-background shadow-sm"
                            style={{ backgroundColor: `hsl(${p.primary})` }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border border-background shadow-sm"
                            style={{ backgroundColor: `hsl(${p.secondary})` }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border border-background shadow-sm"
                            style={{ backgroundColor: `hsl(${p.tertiary})` }}
                          />
                        </div>
                        <span>{p.displayName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Custom Color Pickers - shown when custom is selected */}
              {paletteId === CUSTOM_PALETTE_ID && (
                <div className="p-4 rounded-lg bg-surface-muted space-y-3">
                  <p className="text-sm font-medium text-text-muted">Pick your colors:</p>
                  <div className="flex flex-wrap gap-2">
                    <ColorPickerPopover
                      label="Primary"
                      value={customPrimary}
                      onChange={setCustomPrimary}
                    />
                    <ColorPickerPopover
                      label="Secondary"
                      value={customSecondary}
                      onChange={setCustomSecondary}
                    />
                    <ColorPickerPopover
                      label="Tertiary"
                      value={customTertiary}
                      onChange={setCustomTertiary}
                    />
                  </div>
                </div>
              )}

              {/* Preview swatches */}
              {selectedPalette && (
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className="w-8 h-8 rounded-lg shadow-sm"
                    style={{ backgroundColor: `hsl(${selectedPalette.primary})` }}
                  />
                  <div
                    className="w-8 h-8 rounded-lg shadow-sm border"
                    style={{ backgroundColor: `hsl(${selectedPalette.secondary})` }}
                  />
                  <div
                    className="w-8 h-8 rounded-lg shadow-sm"
                    style={{ backgroundColor: `hsl(${selectedPalette.tertiary})` }}
                  />
                </div>
              )}

              <Button
                variant="team-soft"
                size="sm"
                onClick={() => updateTeam.mutate()}
                disabled={updateTeam.isPending}
              >
                Apply Colors
              </Button>
            </div>
          </div>
        </AppCard>

        {/* Coach Profile Hint */}
        <AppCard className="bg-surface-muted/50 border-dashed">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-team-primary/10 flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-4 h-4 text-team-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">Looking for your coach profile?</p>
              <p className="text-sm text-text-muted mt-0.5">
                Edit your personal photo, name, and coaching bio in Account Settings.
              </p>
              <Link
                to="/settings"
                className="inline-flex items-center gap-1 text-sm font-medium text-team-primary hover:underline mt-2"
              >
                Go to Account Settings
                <ChevronLeft className="w-3 h-3 rotate-180" />
              </Link>
            </div>
          </div>
        </AppCard>

        {/* Team Bio Section */}
        <TeamBioSection
          teamId={id!}
          description={team?.description}
          valuesText={team?.values_text}
        />

        {/* National Challenges Toggle */}
        <TeamChallengesToggle teamId={id!} />

        {/* Training Preferences */}
        <TrainingPreferencesSection teamId={id!} />

        {/* Schedule Sync */}
        <ScheduleSyncSection teamId={id!} />

        {/* Join as Player - for coaches who want to train */}
        <JoinAsPlayerSection teamId={id!} teamName={team?.name || "Team"} />

        {/* Add My Child - for coach-parents */}
        <AddChildSection teamId={id!} teamName={team?.name || "Team"} />

        {/* Adults */}
        <AppCard>
          <div className="flex items-center justify-between mb-4">
            <AppCardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-4 h-4 text-team-primary" />
              Coaches & Managers
            </AppCardTitle>
            <Button
              variant="team-soft"
              size="sm"
              onClick={() => setShowInviteModal(true)}
            >
              <UserPlus className="w-4 h-4" />
              Invite
            </Button>
          </div>

          <div className="space-y-3">
            {teamRoles.map((role) => {
              const profile = role.profiles;
              const isCurrentUser = role.user_id === user?.id;
              const canRemove = isHeadCoach && !isCurrentUser && role.role !== "head_coach";

              return (
                <div
                  key={role.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-muted"
                >
                  <Avatar
                    fallback={profile?.display_name || profile?.email || "?"}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {profile?.display_name || profile?.email || "Unknown"}
                      {isCurrentUser && " (You)"}
                    </p>
                    <p className="text-xs text-text-muted">
                      {roleLabels[role.role] || role.role}
                    </p>
                  </div>
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setRoleToRemove(role)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}

            {/* Pending Invites */}
            {pendingInvites && pendingInvites.length > 0 && (
              <>
                <AppCardDescription className="mt-4 mb-2">
                  Pending Invites
                </AppCardDescription>
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-warning-muted/50 border border-warning/20"
                  >
                    <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {invite.invited_email}
                      </p>
                      <p className="text-xs text-text-muted">
                        {roleLabels[invite.role]} · Expires{" "}
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => revokeInvite.mutate(invite.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      Revoke
                    </Button>
                  </div>
                ))}
              </>
            )}

            {!isHeadCoach && (
              <p className="text-xs text-text-muted text-center py-2">
                Only the head coach can remove team members
              </p>
            )}
          </div>
        </AppCard>
        {/* Danger Zone - Head Coach Only */}
        {isHeadCoach && (
          <AppCard className="border-destructive/30 bg-destructive/5">
            <AppCardTitle className="text-lg flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="w-4 h-4" />
              Danger Zone
            </AppCardTitle>
            <AppCardDescription className="mb-4">
              Irreversible actions
            </AppCardDescription>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">Delete Team</p>
                  <p className="text-sm text-text-muted">
                    Permanently delete this team and all associated data including players, practice cards, and progress history. This action cannot be undone.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </AppCard>
        )}
      </PageContainer>

      {/* Invite Adult Modal */}
      <InviteAdultModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        teamId={id!}
        teamName={team?.name || ""}
      />

      {/* Remove Adult Confirmation */}
      <AlertDialog
        open={!!roleToRemove}
        onOpenChange={(open) => !open && setRoleToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this person from the team? They
              will lose access to team management.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roleToRemove && removeRole.mutate(roleToRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeRole.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Team Confirmation */}
      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          setShowDeleteConfirm(open);
          if (!open) setDeleteConfirmText("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete Team Permanently
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will permanently delete <strong>{team?.name}</strong> and all associated data:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>All players and their memberships</li>
                <li>Practice cards and task completions</li>
                <li>Team goals and progress history</li>
                <li>Week plans and training programs</li>
              </ul>
              <p className="font-medium text-destructive">
                This action cannot be undone.
              </p>
              <div className="pt-2">
                <Label htmlFor="confirm-delete" className="text-xs text-text-muted">
                  Type the team name to confirm:
                </Label>
                <Input
                  id="confirm-delete"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={team?.name}
                  className="mt-1"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTeam.mutate()}
              disabled={deleteConfirmText !== team?.name || deleteTeam.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleteTeam.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default TeamSettings;
