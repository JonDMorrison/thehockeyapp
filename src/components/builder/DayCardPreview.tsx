import React from "react";
import { cn } from "@/lib/utils";
import { Clock, MoreVertical, X } from "lucide-react";
import { DayTemplate } from "@/lib/weekTemplates";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DayCardPreviewProps {
  dayName: string;
  template: DayTemplate;
  onSwap: () => void;
  onDelete: () => void;
  onClick: () => void;
}

export const DayCardPreview: React.FC<DayCardPreviewProps> = ({
  dayName,
  template,
  onSwap,
  onDelete,
  onClick,
}) => {
  const isRestDay = template.id === "rest_day";

  return (
    <div
      className={cn(
        "relative rounded-2xl p-4 transition-all duration-200 cursor-pointer",
        "hover:shadow-medium active:scale-[0.98]",
        isRestDay 
          ? "bg-muted border border-dashed border-border" 
          : "bg-card border border-border"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {dayName}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger 
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded-lg hover:bg-muted -mr-1 -mt-1"
          >
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSwap(); }}>
              Swap day
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-destructive"
            >
              Make rest day
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Icon & Title */}
      <div className="flex items-center gap-3 mb-2">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
          template.color,
          isRestDay ? "opacity-50" : ""
        )}>
          {template.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-semibold truncate",
            isRestDay && "text-muted-foreground"
          )}>
            {template.title}
          </p>
          <p className="text-xs text-muted-foreground">{template.subtitle}</p>
        </div>
      </div>

      {/* Footer */}
      {!isRestDay && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
          <Clock className="w-3 h-3" />
          <span>{template.estimatedMinutes} min</span>
          <span className="mx-1">•</span>
          <span>{template.taskIds.length} tasks</span>
        </div>
      )}
    </div>
  );
};

// Empty slot for adding a day
export const DayCardEmpty: React.FC<{ dayName: string; onAdd: () => void }> = ({
  dayName,
  onAdd,
}) => {
  return (
    <button
      onClick={onAdd}
      className={cn(
        "w-full rounded-2xl p-4 transition-all duration-200",
        "border-2 border-dashed border-border hover:border-team-primary/50",
        "bg-muted/50 hover:bg-muted",
        "flex flex-col items-center justify-center min-h-[120px]"
      )}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {dayName}
      </p>
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
        <span className="text-2xl text-muted-foreground">+</span>
      </div>
      <p className="text-sm text-muted-foreground">Add day</p>
    </button>
  );
};
