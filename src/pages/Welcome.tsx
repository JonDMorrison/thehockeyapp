import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WelcomeRoleSelect } from "@/components/onboarding/WelcomeRoleSelect";
import { Loader2 } from "lucide-react";

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();

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
        .select("id")
        .eq("user_id", user!.id)
        .limit(1);

      // Check for players
      const { data: players } = await supabase
        .from("player_guardians")
        .select("player_id")
        .eq("user_id", user!.id)
        .limit(1);

      return {
        hasTeams: (teams?.length || 0) > 0,
        hasPlayers: (players?.length || 0) > 0,
      };
    },
    enabled: !!user,
  });

  // If user already has data, redirect to appropriate page
  useEffect(() => {
    if (existingData) {
      if (existingData.hasTeams) {
        navigate("/teams", { replace: true });
      } else if (existingData.hasPlayers) {
        navigate("/players", { replace: true });
      }
      // If neither, stay on welcome to show role selection
    }
  }, [existingData, navigate]);

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
