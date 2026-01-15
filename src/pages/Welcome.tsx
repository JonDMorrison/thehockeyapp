import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveView } from "@/contexts/ActiveViewContext";
import { WelcomeRoleSelect } from "@/components/onboarding/WelcomeRoleSelect";
import { Loader2 } from "lucide-react";
import { getSelectedRole, clearSelectedRole } from "@/components/marketing/GetStartedModal";

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { activeView } = useActiveView();

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
        .limit(1);

      // Check for players (owned or guarded)
      const { data: ownedPlayers } = await supabase
        .from("players")
        .select("id")
        .eq("owner_user_id", user!.id)
        .limit(1);

      const { data: guardedPlayers } = await supabase
        .from("player_guardians")
        .select("player_id")
        .eq("user_id", user!.id)
        .limit(1);

      return {
        hasTeams: (teams?.length || 0) > 0,
        firstTeamId: teams?.[0]?.team_id || null,
        hasPlayers: (ownedPlayers?.length || 0) > 0 || (guardedPlayers?.length || 0) > 0,
        firstOwnedPlayerId: ownedPlayers?.[0]?.id || null,
        firstGuardedPlayerId: guardedPlayers?.[0]?.player_id || null,
      };
    },
    enabled: !!user,
  });

  // If user already has data, redirect to appropriate page
  // Respect the stored activeView preference
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

      // Respect the persisted activeView from localStorage
      if (activeView === "coach" && existingData.hasTeams) {
        if (existingData.firstTeamId) {
          navigate(`/teams/${existingData.firstTeamId}`, { replace: true });
        } else {
          navigate("/teams", { replace: true });
        }
        return;
      }

      if (activeView === "player" && existingData.firstOwnedPlayerId) {
        navigate(`/players/${existingData.firstOwnedPlayerId}/home`, { replace: true });
        return;
      }

      if (activeView === "parent" && existingData.hasPlayers) {
        const playerId = existingData.firstOwnedPlayerId || existingData.firstGuardedPlayerId;
        if (playerId) {
          navigate(`/players/${playerId}/today`, { replace: true });
        } else {
          navigate("/players", { replace: true });
        }
        return;
      }

      // No stored activeView or doesn't match available roles - use default logic
      if (existingData.hasTeams) {
        navigate("/teams", { replace: true });
      } else if (existingData.hasPlayers) {
        navigate("/players", { replace: true });
      }
      // Otherwise stay on welcome to show role selection
    }
  }, [existingData, activeView, navigate]);

  if (authLoading || checkingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show role selection for new users
  if (!existingData?.hasTeams && !existingData?.hasPlayers) {
    return <WelcomeRoleSelect displayName={user?.user_metadata?.display_name} />;
  }

  return null;
};

export default Welcome;
