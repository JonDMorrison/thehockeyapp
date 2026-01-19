import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

/**
 * Today route - redirects to the appropriate player home page
 * This acts as a smart redirect that finds the user's player and sends them to their dashboard
 */
const Today: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Fetch players the user owns or is guardian of
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
    enabled: !!user,
  });

  // Redirect once we have the data
  useEffect(() => {
    if (!playersLoading && players) {
      if (players.length > 0) {
        // Redirect to the first player's home
        navigate(`/players/${players[0].id}/home`, { replace: true });
      } else {
        // No players - send to players list to create one
        navigate("/players", { replace: true });
      }
    }
  }, [players, playersLoading, navigate]);

  // Show loading spinner while determining redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default Today;
