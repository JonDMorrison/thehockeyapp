import * as React from 'react';
import { Check, ChevronDown, ChevronRight, ArrowRight, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ExerciseTimer } from '@/components/player/ExerciseTimer';
import { useWorkoutGuide } from '@/contexts/WorkoutGuideContext';

export interface WorkoutCheckItemProps {
  id: string;
  timerSeconds?: number | null;
  timerKey?: string;
  label: string;
  target?: string;
  icon?: React.ReactNode;
  completed?: boolean;
  disabled?: boolean;
  progressText?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  onToggle?: (id: string, completed: boolean) => void;
}

const WorkoutCheckItem = React.forwardRef<HTMLDivElement, WorkoutCheckItemProps>(
  ({ id, label, target, icon, timerSeconds, timerKey, completed = false, disabled = false, progressText, onToggle, children, action }, ref) => {
    const guide = useWorkoutGuide();
    const cardRef = React.useRef<HTMLDivElement>(null);
    const headerRef = React.useRef<HTMLButtonElement>(null);
    React.useImperativeHandle(ref, () => cardRef.current!);
    const [open, setOpen] = React.useState(false);
    const active = guide ? guide.activeId === id : open;
    const wasActive = React.useRef(active);
    React.useEffect(() => {
      if (active && !wasActive.current) {
        headerRef.current?.focus({ preventScroll: true });
        cardRef.current?.scrollIntoView?.({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      }
      wasActive.current = active;
    }, [active]);
    const index = guide?.steps.findIndex(step => step.id === id) ?? -1;
    const hasNext = guide?.steps.some(step => step.id !== id && !step.completed);
    const timed = !!timerSeconds && !!timerKey;
    const complete = () => {
      if (disabled) return;
      onToggle?.(id, true);
      guide?.advance(id);
    };
    return <div ref={cardRef} className={cn('overflow-hidden rounded-2xl border bg-card transition-colors', active ? 'border-primary/40 shadow-sm' : 'border-border', disabled && 'opacity-60')}>
      <button ref={headerRef} type="button" aria-expanded={active} aria-controls={`exercise-${id}`} onClick={() => guide ? guide.select(id) : setOpen(!open)} className="flex min-h-24 w-full items-center gap-4 p-5 text-left sm:p-6">
        <span aria-hidden="true" className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold', completed ? 'bg-success/10 text-success' : active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>{completed ? <Check className="h-5 w-5" /> : index >= 0 ? String(index + 1).padStart(2, '0') : icon}</span>
        <span className="min-w-0 flex-1"><span className={cn('block text-base font-semibold tracking-tight', completed && 'text-muted-foreground')}>{label}</span><span className="mt-1 block text-sm text-muted-foreground">{completed ? 'Complete' : target || 'At your own pace'}</span></span>
        {active ? <ChevronDown aria-hidden="true" className="h-4 w-4 text-muted-foreground" /> : <ChevronRight aria-hidden="true" className="h-4 w-4 text-muted-foreground" />}
      </button>
      <div id={`exercise-${id}`} hidden={!active} className="space-y-4 border-t border-border px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
        {active && children}
        {progressText && !completed && <p className="text-sm text-primary">{progressText}</p>}
        {action && <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3"><span className="text-sm text-muted-foreground">Shooting progress</span>{action}</div>}
        {active && timed && !completed && <ExerciseTimer duration={timerSeconds!} storageKey={timerKey!} label={label} disabled={disabled} onComplete={complete} integrated />}
        {completed ? <div className="flex flex-wrap gap-2">{hasNext && <Button type="button" className="min-h-12 flex-1 gap-2" onClick={() => guide?.advance(id)}>Next exercise<ArrowRight className="h-4 w-4" /></Button>}<Button type="button" variant="ghost" className="min-h-12 gap-2" disabled={disabled} onClick={() => onToggle?.(id, false)}><RotateCcw className="h-4 w-4" />Undo completion</Button></div>
          : timed ? <Button type="button" variant="link" className="h-auto min-h-11 px-0 text-xs text-muted-foreground" disabled={disabled} onClick={complete}>Already trained? Mark complete</Button>
          : <Button type="button" className="min-h-12 w-full gap-2" disabled={disabled} onClick={complete}><Check className="h-4 w-4" />{hasNext ? 'Complete & next' : 'Complete exercise'}</Button>}
      </div>
    </div>;
  }
);
WorkoutCheckItem.displayName = 'WorkoutCheckItem';
export { WorkoutCheckItem };
