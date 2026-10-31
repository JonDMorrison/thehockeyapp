import type { TimerState } from './exerciseTimer';
export interface IntervalState extends TimerState { phase: 'ready' | 'work' | 'rest' | 'done'; round: number; started: boolean }
export function newIntervals(): IntervalState { return { duration: 5, remaining: 5, endsAt: null, phase: 'ready', round: 1, started: false }; }
/** Advance only one phase. Returning from a locked phone never invents completed sets. */
export function nextInterval(state: IntervalState, work: number, sets: number, rest: number, now: number): IntervalState {
  if (state.phase === 'done') return state;
  let phase: IntervalState['phase']; let round = state.round;
  if (state.phase === 'ready') phase = 'work';
  else if (state.phase === 'work' && round >= sets) phase = 'done';
  else if (state.phase === 'work' && rest > 0) phase = 'rest';
  else { phase = 'work'; round += 1; }
  const duration = phase === 'rest' ? rest : work;
  return { phase, round, duration, remaining: phase === 'done' ? 0 : duration, endsAt: phase === 'done' ? null : now + duration * 1000, started: true };
}
