import React from "react";
import { UserPlus, Layers, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onInviteParents: () => void;
  onCreateWeekPlan: () => void;
  onViewRoster: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onInviteParents,
  onCreateWeekPlan,
  onViewRoster,
}) => {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="flex-1 h-auto py-3 flex-col gap-1"
        onClick={onInviteParents}
      >
        <UserPlus className="w-4 h-4 text-team-primary" />
        <span className="text-xs">Invite</span>
      </Button>
      <Button
        variant="outline"
        className="flex-1 h-auto py-3 flex-col gap-1"
        onClick={onCreateWeekPlan}
      >
        <Layers className="w-4 h-4 text-team-primary" />
        <span className="text-xs">Week Plan</span>
      </Button>
      <Button
        variant="outline"
        className="flex-1 h-auto py-3 flex-col gap-1"
        onClick={onViewRoster}
      >
        <Users className="w-4 h-4 text-team-primary" />
        <span className="text-xs">Roster</span>
      </Button>
    </div>
  );
};
