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
import { useUserRoles, UserRole } from "@/hooks/useUserRoles";
import { useActiveView } from "@/contexts/ActiveViewContext";
import { 
  Users, 
  User, 
  Dumbbell, 
  ChevronDown, 
  Check,
  Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; description: string }> = {
  coach: {
    label: "Coach View",
    icon: Users,
    description: "Manage team & workouts",
  },
  parent: {
    label: "Parent View", 
    icon: User,
    description: "Monitor your player",
  },
  player: {
    label: "My Training",
    icon: Dumbbell,
    description: "Do your workouts",
  },
};

interface RoleSwitcherProps {
  /** Current team ID (for context-aware navigation) */
  teamId?: string;
  /** Current player ID (for context-aware navigation) */
  playerId?: string;
  /** Compact mode - just show icon */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  teamId,
  playerId,
  compact = false,
  className,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { availableRoles, isLoading, coachTeams, guardedPlayers, ownPlayer } = useUserRoles();
  const { activeView, setActiveView } = useActiveView();

  // Don't show if user only has one role
  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className={className}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  // Need at least 2 roles to show switcher
  if (availableRoles.length < 2) {
    return null;
  }

  const currentRole = activeView || availableRoles[0];
  const CurrentIcon = roleConfig[currentRole]?.icon || Users;

  const handleRoleSwitch = (role: UserRole) => {
    setActiveView(role);

    // Navigate to appropriate view based on role
    switch (role) {
      case "coach":
        if (teamId) {
          navigate(`/teams/${teamId}`);
        } else if (coachTeams.length > 0) {
          navigate(`/teams/${coachTeams[0].teamId}`);
        } else {
          navigate("/teams");
        }
        break;
      case "parent":
        if (playerId) {
          navigate(`/players/${playerId}/today`);
        } else if (guardedPlayers.length > 0) {
          navigate(`/players/${guardedPlayers[0].playerId}/today`);
        } else {
          navigate("/players");
        }
        break;
      case "player":
        if (ownPlayer) {
          navigate(`/players/${ownPlayer.id}/today`);
        }
        break;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size={compact ? "icon-sm" : "sm"}
          className={cn("gap-1.5", className)}
        >
          <CurrentIcon className="w-4 h-4" />
          {!compact && (
            <>
              <span className="hidden sm:inline">{roleConfig[currentRole]?.label}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch View</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableRoles.map((role) => {
          const config = roleConfig[role];
          const Icon = config.icon;
          const isActive = role === currentRole;

          return (
            <DropdownMenuItem
              key={role}
              onClick={() => handleRoleSwitch(role)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
                {isActive && <Check className="w-4 h-4 text-primary" />}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
