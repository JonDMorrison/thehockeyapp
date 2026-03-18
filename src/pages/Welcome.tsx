import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveView } from "@/contexts/ActiveViewContext";
import { WelcomeRoleSelect } from "@/components/onboarding/WelcomeRoleSelect";
import { Loader2 } from "lucide-react";
import { getSelectedRole, clearSelectedRole } from "@/components/marketing/GetStartedModal";

const Welcome: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { activeView, activeTeamId, activePlayerId } = useActiveView();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Check if user already has teams or players
  const { data: existingData, isLoading: checkingData } = useQuery({
    queryKey: ["welcome-check", user?.id],
    queryFn: async () => {
      // Check for teams where user is a coach
      const { data: teams } = await supabase
        .from("team_roles")
        .select("id, team_id")
        .eq("user_id", user!.id)
        .limit(10);

      // Check for players (owned or guarded)
      const { data: ownedPlayers } = await supabase
        .from("players")
        .select("id")
        .eq("owner_user_id", user!.id)
        .limit(10);

      const { data: guardedPlayers } = await supabase
        .from("player_guardians")
        .select("player_id")
        .eq("user_id", user!.id)
        .limit(10);

      // Validate persisted IDs still exist
      const teamIds = teams?.map(t => t.team_id) || [];
      const playerIds = [
        ...(ownedPlayers?.map(p => p.id) || []),
        ...(guardedPlayers?.map(p => p.player_id) || []),
      ];

      return {
        hasTeams: teamIds.length > 0,
        teamIds,
        firstTeamId: teamIds[0] || null,
        hasPlayers: playerIds.length > 0,
        playerIds,
        firstOwnedPlayerId: ownedPlayers?.[0]?.id || null,
        firstGuardedPlayerId: guardedPlayers?.[0]?.player_id || null,
      };
    },
    enabled: !!user,
  });

  // If user already has data, redirect to appropriate page
  // Respect the stored activeView and entity preferences
  useEffect(() => {
    if (existingData) {
      // First check stored role from GetStartedModal (for new signups)
      const storedRole = getSelectedRole();
      if (storedRole) {
        clearSelectedRole();
        if (storedRole === "coach") {
          navigate("/teams/new", { replace: true });
        } else if (storedRole === "solo") {
          navigate("/solo/setup", { replace: true });
        } else if (storedRole === "player") {
          navigate("/players/new", { replace: true });
        }
        return;
      }

      // Try to restore to last used context
      if (activeView === "coach" && existingData.hasTeams) {
        // Use persisted team if valid, otherwise first team
        const targetTeamId = activeTeamId && existingData.teamIds.includes(activeTeamId)
          ? activeTeamId
          : existingData.firstTeamId;
        
        if (targetTeamId) {
          navigate(`/teams/${targetTeamId}`, { replace: true });
        } else {
          navigate("/teams", { replace: true });
        }
        return;
      }

      if (activeView === "player" && existingData.firstOwnedPlayerId) {
        // Use persisted player if valid
        const targetPlayerId = activePlayerId && existingData.playerIds.includes(activePlayerId)
          ? activePlayerId
          : existingData.firstOwnedPlayerId;
        
        navigate(`/players/${targetPlayerId}/home`, { replace: true });
        return;
      }

      if (activeView === "parent" && existingData.hasPlayers) {
        // Use persisted player if valid
        const targetPlayerId = activePlayerId && existingData.playerIds.includes(activePlayerId)
          ? activePlayerId
          : existingData.firstOwnedPlayerId || existingData.firstGuardedPlayerId;
        
        if (targetPlayerId) {
          navigate(`/players/${targetPlayerId}/home`, { replace: true });
        } else {
          navigate("/players", { replace: true });
        }
        return;
      }

      // No stored activeView or doesn't match available roles - use default logic
      if (existingData.hasTeams) {
        const targetTeamId = activeTeamId && existingData.teamIds.includes(activeTeamId)
          ? activeTeamId
          : existingData.firstTeamId;
        
        if (targetTeamId) {
          navigate(`/teams/${targetTeamId}`, { replace: true });
        } else {
          navigate("/teams", { replace: true });
        }
      } else if (existingData.hasPlayers) {
        const targetPlayerId = activePlayerId && existingData.playerIds.includes(activePlayerId)
          ? activePlayerId
          : existingData.firstOwnedPlayerId || existingData.firstGuardedPlayerId;
        
        if (targetPlayerId) {
          navigate(`/players/${targetPlayerId}/home`, { replace: true });
        } else {
          navigate("/players", { replace: true });
        }
      }
      // Otherwise stay on welcome to show role selection
    }
  }, [existingData, activeView, activeTeamId, activePlayerId, navigate]);

  // Show loading state for auth, data checking, or when redirect is pending
  const isRedirecting = existingData?.hasTeams || existingData?.hasPlayers;
  
  if (authLoading || checkingData || isRedirecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  // Show role selection for new users (no teams and no players)
  return <WelcomeRoleSelect displayName={user?.user_metadata?.display_name} />;
};

export default Welcome;
