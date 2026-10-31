export function validateExerciseDetails(tasks: Array<{ sets_count?: number; rest_seconds?: number; equipment?: string; instructions?: string }>): void {
  for (const task of tasks) {
    if (!Number.isInteger(task.sets_count ?? 1) || (task.sets_count ?? 1) < 1 || (task.sets_count ?? 1) > 20) throw new Error('Choose between 1 and 20 sets.');
    if (!Number.isInteger(task.rest_seconds ?? 0) || (task.rest_seconds ?? 0) < 0 || (task.rest_seconds ?? 0) > 600) throw new Error('Choose between 0 and 600 seconds of rest.');
    if ((task.equipment?.length ?? 0) > 200 || (task.instructions?.length ?? 0) > 1000) throw new Error('Shorten the equipment list or coaching cues.');
  }
}
