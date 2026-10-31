import assert from 'node:assert/strict';
import { exerciseSeconds, remainingSeconds, timerLabel } from '../../src/lib/exerciseTimer.ts';

for (const minutes of [1, 2, 5, 12]) assert.equal(exerciseSeconds('minutes', minutes), minutes * 60);
assert.equal(exerciseSeconds('seconds', 45), 45);
for (const value of [0, -1, null, undefined, NaN, Infinity, 86401]) assert.equal(exerciseSeconds('seconds', value), null);
assert.equal(exerciseSeconds('reps', 20), null);
assert.equal(exerciseSeconds('none', 5), null);
const active = { duration: 120, remaining: 120, endsAt: 121000 };
assert.equal(remainingSeconds(active, 1000), 120);
assert.equal(remainingSeconds(active, 61500), 60);
// Backgrounded tabs and reloads derive time from the persisted deadline, not ticks.
assert.equal(remainingSeconds(JSON.parse(JSON.stringify(active)), 120999), 1);
assert.equal(remainingSeconds(active, 190000), 0);
const paused = { ...active, remaining: remainingSeconds(active, 61000), endsAt: null };
assert.equal(remainingSeconds(paused, 990000), 60);
const resumed = { ...paused, endsAt: 990000 + paused.remaining * 1000 };
assert.equal(remainingSeconds(resumed, 1020000), 30);
assert.equal(remainingSeconds({ duration: 60, remaining: 60, endsAt: null }, 0), 60);
assert.equal(timerLabel(0), '0:00');
assert.equal(timerLabel(65), '1:05');
assert.equal(timerLabel(300), '5:00');
console.log('Exercise timer: presets, invalid targets, deadline recovery, pause/resume, restart, and display passed.');
