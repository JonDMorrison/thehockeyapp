import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/app/Avatar";
import { useUserRoles, UserRole } from "@/hooks/useUserRoles";
import { useActiveView } from "@/contexts/ActiveViewContext";
import {
  Building2,
  Users,
  User,
  Dumbbell,
  ChevronDown,
  Check,
  Loader2,
  Shield,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface ContextSwitcherProps {
  /** Current team ID (for highlighting) */
  currentTeamId?: string;
  /** Current player ID (for highlighting) */
  currentPlayerId?: string;
  /** Current association ID (for highlighting) */
  currentAssociationId?: string;
  /** Compact mode - just show avatar */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

const roleConfig: Record<UserRole, { labelKey: string; icon: React.ElementType }> = {
  association: { labelKey: "nav.roleAssociation", icon: Building2 },
  coach: { labelKey: "nav.roleCoach", icon: Users },
  parent: { labelKey: "nav.roleParent", icon: User },
  player: { labelKey: "nav.roleTraining", icon: Dumbbell },
};

export const ContextSwitcher: React.FC<ContextSwitcherProps> = ({
  currentTeamId,
  currentPlayerId,
  currentAssociationId,
  compact = false,
  className,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    associationWorkspaces,
    availableRoles,
    isLoading,
    coachTeams,
    guardedPlayers,
    ownPlayer,
    isAssociation,
    isCoach,
    isParent,
    hasOwnPlayerProfile,
  } = useUserRoles();
  const {
    activeView,
    setActiveView,
    setActiveTeamId,
    setActivePlayerId,
    setActiveAssociationId,
  } = useActiveView();

  const routeTeamId = currentTeamId ?? location.pathname.match(/^\/teams\/([^/]+)/)?.[1];
  const routePlayerId = currentPlayerId ?? location.pathname.match(/^\/players\/([^/]+)/)?.[1];
  const routeAssociationId = currentAssociationId ?? location.pathname.match(/^\/associations\/([^/]+)/)?.[1];

  // Loading state
  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className={className}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  // Determine what to show as the current context label
  const getCurrentContextLabel = () => {
    if (routeAssociationId && associationWorkspaces.length > 0) {
      const association = associationWorkspaces.find(a => a.associationId === routeAssociationId);
      if (association) return association.associationName;
    }

    // If on a team page, show team name
    if (routeTeamId && coachTeams.length > 0) {
      const team = coachTeams.find(t => t.teamId === routeTeamId);
      if (team) return team.teamName;
    }

    // If on a player page, find player name
    if (routePlayerId) {
      // Check guarded players
      const guarded = guardedPlayers.find(p => p.playerId === routePlayerId);
      if (guarded) return guarded.playerName;

      // Check if it's own player
      if (ownPlayer?.id === routePlayerId) {
        return `${ownPlayer.firstName} ${ownPlayer.lastName || ""}`.trim();
      }
    }

    // Default to active view label
    if (activeView) {
      return t(roleConfig[activeView]?.labelKey) || t("nav.switch");
    }

    return t("nav.switch");
  };

  const handleAssociationSelect = (associationId: string) => {
    setActiveView("association");
    setActiveAssociationId(associationId);
    setActiveTeamId(null);
    setActivePlayerId(null);
    navigate(`/associations/${associationId}`);
  };

  const handleTeamSelect = (teamId: string) => {
    setActiveView("coach");
    setActiveTeamId(teamId);
    setActivePlayerId(null);
    setActiveAssociationId(null);
    navigate(`/teams/${teamId}`);
  };

  const handlePlayerSelect = (playerId: string, isOwn: boolean) => {
    setActiveView(isOwn ? "player" : "parent");
    setActivePlayerId(playerId);
    setActiveTeamId(null);
    setActiveAssociationId(null);
    navigate(`/players/${playerId}/home`);
  };

  const contextLabel = getCurrentContextLabel();
  const CurrentIcon = activeView ? roleConfig[activeView]?.icon : Users;

  // Nothing to switch to
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon-sm" : "sm"}
          className={cn("gap-1.5 max-w-[180px]", className)}
          aria-label={t("nav.switchWorkspace")}
        >
          <CurrentIcon className="w-4 h-4 shrink-0" />
          {!compact && (
            <>
              <span className="truncate">{contextLabel}</span>
              <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-[400px] overflow-y-auto">

        {/* Association Workspaces Section */}
        {isAssociation && associationWorkspaces.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="w-3 h-3" />
              {t("nav.myAssociations")}
            </DropdownMenuLabel>
            {associationWorkspaces.map((association) => {
              const isActive = routeAssociationId === association.associationId && activeView === "association";

              return (
                <DropdownMenuItem
                  key={association.associationId}
                  onClick={() => handleAssociationSelect(association.associationId)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar fallback={association.associationName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{association.associationName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{association.role.replace("_", " ")}</p>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuItem
              onClick={() => navigate("/associations/new")}
              className="cursor-pointer text-muted-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("nav.createNewAssociation")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Coach Teams Section */}
        {isCoach && coachTeams.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" />
              {t("nav.myTeams")}
            </DropdownMenuLabel>
            {coachTeams.map((team) => {
              const isActive = routeTeamId === team.teamId && activeView === "coach";

              return (
                <DropdownMenuItem
                  key={team.teamId}
                  onClick={() => handleTeamSelect(team.teamId)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar
                      fallback={team.teamName}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{team.teamName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{team.role.replace("_", " ")}</p>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuItem
              onClick={() => navigate("/teams/new")}
              className="cursor-pointer text-muted-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("nav.createNewTeam")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Guarded Players Section (Parent View) */}
        {isParent && guardedPlayers.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              {t("nav.myPlayers")}
            </DropdownMenuLabel>
            {guardedPlayers.map((player) => {
              const isActive = routePlayerId === player.playerId && activeView === "parent";

              return (
                <DropdownMenuItem
                  key={player.playerId}
                  onClick={() => handlePlayerSelect(player.playerId, false)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar
                      fallback={player.playerName}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{player.playerName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{player.guardianRole}</p>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuItem
              onClick={() => navigate("/players/new")}
              className="cursor-pointer text-muted-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("nav.addPlayer")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Own Player Profile (Solo Training) */}
        {hasOwnPlayerProfile && ownPlayer && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Dumbbell className="w-3 h-3" />
              {t("nav.myTraining")}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => handlePlayerSelect(ownPlayer.id, true)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3 flex-1">
                <Avatar
                  fallback={`${ownPlayer.firstName} ${ownPlayer.lastName || ""}`}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {ownPlayer.firstName} {ownPlayer.lastName || ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("nav.soloTraining")}</p>
                </div>
                {routePlayerId === ownPlayer.id && activeView === "player" && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </div>
            </DropdownMenuItem>
          </>
        )}

        {/* Missing roles can be added to this same account. */}
        {(!isAssociation || !isCoach || !isParent || !hasOwnPlayerProfile) && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {availableRoles.length === 0 ? t("nav.getStarted") : t("nav.addAnotherRole")}
            </DropdownMenuLabel>
            {!isAssociation && (
              <DropdownMenuItem onClick={() => navigate("/associations/new")} className="cursor-pointer">
                <Building2 className="w-4 h-4 mr-2" />
                {t("nav.createAnAssociation")}
              </DropdownMenuItem>
            )}
            {!isCoach && (
              <DropdownMenuItem onClick={() => navigate("/teams/new")} className="cursor-pointer">
                <Users className="w-4 h-4 mr-2" />
                {t("nav.createATeam")}
              </DropdownMenuItem>
            )}
            {!isParent && (
              <DropdownMenuItem onClick={() => navigate("/players/new")} className="cursor-pointer">
                <User className="w-4 h-4 mr-2" />
                {t("nav.addAPlayer")}
              </DropdownMenuItem>
            )}
            {!hasOwnPlayerProfile && (
              <DropdownMenuItem onClick={() => navigate("/solo/setup")} className="cursor-pointer">
                <Dumbbell className="w-4 h-4 mr-2" />
                {t("nav.soloTraining")}
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
