import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-md bg-muted animate-pulse",
        className
      )}
      {...props}
    />
  )
);
Skeleton.displayName = "Skeleton";

// Generic card skeleton (fallback)
const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg bg-card border p-4 shadow-subtle space-y-3", className)}
      {...props}
    >
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
);
SkeletonCard.displayName = "SkeletonCard";

// List item skeleton with avatar
const SkeletonListItem = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-3 p-4", className)}
      {...props}
    >
      <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="w-6 h-6 rounded-full shrink-0" />
    </div>
  )
);
SkeletonListItem.displayName = "SkeletonListItem";

// Avatar skeleton
const SkeletonAvatar = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <Skeleton
      ref={ref}
      className={cn("w-10 h-10 rounded-full", className)}
      {...props}
    />
  )
);
SkeletonAvatar.displayName = "SkeletonAvatar";

// Team/Player card skeleton - matches AppCard with avatar + text + tags
const SkeletonTeamCard = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg bg-card border p-4 shadow-subtle", className)}
      {...props}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="w-5 h-5 rounded shrink-0" />
      </div>
    </div>
  )
);
SkeletonTeamCard.displayName = "SkeletonTeamCard";

// Hero card skeleton - centered layout with emoji/icon area
const SkeletonHeroCard = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg bg-card border p-4 shadow-subtle", className)}
      {...props}
    >
      <div className="flex flex-col items-center text-center py-4 space-y-4">
        <Skeleton className="w-14 h-14 rounded-full" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-10 w-44 rounded-md" />
      </div>
    </div>
  )
);
SkeletonHeroCard.displayName = "SkeletonHeroCard";

// Stat bar skeleton - horizontal metrics layout
const SkeletonStatBar = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg bg-card border p-4 shadow-subtle", className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
);
SkeletonStatBar.displayName = "SkeletonStatBar";

// Events list skeleton - calendar-style items
const SkeletonEventsList = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg bg-card border p-4 shadow-subtle space-y-4", className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-surface-muted">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
);
SkeletonEventsList.displayName = "SkeletonEventsList";

// Activity feed skeleton - avatars in a row
const SkeletonActivityFeed = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg bg-card border p-4 shadow-subtle space-y-3", className)}
      {...props}
    >
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="w-10 h-10 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-3 w-48" />
    </div>
  )
);
SkeletonActivityFeed.displayName = "SkeletonActivityFeed";

// Leaderboard skeleton - ranked list items
const SkeletonLeaderboard = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg bg-card border p-4 shadow-subtle space-y-3", className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-surface-muted">
            <Skeleton className="w-6 h-6 rounded-full shrink-0" />
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
);
SkeletonLeaderboard.displayName = "SkeletonLeaderboard";

// Roster skeleton - list of players
const SkeletonRoster = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg bg-card border p-4 shadow-subtle space-y-3", className)}
      {...props}
    >
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="w-6 h-6 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
);
SkeletonRoster.displayName = "SkeletonRoster";

// Program card skeleton - active program layout
const SkeletonProgramCard = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg bg-card border p-4 shadow-subtle space-y-3", className)}
      {...props}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
);
SkeletonProgramCard.displayName = "SkeletonProgramCard";

// Goal card skeleton
const SkeletonGoalCard = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg bg-card border p-4 shadow-subtle space-y-4", className)}
      {...props}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  )
);
SkeletonGoalCard.displayName = "SkeletonGoalCard";

// Dashboard header skeleton - avatar + greeting
const SkeletonDashboardHeader = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-3", className)}
      {...props}
    >
      <Skeleton className="h-14 w-14 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
);
SkeletonDashboardHeader.displayName = "SkeletonDashboardHeader";

// Quick stats grid skeleton
const SkeletonQuickStats = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("grid grid-cols-3 gap-3", className)}
      {...props}
    >
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="aspect-square rounded-2xl" />
      ))}
    </div>
  )
);
SkeletonQuickStats.displayName = "SkeletonQuickStats";

export { 
  Skeleton, 
  SkeletonCard, 
  SkeletonListItem, 
  SkeletonAvatar,
  SkeletonTeamCard,
  SkeletonHeroCard,
  SkeletonStatBar,
  SkeletonEventsList,
  SkeletonActivityFeed,
  SkeletonLeaderboard,
  SkeletonRoster,
  SkeletonProgramCard,
  SkeletonGoalCard,
  SkeletonDashboardHeader,
  SkeletonQuickStats,
};
