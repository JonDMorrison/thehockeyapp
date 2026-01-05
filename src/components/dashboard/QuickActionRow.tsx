import React from "react";
import { Button } from "@/components/ui/button";
import { Users, Layers, Trophy, UserPlus } from "lucide-react";

interface QuickActionRowProps {
  onRoster: () => void;
  onWeekPlan: () => void;
  onProgress: () => void;
  onInvite: () => void;
}

export const QuickActionRow: React.FC<QuickActionRowProps> = ({
  onRoster,
  onWeekPlan,
  onProgress,
  onInvite,
}) => {
  const actions = [
    { icon: Users, label: "Roster", onClick: onRoster },
    { icon: Layers, label: "Plan", onClick: onWeekPlan },
    { icon: Trophy, label: "Progress", onClick: onProgress },
    { icon: UserPlus, label: "Invite", onClick: onInvite },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map(({ icon: Icon, label, onClick }) => (
        <Button
          key={label}
          variant="action"
          className="flex-col h-auto py-3 gap-1.5"
          onClick={onClick}
        >
          <Icon className="w-5 h-5 text-team-primary" />
          <span className="text-xs font-medium">{label}</span>
        </Button>
      ))}
    </div>
  );
};
