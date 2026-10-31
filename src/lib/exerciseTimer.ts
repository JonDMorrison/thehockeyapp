/** Timed targets use the existing coach-assigned units. Never infer time from reps. */
export function exerciseSeconds(type: string, value: number | null | undefined): number | null {
  if (!value || !Number.isFinite(value) || value <= 0) return null;
  if (type !== 'minutes' && type !== 'seconds') return null;
  const seconds = Math.round(value * (type === 'minutes' ? 60 : 1));
  return seconds > 0 && seconds <= 86400 ? seconds : null;
}

export interface TimerState { duration: number; remaining: number; endsAt: number | null }
export function remainingSeconds(state: TimerState, now: number): number {
  return Math.max(0, Math.min(state.duration, state.endsAt === null
    ? state.remaining : Math.ceil((state.endsAt - now) / 1000)));
}
export function timerLabel(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
