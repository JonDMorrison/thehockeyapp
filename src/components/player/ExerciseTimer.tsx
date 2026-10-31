import { useEffect, useRef, useState } from 'react';
import { Check, Maximize2, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { remainingSeconds, timerLabel, type TimerState } from '@/lib/exerciseTimer';

interface Props { duration: number; storageKey: string; label: string; onComplete: () => void; disabled?: boolean }

export function ExerciseTimer(props: Props) {
  // A new assignment, player, or target gets its own state and countdown.
  return <Timer key={`${props.storageKey}:${props.duration}`} {...props} />;
}

function Timer({ duration, storageKey, label, onComplete, disabled }: Props) {
  const key = `hockey:exercise-timer:v1:${storageKey}`;
  const fresh = (): TimerState => ({ duration, remaining: duration, endsAt: null });
  const [state, setState] = useState<TimerState>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved?.duration === duration && Number.isFinite(saved.remaining) && saved.remaining >= 0 && saved.remaining <= duration &&
        (saved.endsAt === null || (Number.isFinite(saved.endsAt) && saved.endsAt > 0))) return saved;
    } catch { /* Timer remains usable when device storage is unavailable. */ }
    return fresh();
  });
  const [now, setNow] = useState(Date.now);
  const [focus, setFocus] = useState(false);
  const [expanded, setExpanded] = useState(state.endsAt !== null || state.remaining < duration);
  const [sound, setSound] = useState(true);
  const audio = useRef<AudioContext | null>(null);
  const notified = useRef(false);
  const remaining = remainingSeconds(state, now);
  const finished = remaining === 0;
  const running = state.endsAt !== null && !finished && !disabled;

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* Storage is optional. */ }
  }, [key, state]);

  useEffect(() => {
    if (state.endsAt === null || disabled) return;
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 200);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('pageshow', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('pageshow', tick);
    };
  }, [state.endsAt, disabled]);

  useEffect(() => {
    if (!finished || notified.current || disabled) return;
    notified.current = true;
    setState(s => ({ ...s, remaining: 0, endsAt: null }));
    navigator.vibrate?.([150, 80, 150]);
    if (sound && audio.current?.state === 'running') {
      try {
        const ctx = audio.current;
        for (let i = 0; i < 3; i++) {
          const tone = ctx.createOscillator(); const gain = ctx.createGain();
          tone.connect(gain); gain.connect(ctx.destination);
          tone.frequency.value = i === 2 ? 880 : 660;
          const start = ctx.currentTime + i * .24;
          gain.gain.setValueAtTime(.12, start);
          gain.gain.exponentialRampToValueAtTime(.001, start + .2);
          tone.start(start); tone.stop(start + .21);
        }
      } catch { /* Visible completion always works without audio. */ }
    }
  }, [finished, disabled, sound]);

  // Keep the display awake while training where the browser supports it.
  useEffect(() => {
    if (!running || !('wakeLock' in navigator)) return;
    let disposed = false;
    let lock: WakeLockSentinel | undefined;
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || lock && !lock.released) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (disposed) await next.release();
        else lock = next;
      } catch { /* Power-saving settings may deny wake locks. */ }
    };
    void acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', acquire);
      void lock?.release().catch(() => {});
    };
  }, [running]);

  useEffect(() => () => { void audio.current?.close(); }, []);

  function start() {
    setExpanded(true);
    if (sound) {
      try {
        audio.current ??= new AudioContext();
        void audio.current.resume().catch(() => {});
      } catch { /* Audio isn't available in every browser. */ }
    }
    const current = Date.now();
    setNow(current);
    setState(s => ({ ...s, endsAt: current + remainingSeconds(s, current) * 1000 }));
  }
  function pause() {
    const current = Date.now(); setNow(current);
    setState(s => ({ ...s, remaining: remainingSeconds(s, current), endsAt: null }));
  }
  function reset() { notified.current = false; setNow(Date.now()); setState(fresh()); }

  const controls = (large = false) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{finished ? 'Time complete' : running ? 'Keep going' : remaining < duration ? 'Paused' : 'Ready when you are'}</span>
        <Button type="button" variant="ghost" size="icon" aria-label={sound ? 'Mute timer sound' : 'Enable timer sound'} aria-pressed={sound} onClick={() => setSound(!sound)}>{sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</Button>
      </div>
      <div role="timer" aria-label={`${label}: ${timerLabel(remaining)} remaining`} className={`text-center font-display font-black tabular-nums tracking-tight ${large ? 'text-8xl sm:text-9xl' : 'text-5xl'}`}>{timerLabel(remaining)}</div>
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={`h-full ${finished ? 'bg-success' : 'bg-primary'} transition-[width] duration-200 motion-reduce:transition-none`} style={{ width: `${100 * (duration - remaining) / duration}%` }} /></div>
      <p role="status" className="text-center text-sm text-muted-foreground">{finished ? 'Nice work. Mark this exercise complete when you’re ready.' : `${timerLabel(duration)} assigned · ${running ? 'Stay with it.' : 'Get into position, then start.'}`}</p>
      <div className="flex gap-2">
        {finished ? <Button type="button" className="min-h-12 flex-1 gap-2" disabled={disabled} onClick={onComplete}><Check className="h-4 w-4" />Mark complete</Button> : <Button type="button" className="min-h-12 flex-1 gap-2" disabled={disabled} onClick={running ? pause : start}>{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{running ? 'Pause' : remaining < duration ? 'Resume' : 'Start timer'}</Button>}
        <Button type="button" variant="outline" className="min-h-12 min-w-12" aria-label="Restart timer" disabled={disabled || remaining === duration && !running} onClick={reset}><RotateCcw className="h-4 w-4" /></Button>
        {!large && <Button type="button" variant="outline" className="min-h-12 min-w-12" aria-label="Open timer focus view" onClick={() => setFocus(true)}><Maximize2 className="h-4 w-4" /></Button>}
      </div>
      <p className="text-center text-xs text-muted-foreground">You can leave this screen and return. Keep the app open for the finish sound.</p>
    </div>
  );
  return <>
    <section aria-label={`${label} timer`} className="rounded-xl border border-primary/20 bg-card p-4 sm:p-5">
      {!focus && (expanded ? controls() : <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-medium text-muted-foreground">Assigned timer</p><p className="font-display text-2xl font-bold tabular-nums">{timerLabel(duration)}</p></div>
        <div className="flex gap-2"><Button type="button" className="min-h-12 gap-2" onClick={start}><Play className="h-4 w-4" />Start timer</Button><Button type="button" variant="outline" className="min-h-12 min-w-12" aria-label="Open timer focus view" onClick={() => setFocus(true)}><Maximize2 className="h-4 w-4" /></Button></div>
      </div>)}
    </section>
    <Dialog open={focus} onOpenChange={setFocus}><DialogContent className="max-w-xl rounded-2xl p-6 sm:p-10"><DialogTitle className="pr-6 text-xl">{label}</DialogTitle><DialogDescription>Focus on this exercise. Your assigned time is {timerLabel(duration)}.</DialogDescription>{controls(true)}</DialogContent></Dialog>
  </>;
}
