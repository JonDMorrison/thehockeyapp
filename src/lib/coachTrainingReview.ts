export interface ReviewTask {
  id: string;
  label: string;
  is_required: boolean;
}
export interface ReviewCard {
  id: string;
  date: string;
  title: string | null;
  practice_tasks: ReviewTask[];
}
export interface ReviewCompletion {
  player_id: string;
  practice_task_id: string;
  completed: boolean | null;
  shots_logged: number | null;
}
export function reviewPlayer(
  cards: ReviewCard[],
  completions: ReviewCompletion[],
  sessions: Array<{ player_id: string; practice_card_id: string }>,
  playerId: string,
  joinedDate = "",
) {
  const records = new Map(
    completions
      .filter((c) => c.player_id === playerId)
      .map((c) => [c.practice_task_id, c]),
  );
  const doneSessions = new Set(
    sessions
      .filter((c) => c.player_id === playerId)
      .map((c) => c.practice_card_id),
  );
  const days = cards
    .filter((c) => c.date >= joinedDate)
    .map((card) => {
      const tasks = card.practice_tasks.map((task) => ({
        ...task,
        completed: !!records.get(task.id)?.completed,
        shots: records.get(task.id)?.shots_logged ?? 0,
      }));
      return {
        ...card,
        tasks,
        sessionComplete: doneSessions.has(card.id),
        done: tasks.filter((t) => t.completed).length,
        shots: tasks.reduce((n, t) => n + t.shots, 0),
      };
    });
  const assigned = days.reduce((n, d) => n + d.tasks.length, 0);
  const completed = days.reduce((n, d) => n + d.done, 0);
  const activeDates = new Set(
    days
      .filter((d) => d.done > 0 || d.shots > 0 || d.sessionComplete)
      .map((d) => d.date),
  );
  return {
    days,
    assigned,
    completed,
    sessions: days.filter((d) => d.sessionComplete).length,
    shots: days.reduce((n, d) => n + d.shots, 0),
    activeDays: activeDates.size,
  };
}
