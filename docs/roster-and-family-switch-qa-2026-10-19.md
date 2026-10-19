# Visual roster and coach/family switching — October 19, 2026

## Behavior

The staff roster uses responsive player cards with private photos/initials, jersey numbers, position, shooting side, and a keyboard-accessible profile link. Search accepts names, jersey numbers (including #), and positions. Empty and no-search-result states have clear next actions.

A bounded, paginated completion query shows this team's completed workouts for the current local Monday–Sunday week, with workout-day indicators and team totals. These are workout counts, not shooting challenge totals or a made-up completion percentage. Other teams, home workouts, incomplete records, future completions and prior weeks are excluded by the query. Failed progress reads leave the roster usable and show unavailable values with retry, rather than false zeros. Staff authorization gates both roster and activity requests.

The account switcher now has a visible Switch label, family profiles before coaching teams, sufficient header space and a layer above the sticky header. Header actions wrap when necessary on narrow screens. Notifications have an accessible name.

Adding a child in the coach dialog had invalidated a nonexistent `user-roles` cache instead of the actual guardian-role cache. The dialog now refreshes guardian/family data immediately. If profile creation succeeds but joining the team fails, retry reuses the saved player ID. Existing children already on the team have a direct dashboard switch action. Failed family reads no longer present an empty family and invite duplicate profile creation. Standalone player creation clears the previous team/association context.

The reported existing Grace profile was checked read-only and remains linked to its owner. No real family's player was created, changed, or removed during verification.

## Tests

- `e2e/68-coach-family-switch.spec.ts`: real disposable coach accounts and children in Chromium, WebKit and Firefox, at 390px/320px. Creates through the coach dialog; forces team-add failure; retries with exactly one profile; switches immediately; dismisses the normal first-run welcome; restores the child at `/today` and reload; checks settings/notifications tap access; switches back to coaching. Real database rows prove the roster includes only the current team's current-week completion, excluding another team's completion and a previous-week completion. Existing-child dashboard shortcut also works.
- `e2e/69-roster-visual-states.spec.ts`: six UI fixture scenarios across all three engines (18 checks): mobile/desktop cards and signed photos, long names, search, keyboard profile navigation, switcher tap access, progress failure/retry, empty roster, authorization failure without data requests, pagination beyond 500 records, and family-read failure/retry without creation controls.
- Adjacent coach, family and player-profile browser regressions are included with the roster states in a 54-check run.
- Full local `npm run check` passed with 28 existing lint warnings. Optional local Chrome prerender unavailable; static crawlability passed. Final changed-file type, lint and brand checks passed.

Browser emulation is not physical-device certification. UI fixture tests use controlled REST/storage responses; the separate real coach/family test verifies actual database reads and writes. Disposable records are removed in cleanup. No schema or authorization policy changed.

Earlier test attempts identified duplicate fixture IDs, a missing test dismissal of the welcome dialog, and a missing other-team membership in the test seed. These fixture issues were corrected. The actual header layering and cache invalidation defects were fixed in the app.

Screenshots, logs and production deployment verification are retained in `hockey-audit-output/roster-design-2026-10-19/`, outside the source tree.
