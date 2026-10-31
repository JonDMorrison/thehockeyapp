import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
export interface ExerciseDetails { sets_count?: number; rest_seconds?: number; equipment?: string; instructions?: string }
export function ExerciseDetailsEditor({ value, timed, onChange }: { value: ExerciseDetails; timed: boolean; onChange: (change: Partial<ExerciseDetails>) => void }) {
  return <details className="rounded-xl border border-border p-3">
    <summary className="min-h-8 cursor-pointer text-sm font-medium">Sets, rest & coaching cues</summary>
    <div className="mt-3 space-y-3">
      {timed && <div className="grid grid-cols-2 gap-3"><label className="text-xs">Sets<Input type="number" min={1} max={20} step={1} value={value.sets_count ?? 1} onChange={e => onChange({ sets_count: Number(e.target.value) })} className="mt-1 min-h-11" /></label><label className="text-xs">Rest between sets (seconds)<Input type="number" min={0} max={600} step={1} value={value.rest_seconds ?? 0} onChange={e => onChange({ rest_seconds: Number(e.target.value) })} className="mt-1 min-h-11" /></label></div>}
      <p className="text-xs text-muted-foreground">A five-second ready countdown comes before the first set. Rest runs automatically between timed sets.</p>
      <label className="block text-xs">Equipment<Input maxLength={200} value={value.equipment ?? ''} placeholder="e.g. Stick, ball, two markers" onChange={e => onChange({ equipment: e.target.value })} className="mt-1 min-h-11" /></label>
      <label className="block text-xs">Coaching cues<Textarea maxLength={1000} value={value.instructions ?? ''} placeholder={'One cue per line, e.g.\nKeep your head up\nUse soft hands'} onChange={e => onChange({ instructions: e.target.value })} className="mt-1" /></label>
    </div>
  </details>;
}
