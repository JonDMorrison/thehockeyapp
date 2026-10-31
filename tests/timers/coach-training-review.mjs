import assert from "node:assert/strict";
import { reviewPlayer } from "../../src/lib/coachTrainingReview.ts";
const cards = [
  {
    id: "a",
    date: "2026-10-26",
    title: "Monday",
    practice_tasks: [
      { id: "one", label: "Stickhandling", is_required: true },
      { id: "two", label: "Wall sit", is_required: false },
    ],
  },
  {
    id: "b",
    date: "2026-10-27",
    title: null,
    practice_tasks: [{ id: "three", label: "Shots", is_required: true }],
  },
];
const completions = [
  { player_id: "p", practice_task_id: "one", completed: true, shots_logged: 0 },
  {
    player_id: "p",
    practice_task_id: "three",
    completed: false,
    shots_logged: 20,
  },
  {
    player_id: "other",
    practice_task_id: "two",
    completed: true,
    shots_logged: 1000,
  },
];
let result = reviewPlayer(cards, completions, [], "p");
assert.equal(result.assigned, 3);
assert.equal(result.completed, 1);
assert.equal(result.sessions, 0);
assert.equal(result.shots, 20);
assert.equal(result.activeDays, 2);
result = reviewPlayer(
  cards,
  completions,
  [
    { player_id: "p", practice_card_id: "b" },
    { player_id: "p", practice_card_id: "b" },
  ],
  "p",
  "2026-10-27",
);
assert.equal(result.assigned, 1);
assert.equal(result.completed, 0);
assert.equal(result.sessions, 1);
assert.equal(result.days.length, 1);
const updated = reviewPlayer(
  cards,
  [
    ...completions,
    {
      player_id: "p",
      practice_task_id: "three",
      completed: true,
      shots_logged: 30,
    },
  ],
  [],
  "p",
);
assert.equal(updated.shots, 30);
assert.equal(updated.completed, 2);
assert.equal(reviewPlayer([], [], [], "p").assigned, 0);
assert.equal(
  reviewPlayer(cards, completions, [], "new", "2026-10-28").assigned,
  0,
);
console.log(
  "Coach review: partial work, saved sessions, deduplication, player isolation, membership dates and empty periods passed.",
);
