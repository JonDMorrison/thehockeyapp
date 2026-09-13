import * as React from "react";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/media";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "sm" | "default" | "lg" | "xl";
  type?: "player" | "team";
}

// Generate a consistent on-brand fallback without turning avatar colour into status.
const getAvatarColors = (name: string): { bg: string; text: string } => {
  const colors = [
    { bg: "from-primary to-brand-strong", text: "text-white" },
    { bg: "from-slate-500 to-slate-700", text: "text-white" },
    { bg: "from-zinc-500 to-zinc-700", text: "text-white" },
    { bg: "from-red-600 to-red-800", text: "text-white" },
    { bg: "from-neutral-500 to-neutral-700", text: "text-white" },
  ];
  
  // Simple hash based on name to get consistent color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt = "", fallback, size = "default", type = "team", ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);
    const [resolvedSrc, setResolvedSrc] = React.useState<string | null>(null);

    React.useEffect(() => {
      let active = true;
      setHasError(false);
      setResolvedSrc(null);
      resolveMediaUrl(src).then((url) => {
        if (active) setResolvedSrc(url);
      });
      return () => {
        active = false;
      };
    }, [src]);
    
    const nameSource = fallback || alt;
    const initials = nameSource
      .split(" ")
      .map((word) => word[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const colors = getAvatarColors(nameSource);

    const sizeClasses = {
      sm: "w-8 h-8 text-xs",
      default: "w-10 h-10 text-sm",
      lg: "w-12 h-12 text-base",
      xl: "w-16 h-16 text-xl",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {resolvedSrc && !hasError ? (
          <img
            src={resolvedSrc}
            alt={alt}
            className="h-full w-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : (
          <div 
            className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-br font-semibold shadow-inner",
              colors.bg,
              colors.text
            )}
          >
            {initials || "?"}
          </div>
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
