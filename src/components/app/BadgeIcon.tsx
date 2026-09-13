import React from "react";
import { motion } from "framer-motion";
import {
  Target,
  Flame,
  Trophy,
  Medal,
  CheckCircle,
  Calendar,
  Star,
  Award,
  Zap,
  Shield,
  Crown,
  Brain,
  Dumbbell,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BRAND_BADGE_THEME = {
  gradient: "from-primary to-brand-strong",
  iconColor: "text-white",
  glowColor: "shadow-primary/40",
  ringColor: "ring-primary/30",
  lockedBg: "bg-muted",
};

const SUCCESS_BADGE_THEME = {
  gradient: "from-success to-success/75",
  iconColor: "text-white",
  glowColor: "shadow-success/40",
  ringColor: "ring-success/30",
  lockedBg: "bg-muted",
};

const NEUTRAL_BADGE_THEME = {
  gradient: "from-slate-500 to-zinc-700",
  iconColor: "text-white",
  glowColor: "shadow-black/30",
  ringColor: "ring-white/15",
  lockedBg: "bg-muted",
};

// Shape and icon distinguish achievements; colour stays within the brand system.
const BADGE_THEMES: Record<string, {
  gradient: string;
  iconColor: string;
  glowColor: string;
  ringColor: string;
  lockedBg: string;
}> = {
  target: BRAND_BADGE_THEME,
  flame: BRAND_BADGE_THEME,
  trophy: BRAND_BADGE_THEME,
  medal: BRAND_BADGE_THEME,
  "check-circle": SUCCESS_BADGE_THEME,
  calendar: NEUTRAL_BADGE_THEME,
  star: BRAND_BADGE_THEME,
  award: BRAND_BADGE_THEME,
  zap: BRAND_BADGE_THEME,
  shield: NEUTRAL_BADGE_THEME,
  crown: BRAND_BADGE_THEME,
  brain: NEUTRAL_BADGE_THEME,
  dumbbell: NEUTRAL_BADGE_THEME,
};

// Icon component mapping
const ICON_MAP: Record<string, React.ElementType> = {
  target: Target,
  flame: Flame,
  trophy: Trophy,
  medal: Medal,
  "check-circle": CheckCircle,
  calendar: Calendar,
  star: Star,
  award: Award,
  zap: Zap,
  shield: Shield,
  crown: Crown,
  brain: Brain,
  dumbbell: Dumbbell,
};

export type BadgeSize = "xs" | "sm" | "md" | "lg" | "xl";

interface BadgeIconProps {
  badgeIcon: string;
  earned?: boolean;
  size?: BadgeSize;
  showGlow?: boolean;
  showRing?: boolean;
  animate?: boolean;
  className?: string;
}

const sizeConfig: Record<BadgeSize, {
  container: string;
  icon: string;
  ring: string;
}> = {
  xs: { container: "w-8 h-8", icon: "w-4 h-4", ring: "ring-1" },
  sm: { container: "w-10 h-10", icon: "w-5 h-5", ring: "ring-2" },
  md: { container: "w-12 h-12", icon: "w-6 h-6", ring: "ring-2" },
  lg: { container: "w-16 h-16", icon: "w-8 h-8", ring: "ring-[3px]" },
  xl: { container: "w-20 h-20", icon: "w-10 h-10", ring: "ring-4" },
};

export function BadgeIcon({
  badgeIcon,
  earned = true,
  size = "md",
  showGlow = true,
  showRing = true,
  animate = true,
  className,
}: BadgeIconProps) {
  const theme = BADGE_THEMES[badgeIcon] || BADGE_THEMES.star;
  const IconComponent = ICON_MAP[badgeIcon] || Star;
  const sizeStyles = sizeConfig[size];

  // Locked/unearned state
  if (!earned) {
    return (
      <div
        className={cn(
          "relative rounded-full flex items-center justify-center",
          theme.lockedBg,
          sizeStyles.container,
          className
        )}
      >
        <IconComponent className={cn(sizeStyles.icon, "text-muted-foreground/50")} />
        <div className="absolute inset-0 rounded-full bg-muted/30" />
        <Lock className="absolute w-3 h-3 text-muted-foreground/70 bottom-0 right-0 translate-x-1 translate-y-1" />
      </div>
    );
  }

  // Earned state with animations and effects
  const content = (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center bg-gradient-to-br",
        theme.gradient,
        showGlow && `shadow-lg ${theme.glowColor}`,
        showRing && `ring ${sizeStyles.ring} ${theme.ringColor}`,
        sizeStyles.container,
        className
      )}
    >
      {/* Inner shine effect */}
      <div className="absolute inset-[2px] rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent" />
      
      {/* Icon */}
      <IconComponent className={cn(sizeStyles.icon, theme.iconColor, "relative z-10 drop-shadow-sm")} />
      
      {/* Sparkle decorations for larger sizes */}
      {(size === "lg" || size === "xl") && (
        <>
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full opacity-80 animate-pulse" />
          <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
        </>
      )}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

// Export a grid display component for showcasing multiple badges
interface BadgeGridProps {
  badges: Array<{
    id: string;
    name: string;
    badgeIcon: string;
    earned: boolean;
    description?: string;
  }>;
  size?: BadgeSize;
  showLabels?: boolean;
  className?: string;
}

export function BadgeGrid({ badges, size = "md", showLabels = true, className }: BadgeGridProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-4", className)}>
      {badges.map((badge, index) => (
        <motion.div
          key={badge.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
          className={cn(
            "flex flex-col items-center gap-2 p-3 rounded-xl transition-colors",
            badge.earned 
              ? "bg-card hover:bg-accent/50" 
              : "opacity-60"
          )}
        >
          <BadgeIcon
            badgeIcon={badge.badgeIcon}
            earned={badge.earned}
            size={size}
            animate={false}
          />
          {showLabels && (
            <p className={cn(
              "text-xs font-medium text-center line-clamp-2",
              badge.earned ? "text-foreground" : "text-muted-foreground"
            )}>
              {badge.name}
            </p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// Export theme data for external use
export { BADGE_THEMES, ICON_MAP };
