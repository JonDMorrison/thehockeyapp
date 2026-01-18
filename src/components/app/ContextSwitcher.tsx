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
import { teamPalettes } from "@/lib/themes";
import { 
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

interface ContextSwitcherProps {
  /** Current team ID (for highlighting) */
  currentTeamId?: string;
  /** Current player ID (for highlighting) */
  currentPlayerId?: string;
  /** Compact mode - just show avatar */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType }> = {
  coach: { label: "Coach", icon: Users },
  parent: { label: "Parent", icon: User },
  player: { label: "Training", icon: Dumbbell },
};

export const ContextSwitcher: React.FC<ContextSwitcherProps> = ({
  currentTeamId,
  currentPlayerId,
  compact = false,
  className,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    availableRoles, 
    isLoading, 
    coachTeams, 
    guardedPlayers, 
    ownPlayer,
    isCoach,
    isParent,
    hasOwnPlayerProfile,
  } = useUserRoles();
  const { activeView, setActiveView, setActiveTeamId, setActivePlayerId } = useActiveView();

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
    // If on a team page, show team name
    if (currentTeamId && coachTeams.length > 0) {
      const team = coachTeams.find(t => t.teamId === currentTeamId);
      if (team) return team.teamName;
    }
    
    // If on a player page, find player name
    if (currentPlayerId) {
      // Check guarded players
      const guarded = guardedPlayers.find(p => p.playerId === currentPlayerId);
      if (guarded) return guarded.playerName;
      
      // Check if it's own player
      if (ownPlayer?.id === currentPlayerId) {
        return `${ownPlayer.firstName} ${ownPlayer.lastName || ""}`.trim();
      }
    }
    
    // Default to active view label
    if (activeView) {
      return roleConfig[activeView]?.label || "Switch";
    }
    
    return "Switch";
  };

  const handleTeamSelect = (teamId: string) => {
    setActiveView("coach");
    setActiveTeamId(teamId);
    setActivePlayerId(null);
    navigate(`/teams/${teamId}`);
  };

  const handlePlayerSelect = (playerId: string, isOwn: boolean) => {
    setActiveView(isOwn ? "player" : "parent");
    setActivePlayerId(playerId);
    setActiveTeamId(null);
    navigate(`/players/${playerId}/home`);
  };

  const contextLabel = getCurrentContextLabel();
  const CurrentIcon = activeView ? roleConfig[activeView]?.icon : Users;

  // Nothing to switch to
  if (availableRoles.length === 0 && coachTeams.length === 0 && guardedPlayers.length === 0 && !ownPlayer) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size={compact ? "icon-sm" : "sm"}
          className={cn("gap-1.5 max-w-[180px]", className)}
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
        
        {/* Coach Teams Section */}
        {isCoach && coachTeams.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-3 h-3" />
              My Teams
            </DropdownMenuLabel>
            {coachTeams.map((team) => {
              const isActive = currentTeamId === team.teamId && activeView === "coach";
              const palette = teamPalettes.find(p => p.id === team.teamId);
              
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
              Create New Team
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Guarded Players Section (Parent View) */}
        {isParent && guardedPlayers.length > 0 && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="w-3 h-3" />
              My Players
            </DropdownMenuLabel>
            {guardedPlayers.map((player) => {
              const isActive = currentPlayerId === player.playerId && activeView === "parent";
              
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
              Add Player
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Own Player Profile (Solo Training) */}
        {hasOwnPlayerProfile && ownPlayer && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-muted-foreground">
              <Dumbbell className="w-3 h-3" />
              My Training
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
                  <p className="text-xs text-muted-foreground">Solo Training</p>
                </div>
                {currentPlayerId === ownPlayer.id && activeView === "player" && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </div>
            </DropdownMenuItem>
          </>
        )}

        {/* Quick Actions at bottom */}
        {(coachTeams.length === 0 && guardedPlayers.length === 0 && !ownPlayer) && (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Get Started
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigate("/teams/new")}
              className="cursor-pointer"
            >
              <Users className="w-4 h-4 mr-2" />
              Create a Team
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/players/new")}
              className="cursor-pointer"
            >
              <User className="w-4 h-4 mr-2" />
              Add a Player
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate("/solo/setup")}
              className="cursor-pointer"
            >
              <Dumbbell className="w-4 h-4 mr-2" />
              Solo Training
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
