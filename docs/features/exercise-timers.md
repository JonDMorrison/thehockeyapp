# Exercise timers

Coaches set a target in minutes or seconds in the day editor. One-tap 1, 2,
and 5 minute presets are available in both editor modes and the solo builder.
Custom durations use the existing target field. Valid timers are greater than
zero and no longer than 24 hours. Repetition and shot targets do not create timers.

Team PlayerToday, QuickCheckoff, and SoloToday all use the same ExerciseTimer
through WorkoutCheckItem. A compact start control expands into pause/resume,
restart, optional sound, progress, and an accessible focus dialog. At zero the
player chooses Mark complete, which invokes the screen's existing completion
handler. Merely running out the clock never records training automatically.
Manual checkoff remains available for training completed away from the device.

State is stored locally by account, player, practice card, and task. The assigned
duration is checked on restore. Deadlines use Date.now rather than interval tick
counts, so background throttling and refresh do not extend active timers.
Paused time stays paused. Storage failure does not block in-memory use. Timers
are device-local and do not synchronize across devices.

Audio is unlocked by the Start interaction, and denied audio or wake-lock
requests are optional. A visible message always indicates the end of the timer.
The browser must stay open for an audible alert; background delivery depends
on the device. Screen wake lock is requested only while running, released on
cleanup, and reacquired when returning to a visible page if supported.

## Verification

- npm run test:exercise-timer checks units, invalid values, paused time,
  resume, reload/background deadline recovery, zero bounds, and time formatting.
- npm run check runs the existing launch, privacy, functions, type, lint,
  production-build, and crawlability checks.
- Device QA: assign stickhandling for 1/2/5 minutes and a wall sit for 30 seconds;
  start/pause/resume/reset; open/close focus; refresh running and paused timers;
  return after the deadline; mark complete and undo; check a different player;
  check denied storage/audio permissions and offline team completion.

Existing assigned tasks retain their targets. New wall-sit library selections
start with one minute; existing repetition assignments remain unchanged.

## Guided workout layout

WorkoutCheckItem now presents one expanded exercise within GuidedWorkout.
The overview and each card header support reviewing any exercise. Completing
a task uses its existing save handler, then selects the next unfinished task,
wrapping to earlier unfinished work when needed. Undo stays available when the
underlying session allows edits. Timed tasks retain manual completion for work
done away from the app. Videos unmount when switching exercises. Timer state
still uses the persisted assignment deadline. The next card receives keyboard
focus and scrolls into view, respecting reduced-motion preferences.

Navigation tests cover skipped completed tasks, wrapping, final task, empty
workouts, and reviewing completed exercises. Physical device visual QA remains
necessary; local Chromium cannot launch under this environment's socket limits.

## Ready, sets, rest and instructions

Timers now use a five-second ready phase, then the prescribed work and rest
intervals. Coaches can choose 1–20 timed sets and 0–600 seconds of rest in the
weekly day editor, single practice editor, and solo workout builder. Equipment
and coaching cues are stored on each assignment. The three save RPCs preserve
these fields for drafts, team publication, and personal workouts. Existing
assignments default to one set with no rest.

The v2 device timer record contains phase, round, remaining time and deadline,
scoped to the user, player, assignment and prescription. A backgrounded phase
can expire, but the next phase starts only on visible return. It never loops
through several unseen sets to award completion. Final completion remains an
explicit player action. Timers from the older single-phase version start fresh.

Coaching cues appear with equipment, and library descriptions supply cues
where the assignment has none. The workout overview shows a completion summary
with exercise counts. Team and quick mode show actual logged shots; solo mode
does not invent shot totals from assigned targets. The existing finish-session
action remains the final save action where the screen requires it.

Database verification used rollback-only transactions to test all three save
RPCs, draft/publication/personal round-trips, invalid set-count rejection, and
unauthenticated rejection. Existing RLS and function authorization are retained.

Mobile review increased overview/volume touch targets, bounded the focus dialog
to the viewport, enabled vertical scrolling, and scaled long countdowns to fit
small screens. Physical iPhone Safari sound, lock-screen and visual testing
remains unverified because no real iPhone is available in this environment.
