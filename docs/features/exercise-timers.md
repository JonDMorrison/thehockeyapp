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
