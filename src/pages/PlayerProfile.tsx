import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/app/Toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  UserPlus,
  Trash2,
  Calendar,
  Target,
  Heart,
  Trophy,
  Star,
  Shield,
  User,
  Loader2,
  Camera,
  Save,
  Award,
  Edit3,
  X,
} from "lucide-react";
import { InviteGuardianModal } from "@/components/player/InviteGuardianModal";

interface Guardian {
  user_id: string;
  guardian_role: string;
  profiles?: {
    display_name: string | null;
    email: string | null;
  } | null;
}

interface Badge {
  id: string;
  awarded_at: string;
  challenge: {
    name: string;
    badge_icon: string;
    description: string;
  };
}

const NHL_TEAMS = [
  "Anaheim Ducks", "Arizona Coyotes", "Boston Bruins", "Buffalo Sabres",
  "Calgary Flames", "Carolina Hurricanes", "Chicago Blackhawks", "Colorado Avalanche",
  "Columbus Blue Jackets", "Dallas Stars", "Detroit Red Wings", "Edmonton Oilers",
  "Florida Panthers", "Los Angeles Kings", "Minnesota Wild", "Montreal Canadiens",
  "Nashville Predators", "New Jersey Devils", "New York Islanders", "New York Rangers",
  "Ottawa Senators", "Philadelphia Flyers", "Pittsburgh Penguins", "San Jose Sharks",
  "Seattle Kraken", "St. Louis Blues", "Tampa Bay Lightning", "Toronto Maple Leafs",
  "Utah Hockey Club", "Vancouver Canucks", "Vegas Golden Knights", "Washington Capitals",
  "Winnipeg Jets"
];

const PlayerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [guardianToRemove, setGuardianToRemove] = useState<Guardian | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_initial: "",
    jersey_number: "",
    shoots: "",
    fav_nhl_city: "",
    fav_nhl_player: "",
    hockey_love: "",
    season_goals: "",
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch player with guardians
  const { data: player, isLoading } = useQuery({
    queryKey: ["player", id],
    queryFn: async () => {
      // Fetch player
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select("*")
        .eq("id", id)
        .single();

      if (playerError) throw playerError;

      // Fetch guardians
      const { data: guardiansData, error: guardiansError } = await supabase
        .from("player_guardians")
        .select("user_id, guardian_role")
        .eq("player_id", id);

      if (guardiansError) throw guardiansError;

      // Fetch profiles for guardians
      const guardianUserIds = guardiansData.map((g) => g.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, email")
        .in("user_id", guardianUserIds);

      // Combine guardian data with profiles
      const guardiansWithProfiles = guardiansData.map((g) => ({
        ...g,
        profiles: profilesData?.find((p) => p.user_id === g.user_id) || null,
      }));

      return { ...playerData, player_guardians: guardiansWithProfiles };
    },
    enabled: !!user && !!id,
  });

  // Fetch badges
  const { data: badges } = useQuery({
    queryKey: ["player-badges", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_badges")
        .select(`
          id,
          awarded_at,
          challenge:challenges (
            name,
            badge_icon,
            description
          )
        `)
        .eq("player_id", id)
        .order("awarded_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Badge[];
    },
    enabled: !!user && !!id,
  });

  // Fetch pending invites
  const { data: pendingInvites } = useQuery({
    queryKey: ["player-invites", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_guardian_invites")
        .select("*")
        .eq("player_id", id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Initialize edit form when player data loads
  useEffect(() => {
    if (player) {
      setEditForm({
        first_name: player.first_name || "",
        last_initial: player.last_initial || "",
        jersey_number: player.jersey_number || "",
        shoots: player.shoots || "",
        fav_nhl_city: player.fav_nhl_city || "",
        fav_nhl_player: player.fav_nhl_player || "",
        hockey_love: player.hockey_love || "",
        season_goals: player.season_goals || "",
      });
    }
  }, [player]);

  const isOwner = player?.owner_user_id === user?.id ||
    player?.player_guardians?.some(
      (g: Guardian) => g.user_id === user?.id && g.guardian_role === "owner"
    );

  const canEdit = isOwner || player?.player_guardians?.some(
    (g: Guardian) => g.user_id === user?.id
  );

  // Update player mutation
  const updatePlayer = useMutation({
    mutationFn: async (updates: typeof editForm) => {
      const { error } = await supabase
        .from("players")
        .update({
          first_name: updates.first_name,
          last_initial: updates.last_initial || null,
          jersey_number: updates.jersey_number || null,
          shoots: updates.shoots || null,
          fav_nhl_city: updates.fav_nhl_city || null,
          fav_nhl_player: updates.fav_nhl_player || null,
          hockey_love: updates.hockey_love || null,
          season_goals: updates.season_goals || null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player", id] });
      toast.success("Profile updated", "Changes saved successfully.");
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to update", error.message);
    },
  });

  // Photo upload handler
  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file", "Please select an image file.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large", "Please select an image under 5MB.");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${id}/profile.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("player-photos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("player-photos")
        .getPublicUrl(fileName);

      // Update player record
      const { error: updateError } = await supabase
        .from("players")
        .update({ profile_photo_url: `${urlData.publicUrl}?t=${Date.now()}` })
        .eq("id", id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["player", id] });
      toast.success("Photo updated", "Your profile photo has been updated.");
    } catch (error: any) {
      toast.error("Upload failed", error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeGuardian = useMutation({
    mutationFn: async (guardian: Guardian) => {
      const { error } = await supabase
        .from("player_guardians")
        .delete()
        .eq("player_id", id)
        .eq("user_id", guardian.user_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player", id] });
      toast.success("Guardian removed", "They no longer have access to this player.");
      setGuardianToRemove(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to remove guardian", error.message);
    },
  });

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

  if (!player) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <AppCard>
            <EmptyState
              icon={User}
              title="Player not found"
              description="This player doesn't exist or you don't have access."
              action={{
                label: "Go Back",
                onClick: () => navigate("/players"),
              }}
            />
          </AppCard>
        </PageContainer>
      </AppShell>
    );
  }

  const guardians = (player.player_guardians || []) as Guardian[];

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">
              {player.first_name} {player.last_initial && `${player.last_initial}.`}
            </h1>
          </div>
          {canEdit && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      }
    >
      <PageContainer>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoUpload}
          className="hidden"
        />

        {/* Profile Header */}
        <AppCard className="text-center">
          <div className="relative inline-block mx-auto mb-4">
            <Avatar
              src={player.profile_photo_url}
              fallback={`${player.first_name} ${player.last_initial || ""}`}
              size="xl"
            />
            {canEdit && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-3 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <Label htmlFor="last_initial">Last Initial</Label>
                  <Input
                    id="last_initial"
                    value={editForm.last_initial}
                    onChange={(e) => setEditForm({ ...editForm, last_initial: e.target.value.slice(0, 1).toUpperCase() })}
                    placeholder="L"
                    maxLength={1}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="jersey_number">Jersey #</Label>
                  <Input
                    id="jersey_number"
                    value={editForm.jersey_number}
                    onChange={(e) => setEditForm({ ...editForm, jersey_number: e.target.value })}
                    placeholder="99"
                  />
                </div>
                <div>
                  <Label htmlFor="shoots">Shoots</Label>
                  <Select
                    value={editForm.shoots}
                    onValueChange={(value) => setEditForm({ ...editForm, shoots: value })}
                  >
                    <SelectTrigger id="shoots">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold">
                {player.first_name} {player.last_initial && `${player.last_initial}.`}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                <Tag variant="neutral">Born {player.birth_year}</Tag>
                {player.shoots && player.shoots !== "unknown" && (
                  <Tag variant="accent">
                    Shoots {player.shoots === "left" ? "Left" : "Right"}
                  </Tag>
                )}
                {player.jersey_number && (
                  <Tag variant="tier">#{player.jersey_number}</Tag>
                )}
              </div>
            </>
          )}
        </AppCard>

        {/* Favorites & Hockey Style */}
        <AppCard>
          <AppCardTitle className="text-base flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-primary" />
            Hockey Favorites
          </AppCardTitle>
          
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="fav_nhl_city">Favorite NHL Team</Label>
                <Select
                  value={editForm.fav_nhl_city}
                  onValueChange={(value) => setEditForm({ ...editForm, fav_nhl_city: value })}
                >
                  <SelectTrigger id="fav_nhl_city">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {NHL_TEAMS.map((team) => (
                      <SelectItem key={team} value={team}>{team}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="fav_nhl_player">Favorite NHL Player</Label>
                <Input
                  id="fav_nhl_player"
                  value={editForm.fav_nhl_player}
                  onChange={(e) => setEditForm({ ...editForm, fav_nhl_player: e.target.value })}
                  placeholder="e.g., Connor McDavid"
                />
              </div>
              <div>
                <Label htmlFor="hockey_love">What do you love about hockey?</Label>
                <Textarea
                  id="hockey_love"
                  value={editForm.hockey_love}
                  onChange={(e) => setEditForm({ ...editForm, hockey_love: e.target.value })}
                  placeholder="The speed, the teamwork, scoring goals..."
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              {player.fav_nhl_city ? (
                <div className="flex items-start gap-3">
                  <Trophy className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Favorite Team</p>
                    <p className="font-medium">{player.fav_nhl_city}</p>
                  </div>
                </div>
              ) : canEdit && (
                <p className="text-muted-foreground text-sm">Tap Edit to add your favorite team</p>
              )}
              {player.fav_nhl_player && (
                <div className="flex items-start gap-3">
                  <Star className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Favorite Player</p>
                    <p className="font-medium">{player.fav_nhl_player}</p>
                  </div>
                </div>
              )}
              {player.hockey_love && (
                <div className="flex items-start gap-3">
                  <Heart className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">What They Love</p>
                    <p className="font-medium">{player.hockey_love}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </AppCard>

        {/* Season Goals */}
        <AppCard>
          <AppCardTitle className="text-base flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-primary" />
            Season Goals
          </AppCardTitle>
          
          {isEditing ? (
            <Textarea
              value={editForm.season_goals}
              onChange={(e) => setEditForm({ ...editForm, season_goals: e.target.value })}
              placeholder="What do you want to achieve this season?"
              rows={3}
            />
          ) : player.season_goals ? (
            <p className="text-sm">{player.season_goals}</p>
          ) : canEdit ? (
            <p className="text-muted-foreground text-sm">Tap Edit to set your season goals</p>
          ) : (
            <p className="text-muted-foreground text-sm">No goals set yet</p>
          )}
        </AppCard>

        {/* Badges Earned */}
        <AppCard>
          <AppCardTitle className="text-base flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-primary" />
            Badges Earned
          </AppCardTitle>
          
          {badges && badges.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {badges.slice(0, 6).map((badge) => (
                <div
                  key={badge.id}
                  className="flex flex-col items-center p-3 rounded-lg bg-muted/50 text-center"
                >
                  <span className="text-2xl mb-1">{badge.challenge.badge_icon}</span>
                  <p className="text-xs font-medium line-clamp-2">{badge.challenge.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Award}
              title="No badges yet"
              description="Complete challenges to earn badges!"
              className="py-6"
            />
          )}
          
          {badges && badges.length > 6 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3"
              onClick={() => navigate(`/solo/badges/${id}`)}
            >
              View all {badges.length} badges
            </Button>
          )}
        </AppCard>

        {/* Edit Actions */}
        {isEditing && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setIsEditing(false);
                // Reset form
                if (player) {
                  setEditForm({
                    first_name: player.first_name || "",
                    last_initial: player.last_initial || "",
                    jersey_number: player.jersey_number || "",
                    shoots: player.shoots || "",
                    fav_nhl_city: player.fav_nhl_city || "",
                    fav_nhl_player: player.fav_nhl_player || "",
                    hockey_love: player.hockey_love || "",
                    season_goals: player.season_goals || "",
                  });
                }
              }}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => updatePlayer.mutate(editForm)}
              disabled={updatePlayer.isPending || !editForm.first_name}
            >
              {updatePlayer.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Save
            </Button>
          </div>
        )}

        {/* Guardians */}
        <AppCard>
          <div className="flex items-center justify-between mb-4">
            <AppCardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Guardians
            </AppCardTitle>
            {isOwner && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowInviteModal(true)}
              >
                <UserPlus className="w-4 h-4" />
                Invite
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {guardians.map((guardian) => {
              const profile = guardian.profiles as { display_name: string | null; email: string | null } | null;
              const isCurrentUser = guardian.user_id === user?.id;
              const canRemove = isOwner && !isCurrentUser && guardian.guardian_role !== "owner";

              return (
                <div
                  key={guardian.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
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
                    <p className="text-xs text-muted-foreground capitalize">
                      {guardian.guardian_role}
                    </p>
                  </div>
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setGuardianToRemove(guardian)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}

            {/* Pending Invites */}
            {isOwner && pendingInvites && pendingInvites.length > 0 && (
              <>
                <AppCardDescription className="mt-4 mb-2">
                  Pending Invites
                </AppCardDescription>
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20"
                  >
                    <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-warning" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {invite.invited_email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Tag variant="warning" size="sm">
                      Pending
                    </Tag>
                  </div>
                ))}
              </>
            )}
          </div>
        </AppCard>
      </PageContainer>

      {/* Invite Guardian Modal */}
      <InviteGuardianModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        playerId={id!}
        playerName={player.first_name}
      />

      {/* Remove Guardian Confirmation */}
      <AlertDialog
        open={!!guardianToRemove}
        onOpenChange={(open) => !open && setGuardianToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Guardian</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this guardian? They will no longer
              have access to {player.first_name}'s profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => guardianToRemove && removeGuardian.mutate(guardianToRemove)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeGuardian.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default PlayerProfile;
