import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface ChecklistItemProps {
  id: string;
  label: string;
  target?: string;
  icon?: React.ReactNode;
  completed?: boolean;
  disabled?: boolean;
  onToggle?: (id: string, completed: boolean) => void;
}

const ChecklistItem = React.forwardRef<HTMLDivElement, ChecklistItemProps>(
  ({ id, label, target, icon, completed = false, disabled = false, onToggle }, ref) => {
    const [isAnimating, setIsAnimating] = React.useState(false);

    const handleClick = () => {
      if (disabled) return;
      
      if (!completed) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
      }
      
      onToggle?.(id, !completed);
    };

    return (
      <div
        ref={ref}
        onClick={handleClick}
        className={cn(
          "flex items-center gap-3 p-4 rounded-md transition-all duration-200 tap-target cursor-pointer select-none",
          "active:scale-[0.98]",
          !disabled && "hover:bg-muted/50",
          completed && "bg-muted/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        role="checkbox"
        aria-checked={completed}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* Icon area */}
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
          completed ? "bg-success/10 text-success" : "bg-muted text-text-muted"
        )}>
          {icon || (
            <div className="w-5 h-5 rounded-full border-2 border-current opacity-60" />
          )}
        </div>

        {/* Label and target */}
        <div className="flex-1 min-w-0">
          <span className={cn(
            "block text-sm font-medium transition-all duration-200",
            completed && "text-text-muted line-through decoration-text-muted/40"
          )}>
            {label}
          </span>
          {target && (
            <span className="block text-xs text-text-muted mt-0.5">
              {target}
            </span>
          )}
        </div>

        {/* Checkbox */}
        <div className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full border-2 shrink-0 transition-all duration-200",
          completed 
            ? "bg-success border-success text-success-foreground" 
            : "border-border bg-background",
          isAnimating && "animate-check-bounce"
        )}>
          {completed && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
        </div>
      </div>
    );
  }
);
ChecklistItem.displayName = "ChecklistItem";

export { ChecklistItem };
