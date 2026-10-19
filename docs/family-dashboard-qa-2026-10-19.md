# Family dashboard refresh — October 19, 2026

Parent-managed players and independent players now have the same priorities: today's workout, shooting challenge, then optional planning, badges and team activity. A compact family picker supports siblings. Muted red, real progress rings and encouraging copy replace competing panels; desktop and mobile share one responsive layout.

The team workout uses its saved session status, required-task counts and actual title. Checking every activity offers **Finish workout**; only a saved complete session shows **You did it!** Personal workouts read the same published cards and completion records as the training screen. Team and home workouts remain individually accessible. Team switches reject cached snapshots from another team or actor. Errors offer retry rather than pretending a workout, child or shot total is missing. Scheduled and finished challenges offer viewing actions instead of logging shots.

## Verification

- Real persisted mobile journey with separate confirmed disposable coach/parent accounts, two siblings and an independent player: choose player → open workout → check activity → finish session → dashboard completion → log 150 shots → saved dashboard total → sibling has its own zero total and unfinished workout → failed-read recovery → home workout completion. Tested at 320px and 390px, with a 1440px desktop layout check.
- Controlled states: no published workout, game day, empty challenge, scheduled/finished challenge, keyboard-accessible team selection and replacement of the previous team's snapshot.
- Regression checks include the coach dashboard's zero/active totals, empty team/challenge, program launch and error recovery.
- Chromium, WebKit and Firefox browser engines; simulated mobile viewports, not physical-device certification.
- Normal repository content, safety, type, lint and build checks. Existing lint warnings and optional local Chrome prerender fallback are recorded separately; neither is represented as a new passing physical-device gate.

Real test data is scoped to disposable IDs and removed, including task/session completions, workouts, players, teams and accounts. No existing customer's password, workout or challenge total is changed.
