import * as React from "react";
import { cn } from "@/lib/utils";

interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "muted";
  header?: React.ReactNode;
  actions?: React.ReactNode;
}

const AppCard = React.forwardRef<HTMLDivElement, AppCardProps>(
  ({ className, variant = "default", header, actions, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border transition-shadow duration-200",
          variant === "default" && "bg-card shadow-subtle hover:shadow-medium",
          variant === "muted" && "bg-surface-muted border-transparent",
          className
        )}
        {...props}
      >
        {(header || actions) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-muted">
            {header && <div className="font-semibold text-sm">{header}</div>}
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        )}
        <div className={cn((header || actions) ? "p-4" : "p-4")}>
          {children}
        </div>
      </div>
    );
  }
);
AppCard.displayName = "AppCard";

interface AppCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const AppCardTitle = React.forwardRef<HTMLHeadingElement, AppCardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  )
);
AppCardTitle.displayName = "AppCardTitle";

interface AppCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const AppCardDescription = React.forwardRef<HTMLParagraphElement, AppCardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-text-secondary", className)}
      {...props}
    />
  )
);
AppCardDescription.displayName = "AppCardDescription";

export { AppCard, AppCardTitle, AppCardDescription };
