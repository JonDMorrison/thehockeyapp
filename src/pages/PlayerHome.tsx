import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useTodaySnapshot } from "@/hooks/useTodaySnapshot";
import { teamPalettes } from "@/lib/themes";
import { fireStreakConfetti } from "@/lib/confetti";
import { AppShell, PageContainer } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Tag } from "@/components/app/Tag";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/components/app/Toast";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  User,
  Check,
  Star,
  Trophy,
  Plus,
  Dumbbell,
  CheckCircle,
  Clock,
  Flame,
  Target,
} from "lucide-react";
import { WeeklySummaryCard } from "@/components/summary/WeeklySummaryCard";
import { NotificationBell } from "@/components/app/NotificationBell";
import { TeamActivityFeed } from "@/components/player/TeamActivityFeed";
import { TeammateRoster } from "@/components/player/TeammateRoster";
import { TeamLeaderboard } from "@/components/player/TeamLeaderboard";
import { TeamCheersFeed } from "@/components/player/TeamCheersFeed";
import { format, subDays, parseISO } from "date-fns";
import logoImage from "@/assets/hockey-app-logo.png";

// Milestone thresholds for celebrations
const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90, 100, 180, 365];

interface TeamMembership {
  id: string;
  team_id: string;
  status: string;
  joined_at: string;
  teams?: {
    id: string;
    name: string;
    season_label: string | null;
    team_photo_url: string | null;
    team_logo_url: string | null;
    palette_id: string;
  } | null;
}

