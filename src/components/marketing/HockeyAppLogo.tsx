// Logo updated April 2026
import React, { forwardRef } from "react";
import logoImage from "@/assets/hockey-app-logo.png";

interface HockeyAppLogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

export const HockeyAppLogo = forwardRef<HTMLImageElement, HockeyAppLogoProps>(
  ({ className = "", size = 24, alt = "The Hockey App" }, ref) => {
    return (
      <img
        ref={ref}
        src={logoImage}
        alt={alt}
        width={size}
        height={size}
        className={`object-contain ${className}`}
      />
    );
  }
);

HockeyAppLogo.displayName = "HockeyAppLogo";
