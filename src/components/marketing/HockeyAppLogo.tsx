import React, { forwardRef } from "react";
import logoImage from "@/assets/hockey-app-logo.png";

interface HockeyAppLogoProps {
  className?: string;
  size?: number;
}

export const HockeyAppLogo = forwardRef<HTMLImageElement, HockeyAppLogoProps>(
  ({ className = "", size = 24 }, ref) => {
    return (
      <img
        ref={ref}
        src={logoImage}
        alt="The Hockey App"
        width={size}
        height={size}
        className={`object-contain ${className}`}
      />
    );
  }
);

HockeyAppLogo.displayName = "HockeyAppLogo";
