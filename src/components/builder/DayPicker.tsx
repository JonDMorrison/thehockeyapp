import React from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { DAY_TEMPLATES, DayTemplate } from "@/lib/weekTemplates";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface DayPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (dayTemplate: DayTemplate) => void;
  title?: string;
}

export const DayPicker: React.FC<DayPickerProps> = ({
  open,
  onOpenChange,
  onSelect,
  title = "Choose a day type",
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-3 overflow-y-auto max-h-[calc(70vh-100px)] pb-6">
          {DAY_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                onSelect(template);
                onOpenChange(false);
              }}
              className={cn(
                "w-full p-4 rounded-2xl text-left transition-all duration-200",
                "bg-card border border-border",
                "hover:shadow-medium hover:border-team-primary/30 active:scale-[0.98]"
              )}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-xl",
                  template.color
                )}>
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{template.title}</p>
                  <p className="text-sm text-muted-foreground">{template.subtitle}</p>
                </div>
                {template.estimatedMinutes > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{template.estimatedMinutes}m</span>
                  </div>
                )}
              </div>
              
              {template.taskIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
                  {template.taskIds.slice(0, 4).map((taskId) => (
                    <span
                      key={taskId}
                      className="px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground"
                    >
                      {taskId.replace(/_/g, " ")}
                    </span>
                  ))}
                  {template.taskIds.length > 4 && (
                    <span className="px-2 py-0.5 text-xs text-muted-foreground">
                      +{template.taskIds.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
