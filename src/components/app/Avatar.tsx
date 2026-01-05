import * as React from "react";
import { cn } from "@/lib/utils";

const HockeyIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Hockey stick */}
    <path d="M4 20L16 8" />
    <path d="M16 8L20 12L18 14" />
    {/* Puck */}
    <ellipse cx="8" cy="18" rx="3" ry="1.5" fill="currentColor" />
  </svg>
);

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "default" | "lg" | "xl";
  type?: "player" | "team";
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt = "", fallback, size = "default", type = "team", ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);
    
    const initials = fallback || alt
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const sizeClasses = {
      sm: "w-8 h-8 text-xs",
      default: "w-10 h-10 text-sm",
      lg: "w-12 h-12 text-base",
      xl: "w-16 h-16 text-lg",
    };

    const iconSizes = {
      sm: 16,
      default: 20,
      lg: 24,
      xl: 32,
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full bg-muted",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {src && !hasError ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : type === "team" ? (
          <div className="flex h-full w-full items-center justify-center bg-team-primary/10 text-team-primary">
            <HockeyIcon size={iconSizes[size]} />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-team-primary/10 text-team-primary font-medium">
            {initials}
          </div>
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
