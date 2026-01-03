import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-md bg-muted skeleton-animate",
        className
      )}
      {...props}
    />
  )
);
Skeleton.displayName = "Skeleton";

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg bg-card p-4 shadow-subtle space-y-3", className)}
      {...props}
    >
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
);
SkeletonCard.displayName = "SkeletonCard";

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

export { Skeleton, SkeletonCard, SkeletonListItem, SkeletonAvatar };
