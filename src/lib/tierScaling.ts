/**
 * Tier scaling utilities for workout plans
 * Multipliers adjust targets based on tier level
 */

export const TIER_MULTIPLIERS: Record<string, number> = {
  rec: 0.7,
  rep: 1.0,
  elite: 1.3,
};

/**
 * Apply tier scaling to a target value
 * Rounds to sensible increments based on the value
 */
export function applyTierScaling(value: number | null, tier: string): number | null {
  if (value === null || value === 0) return value;
  
  const multiplier = TIER_MULTIPLIERS[tier] || 1.0;
  const scaled = value * multiplier;
  
  // Round to sensible increments
  if (scaled <= 10) {
    return Math.round(scaled);
  } else if (scaled <= 60) {
    return Math.round(scaled / 5) * 5; // Round to nearest 5
  } else {
    return Math.round(scaled / 10) * 10; // Round to nearest 10
  }
}

/**
 * Get tier display label
 */
export function getTierLabel(tier: string): string {
  const labels: Record<string, string> = {
    rec: "Rec",
    rep: "Rep",
    elite: "Elite",
  };
  return labels[tier] || tier;
}

/**
 * Get day of week label
 */
export function getDayLabel(dayOfWeek: number): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[dayOfWeek] || "";
}

export function getDayFullLabel(dayOfWeek: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dayOfWeek] || "";
}
