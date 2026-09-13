import confetti from 'canvas-confetti';
import { BRAND_CONFETTI_COLORS } from '@/lib/brand';

export function fireGoalConfetti() {
  // First burst - center
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: BRAND_CONFETTI_COLORS,
  });

  // Side bursts after a short delay
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: BRAND_CONFETTI_COLORS,
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: BRAND_CONFETTI_COLORS,
    });
  }, 150);

  // Final celebration burst
  setTimeout(() => {
    confetti({
      particleCount: 75,
      spread: 100,
      origin: { y: 0.7 },
      colors: BRAND_CONFETTI_COLORS,
    });
  }, 300);
}

export function fireSmallConfetti() {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.7 },
    colors: BRAND_CONFETTI_COLORS,
    scalar: 0.8,
  });
}

export function fireStreakConfetti(milestone: number) {
  // Intensity scales with milestone
  const intensity = milestone >= 30 ? 3 : milestone >= 14 ? 2 : 1;
  
  // Initial burst
  confetti({
    particleCount: 50 * intensity,
    spread: 60 + (intensity * 10),
    origin: { y: 0.6 },
    colors: BRAND_CONFETTI_COLORS,
  });

  // Side bursts for bigger milestones
  if (intensity >= 2) {
    setTimeout(() => {
      confetti({
        particleCount: 30 * intensity,
        angle: 60,
        spread: 45,
        origin: { x: 0, y: 0.7 },
        colors: BRAND_CONFETTI_COLORS,
      });
      confetti({
        particleCount: 30 * intensity,
        angle: 120,
        spread: 45,
        origin: { x: 1, y: 0.7 },
        colors: BRAND_CONFETTI_COLORS,
      });
    }, 150);
  }

  // Extra celebration for 30+ day streaks
  if (intensity >= 3) {
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 120,
        origin: { y: 0.5 },
        colors: BRAND_CONFETTI_COLORS,
        scalar: 1.2,
      });
    }, 300);
  }
}
