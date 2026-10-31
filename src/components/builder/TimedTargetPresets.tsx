import { Button } from '@/components/ui/button';

export function TimedTargetPresets({ type, value, onChange }: {
  type: string; value: number | null; onChange: (change: { target_type: string; target_value: number }) => void;
}) {
  const timed = type === 'minutes' || type === 'seconds';
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2" aria-label="Exercise timer duration">
      <span className="mr-1 text-xs font-medium text-muted-foreground">{timed ? 'Timer' : 'Add a timer'}</span>
      {[1, 2, 5].map(minutes => <Button key={minutes} type="button" size="sm" variant={timed && value === minutes * (type === 'seconds' ? 60 : 1) ? 'default' : 'outline'} aria-pressed={timed && value === minutes * (type === 'seconds' ? 60 : 1)} onClick={() => onChange({ target_type: 'minutes', target_value: minutes })}>{minutes} min</Button>)}
    </div>
    {timed && <p className="text-xs text-muted-foreground">Players get an in-app countdown. Set any positive duration in the target field. Use seconds for short holds such as wall sits.</p>}
  </div>;
}
