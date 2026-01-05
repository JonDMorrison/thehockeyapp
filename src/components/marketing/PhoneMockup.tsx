import React from "react";
import { cn } from "@/lib/utils";

interface PhoneMockupProps {
  children?: React.ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  className?: string;
  showGlow?: boolean;
  glowColor?: string;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({
  children,
  imageSrc,
  imageAlt = "App screenshot",
  className,
  showGlow = true,
  glowColor = "primary",
}) => {
  const glowClasses = {
    primary: "bg-primary/20",
    success: "bg-success/20",
    muted: "bg-muted/30",
  };

  return (
    <div className={cn("relative", className)}>
      {/* Glow effect */}
      {showGlow && (
        <div
          className={cn(
            "absolute -inset-8 blur-3xl rounded-full",
            glowClasses[glowColor as keyof typeof glowClasses] || glowClasses.primary
          )}
        />
      )}

      {/* Phone frame */}
      <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-900 rounded-full z-10" />

        {/* Screen */}
        <div className="rounded-[2.5rem] overflow-hidden bg-white aspect-[9/19.5]">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={imageAlt}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            children
          )}
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/50 rounded-full" />
      </div>
    </div>
  );
};
