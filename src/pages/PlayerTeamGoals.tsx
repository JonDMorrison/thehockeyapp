import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeamTheme } from "@/hooks/useTeamTheme";
import { useTeamGoal, useGoalContributions, TeamGoal, GoalContribution } from "@/hooks/useTeamGoal";
import { AppShell, PageContainer, PageHeader } from "@/components/app/AppShell";
import { AppCard, AppCardTitle, AppCardDescription } from "@/components/app/AppCard";
import { Avatar } from "@/components/app/Avatar";
import { EmptyState } from "@/components/app/EmptyState";
import { SkeletonCard } from "@/components/app/Skeleton";
import { Tag } from "@/components/app/Tag";
import { GoalThermometer } from "@/components/goals/GoalThermometer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import {
  ChevronLeft,
  Target,
  Trophy,
  Medal,
  Award,
  Clock,
  Flame,
  Gift,
  Users,
  Star,
  TrendingUp,
  Calendar,
  CheckCircle,
  Pizza,
  Gamepad2,
} from "lucide-react";

// Reward display config
const rewardConfig: Record<string, { emoji: string; label: string; icon: React.ComponentType<any>; color: string }> = {
  badges: { emoji: "🏅", label: "Badge Hunt", icon: Medal, color: "from-amber-500 to-yellow-500" },
  scrimmage: { emoji: "🏒", label: "Scrimmage Game", icon: Gamepad2, color: "from-blue-500 to-cyan-500" },
  pizza: { emoji: "🍕", label: "Pizza Party", icon: Pizza, color: "from-red-500 to-orange-500" },
  trophy: { emoji: "🏆", label: "Team Trophy", icon: Trophy, color: "from-yellow-500 to-amber-600" },
  stars: { emoji: "⭐", label: "Star Stickers", icon: Star, color: "from-purple-500 to-pink-500" },
  surprise: { emoji: "🎁", label: "Mystery Prize", icon: Gift, color: "from-emerald-500 to-teal-500" },
  custom: { emoji: "🎯", label: "Custom Reward", icon: Gift, color: "from-indigo-500 to-purple-500" },
};

const rankIcons = [Trophy, Medal, Award];
const rankColors = ["text-amber-500", "text-slate-400", "text-amber-700"];

