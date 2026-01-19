import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveView } from "@/contexts/ActiveViewContext";
import { Loader2 } from "lucide-react";

/**
 * Today route - redirects to the appropriate player home page
 * Uses the persisted activePlayerId from context, or finds the first available player
 */
const Today: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { activePlayerId } = useActiveView();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // If we already have an active player stored, redirect immediately
  useEffect(() => {
    if (!authLoading && isAuthenticated && activePlayerId) {
      navigate(`/players/${activePlayerId}/home`, { replace: true });
    }
  }, [authLoading, isAuthenticated, activePlayerId, navigate]);

  // Fetch players only if we don't have an active player stored
  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ["my-players-redirect"],
    queryFn: async () => {
      // First get players user owns
      const { data: ownedPlayers, error: ownedError } = await supabase
        .from("players")
        .select("id")
        .eq("owner_user_id", user!.id)
        .limit(1);

      if (ownedError) throw ownedError;
      if (ownedPlayers && ownedPlayers.length > 0) {
        return ownedPlayers;
      }

      // Otherwise check for guardian relationships
      const { data: guardianships, error: guardError } = await supabase
        .from("player_guardians")
        .select("player_id")
        .eq("user_id", user!.id)
        .limit(1);

      if (guardError) throw guardError;
      return guardianships?.map(g => ({ id: g.player_id })) || [];
    },
    enabled: !!user && !activePlayerId, // Only fetch if no stored player
  });

  // Redirect once we have the data (fallback when no stored player)
  useEffect(() => {
    if (!activePlayerId && !playersLoading && players) {
      if (players.length > 0) {
        navigate(`/players/${players[0].id}/home`, { replace: true });
      } else {
        navigate("/players", { replace: true });
      }
    }
  }, [players, playersLoading, activePlayerId, navigate]);

  // Show loading spinner while determining redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default Today;
