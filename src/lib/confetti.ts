import confetti from 'canvas-confetti';

export function fireGoalConfetti() {
  // First burst - center
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#9370DB'],
  });

  // Side bursts after a short delay
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#FFD700', '#FFA500', '#FF6347'],
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#00CED1', '#9370DB', '#FFD700'],
    });
  }, 150);

  // Final celebration burst
  setTimeout(() => {
    confetti({
      particleCount: 75,
      spread: 100,
      origin: { y: 0.7 },
      colors: ['#FFD700', '#FFA500', '#00FF00'],
    });
  }, 300);
}

export function fireSmallConfetti() {
  confetti({
    particleCount: 30,
    spread: 50,
    origin: { y: 0.7 },
    colors: ['#FFD700', '#FFA500', '#00CED1'],
    scalar: 0.8,
  });
}