const PlayerHome: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  const [showTeamSelector, setShowTeamSelector] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch player
  const { data: player, isLoading: playerLoading } = useQuery({
    queryKey: ["player", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch player's team memberships
  const { data: memberships, isLoading: membershipsLoading } = useQuery({
    queryKey: ["player-memberships", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select(`
          id,
          team_id,
          status,
          joined_at,
          teams (
            id,
            name,
            season_label,
            team_photo_url,
            team_logo_url,
            palette_id
          )
        `)
        .eq("player_id", id)
        .eq("status", "active")
        .order("joined_at", { ascending: false });

      if (error) throw error;
      return data as TeamMembership[];
    },
    enabled: !!user && !!id,
  });

  // Fetch active team preference
  const { data: preferences } = useQuery({
    queryKey: ["player-preferences", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_team_preferences")
        .select("*")
        .eq("player_id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Apply active team theme
  useEffect(() => {
    if (preferences?.active_team_id && memberships) {
      const activeTeam = memberships.find(
        (m) => m.team_id === preferences.active_team_id
      )?.teams;
      if (activeTeam?.palette_id) {
        setTeamTheme(activeTeam.palette_id);
      }
    }
  }, [preferences, memberships, setTeamTheme]);

  // Update active team
  const updateActiveTeam = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase
        .from("player_team_preferences")
        .upsert({
          player_id: id,
          active_team_id: teamId,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["player-preferences", id] });
      toast.success("Active team updated", "Theme and workouts will reflect this team.");
      setShowTeamSelector(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to update", error.message);
    },
  });

  const activeTeam = memberships?.find(
    (m) => m.team_id === preferences?.active_team_id
  )?.teams;

  // Fetch today's workout snapshot
  const { snapshot: todaySnapshot, isLoading: snapshotLoading } = useTodaySnapshot(
    preferences?.active_team_id ? id! : null
  );

  // Calculate workout streak from session completions
  const { data: streakData } = useQuery({
    queryKey: ["player-streak", id, preferences?.active_team_id],
    queryFn: async () => {
      // Get session completions for this player on the active team
      const { data: completions, error } = await supabase
        .from("session_completions")
        .select(`
          completed_at,
          practice_cards!inner(team_id, date)
        `)
        .eq("player_id", id)
        .eq("practice_cards.team_id", preferences!.active_team_id)
        .eq("status", "complete")
        .order("completed_at", { ascending: false });

      if (error) throw error;

      // Get unique completion dates sorted oldest to newest for best streak calc
      const completedDates = [...new Set(
        (completions || [])
          .filter((c) => c.completed_at)
          .map((c) => format(parseISO(c.completed_at!), "yyyy-MM-dd"))
      )].sort();

      if (completedDates.length === 0) {
        return { currentStreak: 0, bestStreak: 0 };
      }

      // Calculate best streak by iterating through all dates
      let bestStreak = 1;
      let tempStreak = 1;
      
      for (let i = 1; i < completedDates.length; i++) {
        const prevDate = parseISO(completedDates[i - 1]);
        const currDate = parseISO(completedDates[i]);
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }

      // Calculate current streak
      let currentStreak = 0;
      const now = new Date();
      const today = format(now, "yyyy-MM-dd");
      const yesterday = format(subDays(now, 1), "yyyy-MM-dd");

      // Reverse for current streak calculation (newest first)
      const reversedDates = [...completedDates].reverse();

      // Start from today or yesterday
      let startOffset = 0;
      if (reversedDates.includes(today)) {
        startOffset = 0;
      } else if (reversedDates.includes(yesterday)) {
        startOffset = 1;
      } else {
        return { currentStreak: 0, bestStreak };
      }

      // Count consecutive days
      for (let i = startOffset; i < 365; i++) {
        const dateToCheck = format(subDays(now, i), "yyyy-MM-dd");
        if (reversedDates.includes(dateToCheck)) {
          currentStreak++;
        } else {
          break;
        }
      }

      return { 
        currentStreak, 
        bestStreak: Math.max(bestStreak, currentStreak) 
      };
    },
    enabled: !!user && !!id && !!preferences?.active_team_id,
  });

  // Track if we've already celebrated this milestone to avoid duplicate celebrations
  const celebratedMilestoneRef = useRef<number | null>(null);

  // Check for streak milestones and celebrate
  useEffect(() => {
    const currentStreak = streakData?.currentStreak ?? 0;
    
    if (currentStreak > 0) {
      // Find if current streak hits a milestone
      const hitMilestone = STREAK_MILESTONES.find(m => currentStreak === m);
      
      if (hitMilestone && celebratedMilestoneRef.current !== hitMilestone) {
        // Check localStorage to see if we already celebrated this milestone for this player
        const celebratedKey = `streak_celebrated_${id}_${hitMilestone}`;
        const alreadyCelebrated = localStorage.getItem(celebratedKey);
        
        if (!alreadyCelebrated) {
          // Celebrate!
          celebratedMilestoneRef.current = hitMilestone;
          localStorage.setItem(celebratedKey, new Date().toISOString());
          
          // Fire confetti
          setTimeout(() => {
            fireStreakConfetti(hitMilestone);
          }, 500);
          
          // Show celebratory toast
          const messages: Record<number, { title: string; description: string }> = {
            7: { title: "🔥 One Week Streak!", description: "You're building a great habit!" },
            14: { title: "🔥🔥 Two Week Streak!", description: "Incredible consistency!" },
            21: { title: "🔥🔥🔥 Three Weeks!", description: "You're unstoppable!" },
            30: { title: "🏆 One Month Streak!", description: "Legendary dedication!" },
            60: { title: "⭐ 60 Day Streak!", description: "You're a training machine!" },
            90: { title: "👑 90 Day Streak!", description: "Elite commitment!" },
            100: { title: "💯 100 Day Streak!", description: "Absolutely incredible!" },
            180: { title: "🌟 6 Month Streak!", description: "Hall of Fame worthy!" },
            365: { title: "🎉 ONE YEAR STREAK!", description: "You are a legend!" },
          };
          
          const message = messages[hitMilestone] || { 
            title: `🔥 ${hitMilestone} Day Streak!`, 
            description: "Keep up the amazing work!" 
          };
          
          setTimeout(() => {
            toast.success(message.title, message.description);
          }, 800);
        }
      }
    }
  }, [streakData?.currentStreak, id]);

  const isLoading = playerLoading || membershipsLoading || authLoading;

  if (isLoading) {
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

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate("/players")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 rounded-lg bg-white border border-border shadow-sm flex items-center justify-center overflow-hidden">
              <img src={logoImage} alt="The Hockey App" className="w-6 h-6 object-contain" />
            </div>
            <Avatar
              src={player.profile_photo_url}
              fallback={`${player.first_name} ${player.last_initial || ""}`}
              size="sm"
            />
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">
                {player.first_name} {player.last_initial && `${player.last_initial}.`}
              </h1>
            </div>
          </div>
          <NotificationBell />
        </div>
      }
    >
      <PageContainer>
        {/* Player Header */}
        <AppCard className="text-center relative overflow-hidden">
          {/* Streak Badges - positioned top right */}
          {((streakData?.currentStreak ?? 0) > 0 || (streakData?.bestStreak ?? 0) > 0) && (
            <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
              {/* Current Streak */}
              {(streakData?.currentStreak ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-bold text-orange-600">{streakData?.currentStreak}</span>
                  <span className="text-xs text-orange-600/70">day{streakData?.currentStreak !== 1 ? 's' : ''}</span>
                </div>
              )}
              {/* Best Streak - show if greater than current or if no current streak */}
              {(streakData?.bestStreak ?? 0) > 0 && (streakData?.bestStreak ?? 0) > (streakData?.currentStreak ?? 0) && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Trophy className="w-3 h-3 text-amber-500" />
                  <span className="text-xs font-medium text-amber-600">Best: {streakData?.bestStreak}</span>
                </div>
              )}
            </div>
          )}
          <Avatar
            src={player.profile_photo_url}
            fallback={`${player.first_name} ${player.last_initial || ""}`}
            size="xl"
            className="mx-auto mb-4"
          />
          <h2 className="text-xl font-bold">
            {player.first_name} {player.last_initial && `${player.last_initial}.`}
          </h2>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            <Tag variant="neutral">Born {player.birth_year}</Tag>
            {player.jersey_number && (
              <Tag variant="tier">#{player.jersey_number}</Tag>
            )}
          </div>
        </AppCard>

        {/* Active Team */}
        {memberships && memberships.length > 0 && (
          <AppCard
            className="cursor-pointer hover:shadow-medium transition-shadow"
            onClick={() => setShowTeamSelector(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-team-primary/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-team-primary" />
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase font-medium">
                    Active Team
                  </p>
                  <p className="font-semibold">
                    {activeTeam?.name || "Not set"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </div>
          </AppCard>
        )}

        {/* Today's Workout Card */}
        {preferences?.active_team_id && todaySnapshot?.success && (
          <AppCard
            className="cursor-pointer hover:shadow-medium transition-shadow relative overflow-hidden"
            onClick={() => navigate(`/players/${id}/today`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  todaySnapshot.has_card 
                    ? todaySnapshot.progress?.completed === todaySnapshot.progress?.total_required && (todaySnapshot.progress?.total_required ?? 0) > 0
                      ? "bg-success/10"
                      : "bg-team-primary/10"
                    : "bg-surface-muted"
                }`}>
                  {todaySnapshot.has_card ? (
                    todaySnapshot.progress?.completed === todaySnapshot.progress?.total_required && (todaySnapshot.progress?.total_required ?? 0) > 0 ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <Dumbbell className="w-5 h-5 text-team-primary" />
                    )
                  ) : (
                    <Clock className="w-5 h-5 text-text-muted" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase font-medium">
                    Today's Workout
                  </p>
                  {todaySnapshot.has_card ? (
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">
                        {todaySnapshot.progress?.completed === todaySnapshot.progress?.total_required && (todaySnapshot.progress?.total_required ?? 0) > 0
                          ? "Completed!"
                          : `${todaySnapshot.progress?.completed || 0}/${todaySnapshot.progress?.total_required || 0} tasks`
                        }
                      </p>
                      {todaySnapshot.progress?.completed !== todaySnapshot.progress?.total_required && 
                       (todaySnapshot.progress?.total_required ?? 0) > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-primary-foreground bg-team-primary rounded-full animate-pulse">
                          {(todaySnapshot.progress?.total_required || 0) - (todaySnapshot.progress?.completed || 0)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-text-muted">No workout today</p>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </div>
            {/* Progress bar */}
            {todaySnapshot.has_card && (todaySnapshot.progress?.total_required ?? 0) > 0 && (
              <div className="mt-3 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    todaySnapshot.progress?.completed === todaySnapshot.progress?.total_required
                      ? "bg-success"
                      : "bg-team-primary"
                  }`}
                  style={{ 
                    width: `${Math.round(((todaySnapshot.progress?.completed ?? 0) / (todaySnapshot.progress?.total_required ?? 1)) * 100)}%` 
                  }}
                />
              </div>
            )}
          </AppCard>
        )}

        {/* Weekly Summary */}
        {preferences?.active_team_id && (
          <WeeklySummaryCard 
            playerId={id!} 
            teamId={preferences.active_team_id} 
          />
        )}

        {/* Team Activity & Social Section */}
        {preferences?.active_team_id && (
          <>
            {/* Team Activity Feed */}
            <TeamActivityFeed
              teamId={preferences.active_team_id}
              currentPlayerId={id!}
            />

            {/* Weekly Leaderboard */}
            <TeamLeaderboard
              teamId={preferences.active_team_id}
              currentPlayerId={id!}
            />

            {/* Teammate Roster with Badges */}
            <TeammateRoster
              teamId={preferences.active_team_id}
              currentPlayerId={id!}
            />

            {/* Team Cheers Feed */}
            <TeamCheersFeed
              teamId={preferences.active_team_id}
              currentPlayerId={id!}
            />
          </>
        )}

        {/* Teams Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-secondary">Teams</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/join?player=${id}`)}
              className="text-team-primary"
            >
              <Plus className="w-4 h-4 mr-1" />
              Join Team
            </Button>
          </div>

          {memberships && memberships.length > 0 ? (
            <div className="space-y-3">
              {memberships.map((membership) => {
                const team = membership.teams;
                if (!team) return null;

                const palette = teamPalettes.find((p) => p.id === team.palette_id);
                const isActive = team.id === preferences?.active_team_id;

                return (
                  <AppCard
                    key={membership.id}
                    className="cursor-pointer hover:shadow-medium transition-shadow"
                    style={{
                      background: palette
                        ? `linear-gradient(135deg, hsl(${palette.primary} / 0.05), transparent)`
                        : undefined,
                    }}
                    onClick={() => navigate(`/teams/${team.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={team.team_logo_url || team.team_photo_url}
                        fallback={team.name}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate">{team.name}</p>
                          {isActive && (
                            <Tag variant="accent" size="sm">
                              Active
                            </Tag>
                          )}
                        </div>
                        {team.season_label && (
                          <p className="text-sm text-text-muted">
                            {team.season_label}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-text-muted" />
                    </div>
                  </AppCard>
                );
              })}
            </div>
          ) : (
            <AppCard>
              <EmptyState
                icon={Users}
                title="No teams yet"
                description="Join a team using an invite code from your coach."
                action={{
                  label: "Join a Team",
                  onClick: () => navigate(`/join?player=${id}`),
                }}
              />
            </AppCard>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/players/${id}/goals`)}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <Target className="w-5 h-5 text-team-primary" />
            <span className="text-xs">Goals</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/players/${id}/badges`)}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <Trophy className="w-5 h-5 text-amber-500" />
            <span className="text-xs">Badges</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/players/${id}`)}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <User className="w-5 h-5 text-text-muted" />
            <span className="text-xs">Profile</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/players")}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <Users className="w-5 h-5 text-text-muted" />
            <span className="text-xs">Switch</span>
          </Button>
        </div>
      </PageContainer>

      {/* Team Selector Sheet */}
      <Sheet open={showTeamSelector} onOpenChange={setShowTeamSelector}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh]">
          <SheetHeader>
            <SheetTitle>Select Active Team</SheetTitle>
            <SheetDescription>
              Choose which team's workouts and schedule to show.
            </SheetDescription>
          </SheetHeader>
          <div className="py-4 space-y-3">
            {memberships?.map((membership) => {
              const team = membership.teams;
              if (!team) return null;

              const isActive = team.id === preferences?.active_team_id;
              const palette = teamPalettes.find((p) => p.id === team.palette_id);

              return (
                <AppCard
                  key={membership.id}
                  className={`cursor-pointer transition-all ${
                    isActive ? "ring-2 ring-team-primary ring-offset-2" : ""
                  }`}
                  onClick={() => updateActiveTeam.mutate(team.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={team.team_logo_url || team.team_photo_url}
                      fallback={team.name}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{team.name}</p>
                      {team.season_label && (
                        <p className="text-sm text-text-muted">
                          {team.season_label}
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <div className="w-6 h-6 rounded-full bg-team-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </AppCard>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
};

export default PlayerHome;
