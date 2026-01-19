import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "default" | "lg" | "xl";
  type?: "player" | "team";
}

// Generate a consistent color based on the name
const getAvatarColors = (name: string): { bg: string; text: string } => {
  const colors = [
    { bg: "from-blue-500 to-blue-600", text: "text-white" },
    { bg: "from-emerald-500 to-emerald-600", text: "text-white" },
    { bg: "from-violet-500 to-violet-600", text: "text-white" },
    { bg: "from-amber-500 to-amber-600", text: "text-white" },
    { bg: "from-rose-500 to-rose-600", text: "text-white" },
    { bg: "from-cyan-500 to-cyan-600", text: "text-white" },
    { bg: "from-indigo-500 to-indigo-600", text: "text-white" },
    { bg: "from-teal-500 to-teal-600", text: "text-white" },
    { bg: "from-orange-500 to-orange-600", text: "text-white" },
    { bg: "from-pink-500 to-pink-600", text: "text-white" },
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
        {src && !hasError ? (
          <img
            src={src}
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
