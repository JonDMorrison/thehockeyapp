import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon: Icon, illustration, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center py-12 px-6 text-center",
          className
        )}
        {...props}
      >
        {illustration && (
          <div className="mb-4">{illustration}</div>
        )}
        {Icon && !illustration && (
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Icon className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
          </div>
        )}
        <h3 className="text-base font-semibold text-foreground mb-1">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-text-muted max-w-[280px]">
            {description}
          </p>
        )}
        {action && (
          <Button
            onClick={action.onClick}
            variant="default"
            className="mt-5"
          >
            {action.label}
          </Button>
        )}
      </div>
    );
  }
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
