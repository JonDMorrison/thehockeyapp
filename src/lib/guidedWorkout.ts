export interface WorkoutStep { id: string; completed: boolean }
export function activeWorkoutStep(steps: WorkoutStep[], selected?: string): string | undefined {
  return steps.some(step => step.id === selected) ? selected : steps.find(step => !step.completed)?.id ?? steps[0]?.id;
}
export function nextWorkoutStep(steps: WorkoutStep[], id: string): string | undefined {
  const current = steps.findIndex(step => step.id === id);
  return (steps.slice(current + 1).find(step => !step.completed) ?? steps.find(step => step.id !== id && !step.completed))?.id;
}
