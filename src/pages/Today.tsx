import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useActiveView } from "@/contexts/ActiveViewContext";
import { Loader2 } from "lucide-react";

/**
 * Universal account home. One account may hold association, coach, parent,
 * and player roles, so restore the last valid workspace before using a
 * deterministic fallback.
 */
const Today: React.FC = () => {
  const navigate = useNavigate();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const {
    activeView,
    activeAssociationId,
    activeTeamId,
    activePlayerId,
  } = useActiveView();
  const {
    associationWorkspaces,
    coachTeams,
    guardedPlayers,
    ownPlayer,
    isLoading: rolesLoading,
  } = useUserRoles();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/auth", { replace: true });
      return;
    }
    if (authLoading || rolesLoading || !isAuthenticated) return;

    const associationIds = associationWorkspaces.map(({ associationId }) => associationId);
    const teamIds = coachTeams.map(({ teamId }) => teamId);
    const playerIds = guardedPlayers.map(({ playerId }) => playerId);

    if (activeView === "association" && activeAssociationId && associationIds.includes(activeAssociationId)) {
      navigate(`/associations/${activeAssociationId}`, { replace: true });
      return;
    }
    if (activeView === "coach" && activeTeamId && teamIds.includes(activeTeamId)) {
      navigate(`/teams/${activeTeamId}`, { replace: true });
      return;
    }
    if (activeView === "parent" && activePlayerId && playerIds.includes(activePlayerId)) {
      navigate(`/players/${activePlayerId}/home`, { replace: true });
      return;
    }
    if (activeView === "player" && ownPlayer) {
      navigate(`/players/${ownPlayer.id}/home`, { replace: true });
      return;
    }

    const firstAssociation = associationWorkspaces[0];
    const firstTeam = coachTeams[0];
    const firstPlayer = guardedPlayers[0];
    if (firstAssociation) navigate(`/associations/${firstAssociation.associationId}`, { replace: true });
    else if (firstTeam) navigate(`/teams/${firstTeam.teamId}`, { replace: true });
    else if (firstPlayer) navigate(`/players/${firstPlayer.playerId}/home`, { replace: true });
    else if (ownPlayer) navigate(`/players/${ownPlayer.id}/home`, { replace: true });
    else navigate("/welcome", { replace: true });
  }, [
    activeAssociationId,
    activePlayerId,
    activeTeamId,
    activeView,
    associationWorkspaces,
    authLoading,
    coachTeams,
    guardedPlayers,
    isAuthenticated,
    navigate,
    ownPlayer,
    rolesLoading,
  ]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
};

export default Today;
