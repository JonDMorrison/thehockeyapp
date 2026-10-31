import { TASK_LIBRARY } from '@/lib/weekTemplates';
export function ExerciseInstructions({ label, equipment, instructions }: { label: string; equipment?: string; instructions?: string }) {
  const template = TASK_LIBRARY.find(task => task.label.toLowerCase() === label.trim().toLowerCase());
  const cues = (instructions || template?.description || '').split(/\n|\.\s+/).map(cue => cue.trim()).filter(Boolean);
  const gear = equipment || (/stickhandling|figure 8|puck control|toe drag/i.test(label) ? 'Stick and a puck or ball. Clear a safe practice space.' : '');
  if (!gear && !cues.length) return null;
  return <aside className="space-y-3 rounded-xl bg-muted/40 p-4">
    {gear && <div><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What you need</h3><p className="mt-1 text-sm leading-relaxed">{gear}</p></div>}
    {!!cues.length && <div><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Coaching cues</h3><ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed">{cues.map((cue, index) => <li key={index}>{cue}</li>)}</ul></div>}
  </aside>;
}
