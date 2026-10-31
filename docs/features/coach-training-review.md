# Coach weekly review

The team Progress page now starts with an alphabetical weekly training review.
Coaches can browse previous weeks, search/filter the active roster, open daily
exercise checkoffs, and follow the existing full profile/goals route. Weekly
counts are based on published team assignments dated within the selected week
and through today, excluding assignments from before the active membership's
joined date. Future work, personal workouts, and shooting challenges are not
silently mixed into this review. The existing challenge overview remains below.

Session totals use saved complete session records, not inferred checkbox totals.
Workout shots use the latest task completion records, with player/task pairs
deduplicated. Partial exercise work counts toward participation. No record is
labelled "skipped". The exercise breakdown shows both required and optional work.
The summary of participants, completed sessions, shots, and exercise checkoffs
serves as an on-demand weekly recap, with no player ranking in the main review.
Historical milestone rankings remain behind an optional disclosure.

Encouragement uses the existing team_cheers table and coach identity, with quick
thumbs-up/star and a bounded message input. No messages are sent by deployment
or tests. RLS remains responsible for access; the component is mounted inside
the existing staff-authorized TeamProgress screen. Query caches are scoped to
the signed-in user, team, and week. Reads page through task/session completions.
Failures show a retry state rather than presenting zeros as loaded data.

Tests: tests/timers/coach-training-review.mjs covers player isolation, partial
work, canonical saved sessions, duplicate records, membership dates, and empty
periods. npm run check includes this test. Real-device visual testing and actual
message delivery remain unverified; no test encouragement is sent to players.
