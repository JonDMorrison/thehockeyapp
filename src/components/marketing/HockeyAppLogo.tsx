import React from "react";
import logoImage from "@/assets/hockey-app-logo.png";

interface HockeyAppLogoProps {
  className?: string;
  size?: number;
}

export const HockeyAppLogo: React.FC<HockeyAppLogoProps> = ({ 
  className = "", 
  size = 24 
}) => {
  return (
    <img
      src={logoImage}
      alt="The Hockey App"
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
};
