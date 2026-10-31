import { WorkoutGuideContext as Guide } from "@/contexts/WorkoutGuideContext";
import { activeWorkoutStep, nextWorkoutStep, type WorkoutStep } from "@/lib/guidedWorkout";
import { useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GuidedWorkout({ steps, children, shotsLogged }: { steps: WorkoutStep[]; children: ReactNode; shotsLogged?: number }) {
  const [selected, setSelected] = useState<string>();
  const activeId = activeWorkoutStep(steps, selected);
  const index = steps.findIndex(step => step.id === activeId);
  const count = steps.filter(step => step.completed).length;
  const advance = (id: string) => {
    const next = nextWorkoutStep(steps, id);
    if (next) setSelected(next);
  };
  return <Guide.Provider value={{ activeId, steps, select: setSelected, advance }}>
    <section aria-label="Guided workout" className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Your workout</p><h2 className="mt-1 text-xl font-semibold tracking-tight">{steps.length === 0 ? 'No exercises yet' : count === steps.length ? 'Session complete' : `Exercise ${index + 1} of ${steps.length}`}</h2></div>
          <p className="text-sm tabular-nums text-muted-foreground">{count}/{steps.length} done</p>
        </div>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(2rem,1fr))] gap-1.5" aria-label="Workout overview">
          {steps.map((step, i) => <Button key={step.id} type="button" variant="ghost" className={`h-11 min-w-0 flex-1 rounded-md border p-0 ${step.completed ? 'border-success/30 bg-success/10 text-success' : step.id === activeId ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`} aria-label={`Exercise ${i + 1}${step.completed ? ', complete' : ''}`} aria-current={step.id === activeId ? 'step' : undefined} onClick={() => setSelected(step.id)}>{step.completed ? <Check className="h-3.5 w-3.5" /> : <span className="text-xs">{i + 1}</span>}</Button>)}
        </div>
      </div>
      {steps.length > 0 && count === steps.length && <div role="status" className="rounded-2xl border border-success/25 bg-success/5 p-6">
        <Check aria-hidden="true" className="mb-3 h-6 w-6 text-success" /><h3 className="text-2xl font-semibold tracking-tight">Great work today.</h3>
        <p className="mt-2 text-sm text-muted-foreground">All exercises are checked off. You’re done with this workout.</p>
        <dl className="mt-5 grid grid-cols-2 gap-4"><div><dt className="text-xs text-muted-foreground">Exercises completed</dt><dd className="mt-1 text-3xl font-semibold tabular-nums">{count}</dd></div>{shotsLogged !== undefined && <div><dt className="text-xs text-muted-foreground">Shots logged</dt><dd className="mt-1 text-3xl font-semibold tabular-nums">{shotsLogged}</dd></div>}</dl>
        <p className="mt-4 text-xs text-muted-foreground">Review your work below, then finish the session when you’re ready.</p>
      </div>}
      {children}
    </section>
  </Guide.Provider>;
}