const PlayerTeamGoals: React.FC = () => {
  const { id: playerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { setTeamTheme } = useTeamTheme();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch player
  const { data: player, isLoading: playerLoading } = useQuery({
    queryKey: ["player", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!playerId,
  });

  // Fetch active team preference
  const { data: preferences } = useQuery({
    queryKey: ["player-preferences", playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("player_team_preferences")
        .select("*, teams:active_team_id(id, name, palette_id)")
        .eq("player_id", playerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!playerId,
  });

  // Apply team theme
  useEffect(() => {
    const team = preferences?.teams as { id: string; name: string; palette_id: string } | null;
    if (team?.palette_id) {
      setTeamTheme(team.palette_id);
    }
  }, [preferences, setTeamTheme]);

  const teamId = preferences?.active_team_id;
  const teamName = (preferences?.teams as { name: string } | null)?.name;

  // Fetch current goal
  const { data: goal, isLoading: goalLoading } = useTeamGoal(teamId);
  const { data: contributions, isLoading: contributionsLoading } = useGoalContributions(goal?.id);

  // Fetch goal history
  const { data: goalHistory } = useQuery({
    queryKey: ["goal-history", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_goals")
        .select("*")
        .eq("team_id", teamId)
        .in("status", ["completed", "failed"])
        .order("end_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as TeamGoal[];
    },
    enabled: !!teamId,
  });

  // Find player's contribution
  const myContribution = contributions?.find((c) => c.player_id === playerId);
  const myRank = contributions?.findIndex((c) => c.player_id === playerId);

  // Set up real-time subscription for goal updates
  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel(`team-goals-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_goals",
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["team-goal", teamId] });
          queryClient.invalidateQueries({ queryKey: ["goal-history", teamId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_goal_contributions",
        },
        () => {
          if (goal?.id) {
            queryClient.invalidateQueries({ queryKey: ["goal-contributions", goal.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, goal?.id, queryClient]);

  const isLoading = playerLoading || authLoading || goalLoading;

  if (isLoading) {
    return (
      <AppShell hideNav>
        <PageContainer>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </PageContainer>
      </AppShell>
    );
  }

  const progress = goal ? Math.min((goal.current_value / goal.target_value) * 100, 100) : 0;
  const daysLeft = goal ? differenceInDays(new Date(goal.end_date), new Date()) : 0;
  const reward = goal?.reward_type ? rewardConfig[goal.reward_type] || rewardConfig.custom : null;

  return (
    <AppShell
      hideNav
      header={
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate(`/players/${playerId}/home`)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <PageHeader title="Team Goals" subtitle={teamName || "Team"} />
        </div>
      }
    >
      <PageContainer>
        {!teamId ? (
          <AppCard>
            <EmptyState
              icon={Users}
              title="No Active Team"
              description="Join a team to see team goals and contribute to shared achievements."
              action={{
                label: "Join a Team",
                onClick: () => navigate(`/join?player=${playerId}`),
              }}
            />
          </AppCard>
        ) : !goal ? (
          <AppCard>
            <EmptyState
              icon={Target}
              title="No Active Goal"
              description="Your coach hasn't set a team goal yet. Check back soon!"
            />
          </AppCard>
        ) : (
          <>
            {/* Current Goal Hero Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AppCard className="relative overflow-hidden">
                {/* Gradient header */}
                <div
                  className={cn(
                    "absolute top-0 left-0 right-0 h-1.5",
                    goal.status === "completed"
                      ? "bg-gradient-to-r from-green-400 to-emerald-500"
                      : progress >= 75
                      ? "bg-gradient-to-r from-orange-400 to-red-500"
                      : progress >= 50
                      ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                      : "bg-gradient-to-r from-blue-400 to-cyan-500"
                  )}
                />

                <div className="pt-4">
                  {/* Goal Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-5 h-5 text-team-primary" />
                        <h2 className="text-lg font-bold">{goal.name}</h2>
                      </div>
                      {goal.description && (
                        <p className="text-sm text-text-muted">{goal.description}</p>
                      )}
                    </div>
                    {goal.status === "completed" ? (
                      <Badge className="bg-success/10 text-success border-success/20">
                        <Trophy className="w-3 h-3 mr-1" />
                        Achieved!
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? "Last day!" : "Ended"}
                      </Badge>
                    )}
                  </div>

                  {/* Thermometer and Stats */}
                  <div className="flex gap-6 items-center">
                    <GoalThermometer
                      current={goal.current_value}
                      target={goal.target_value}
                      goalType={goal.goal_type}
                      size="lg"
                      showMilestones
                    />

                    <div className="flex-1 space-y-4">
                      {/* Progress Stats */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-text-muted">Progress</span>
                          <span className="font-bold">
                            {goal.current_value.toLocaleString()} / {goal.target_value.toLocaleString()}
                          </span>
                        </div>
                        <Progress value={progress} className="h-3" />
                        <p className="text-xs text-text-muted mt-1">
                          {Math.round(progress)}% complete
                        </p>
                      </div>

                      {/* Reward */}
                      {reward && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-team-primary/10 to-accent/10 border border-team-primary/20">
                          <span className="text-2xl">{reward.emoji}</span>
                          <div>
                            <p className="text-xs text-text-muted">Reward</p>
                            <p className="font-semibold">
                              {goal.reward_description || reward.label}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Time Range */}
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(new Date(goal.start_date), "MMM d")} -{" "}
                          {format(new Date(goal.end_date), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </AppCard>
            </motion.div>

            {/* My Contribution Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <AppCard>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-team-primary/10 flex items-center justify-center">
                    {myContribution && myRank !== undefined && myRank < 3 ? (
                      React.createElement(rankIcons[myRank], {
                        className: cn("w-7 h-7", rankColors[myRank]),
                      })
                    ) : (
                      <TrendingUp className="w-7 h-7 text-team-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-text-muted uppercase font-medium">
                      Your Contribution
                    </p>
                    <p className="text-2xl font-bold">
                      {myContribution?.contribution_value.toLocaleString() || 0}
                      <span className="text-sm font-normal text-text-muted ml-1">
                        {goal.goal_type === "shots" ? "shots" : goal.goal_type === "sessions" ? "sessions" : "points"}
                      </span>
                    </p>
                    {myRank !== undefined && myRank >= 0 && (
                      <p className="text-sm text-text-muted">
                        Ranked #{myRank + 1} on the team
                      </p>
                    )}
                  </div>
                  {myContribution && myContribution.contribution_value > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-text-muted">Team Impact</p>
                      <p className="text-lg font-bold text-team-primary">
                        {Math.round((myContribution.contribution_value / goal.current_value) * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              </AppCard>
            </motion.div>

            {/* Team Leaderboard */}
            {contributions && contributions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <AppCard>
                  <AppCardTitle className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-team-primary" />
                    Team Leaderboard
                  </AppCardTitle>

                  <div className="space-y-2">
                    <AnimatePresence>
                      {contributions.map((contribution, index) => {
                        const isMe = contribution.player_id === playerId;
                        const RankIcon = index < 3 ? rankIcons[index] : null;

                        return (
                          <motion.div
                            key={contribution.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg transition-colors",
                              isMe
                                ? "bg-team-primary/10 border border-team-primary/20"
                                : "bg-surface-muted/50"
                            )}
                          >
                            {/* Rank */}
                            <div className="w-8 flex justify-center">
                              {RankIcon ? (
                                <RankIcon className={cn("w-5 h-5", rankColors[index])} />
                              ) : (
                                <span className="text-sm font-medium text-text-muted">
                                  {index + 1}
                                </span>
                              )}
                            </div>

                            {/* Player */}
                            <Avatar
                              src={contribution.player?.profile_photo_url}
                              fallback={`${contribution.player?.first_name || "?"} ${contribution.player?.last_initial || ""}`}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={cn("font-medium truncate", isMe && "text-team-primary")}>
                                {contribution.player?.first_name}{" "}
                                {contribution.player?.last_initial && `${contribution.player.last_initial}.`}
                                {isMe && " (You)"}
                              </p>
                            </div>

                            {/* Value */}
                            <div className="text-right">
                              <p className="font-bold">
                                {contribution.contribution_value.toLocaleString()}
                              </p>
                              <p className="text-xs text-text-muted">
                                {Math.round((contribution.contribution_value / goal.current_value) * 100)}%
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </AppCard>
              </motion.div>
            )}

            {/* Goal History */}
            {goalHistory && goalHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-text-secondary">Past Goals</h3>
                </div>
                <div className="space-y-2">
                  {goalHistory.map((pastGoal) => (
                    <AppCard key={pastGoal.id} className="py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            pastGoal.status === "completed"
                              ? "bg-success/10"
                              : "bg-destructive/10"
                          )}
                        >
                          {pastGoal.status === "completed" ? (
                            <CheckCircle className="w-5 h-5 text-success" />
                          ) : (
                            <Clock className="w-5 h-5 text-destructive" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{pastGoal.name}</p>
                          <p className="text-xs text-text-muted">
                            {format(new Date(pastGoal.end_date), "MMM d, yyyy")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">
                            {pastGoal.current_value}/{pastGoal.target_value}
                          </p>
                          <Tag
                            variant={pastGoal.status === "completed" ? "accent" : "neutral"}
                            size="sm"
                          >
                            {pastGoal.status === "completed" ? "Achieved" : "Missed"}
                          </Tag>
                        </div>
                      </div>
                    </AppCard>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default PlayerTeamGoals;
