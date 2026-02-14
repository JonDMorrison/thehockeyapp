declare module 'canvas-confetti' {
  const confetti: {
    (options?: {
      particleCount?: number;
      angle?: number;
      spread?: number;
      startVelocity?: number;
      decay?: number;
      gravity?: number;
      drift?: number;
      ticks?: number;
      origin?: { x?: number; y?: number };
      colors?: string[];
      shapes?: string[];
      scalar?: number;
      zIndex?: number;
      disableForReducedMotion?: boolean;
    }): Promise<null>;
    reset: () => void;
    create: (canvas: HTMLCanvasElement, options?: { resize?: boolean }) => typeof confetti;
  };
  export default confetti;
}
