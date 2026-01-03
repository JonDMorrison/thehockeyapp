import React, { useState } from "react";
import { Check, ChevronDown, ChevronUp, Circle } from "lucide-react";
import { AppCard, AppCardTitle } from "@/components/app/AppCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ChecklistItem } from "@/hooks/useTeamDashboard";

interface SetupChecklistProps {
  items: ChecklistItem[];
  onAction: (itemId: string) => void;
}

export const SetupChecklist: React.FC<SetupChecklistProps> = ({
  items,
  onAction,
}) => {
  const [showAll, setShowAll] = useState(false);

  const completedCount = items.filter((item) => item.done).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Show only incomplete items by default, up to 3
  const incompleteItems = items.filter((item) => !item.done);
  const displayItems = showAll ? items : incompleteItems.slice(0, 3);

  // If all complete, don't show checklist
  if (completedCount === totalCount) {
    return null;
  }

  return (
    <AppCard>
      <div className="flex items-center justify-between mb-4">
        <AppCardTitle className="text-base">Setup</AppCardTitle>
        <span className="text-sm text-text-muted">
          {completedCount}/{totalCount} complete
        </span>
      </div>

      <Progress value={progressPercent} className="h-2 mb-4" />

      <div className="space-y-2">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors",
              item.done ? "bg-success/10" : "bg-surface-muted"
            )}
          >
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                item.done
                  ? "bg-success text-success-foreground"
                  : "border-2 border-border"
              )}
            >
              {item.done ? (
                <Check className="w-3 h-3" />
              ) : (
                <Circle className="w-2 h-2 opacity-0" />
              )}
            </div>
            <span
              className={cn(
                "flex-1 text-sm",
                item.done && "text-text-muted line-through"
              )}
            >
              {item.label}
            </span>
            {!item.done && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-team-primary"
                onClick={() => onAction(item.id)}
              >
                {item.cta}
              </Button>
            )}
          </div>
        ))}
      </div>

      {incompleteItems.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 text-xs text-text-muted"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>
              Show less <ChevronUp className="w-3 h-3 ml-1" />
            </>
          ) : (
            <>
              Show all ({incompleteItems.length - 3} more){" "}
              <ChevronDown className="w-3 h-3 ml-1" />
            </>
          )}
        </Button>
      )}
    </AppCard>
  );
};
