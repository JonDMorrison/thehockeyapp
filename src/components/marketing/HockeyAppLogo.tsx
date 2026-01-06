import React from "react";

interface HockeyAppLogoProps {
  className?: string;
  size?: number;
}

export const HockeyAppLogo: React.FC<HockeyAppLogoProps> = ({ 
  className = "", 
  size = 24 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Hockey stick blade */}
      <path
        d="M6 24C6 24 8 26 12 26C14 26 15 25 15 24V22H9L6 24Z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Hockey stick shaft */}
      <path
        d="M15 22L26 6"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Puck */}
      <ellipse
        cx="10"
        cy="18"
        rx="4"
        ry="2"
        fill="currentColor"
      />
      {/* Motion lines */}
      <path
        d="M18 18L21 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M17 21L19 21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
};
