# Daily shooting cap and bonus effort

Each challenge defaults to 250 leaderboard shots per player per challenge-local calendar day. Coaches can choose 1–10,000 at publication or change the cap later. A change applies to the whole challenge, including earlier days, and is disclosed in the settings.

The raw ledger and correction history are preserved. Standings sum `least(daily shots, daily cap)` across dates; bonus effort sums the remainder. An unlogged player remains at zero and unranked. A saved positive bonus balance earns the challenge-specific Bonus Boss badge; correcting that balance to zero removes the badge. It is shown on the challenge, standings, and family dashboard. Bonus counts never determine rank or comparison-bar lengths.

Existing challenges receive 250 automatically. For example, an existing 3,000-shot day becomes 250 leaderboard shots and 2,750 bonus shots without rewriting the entry. Workout totals and weekly effort summaries retain actual effort rather than being treated as competition scores.

## Validation

- `npm run test:shooting-db`: 69 assertions, including legacy authorization and concurrency, migration/backfill, zero entries, 3,000-shot split, daily boundaries, ties, raw preservation, corrections and badge removal, invalid caps, staff-only cap changes, stale updates, and simultaneous coach edits.
- `npm run check`: passes. Existing 28 lint warnings; optional local Puppeteer prerender unavailable, static crawlability fallback passes.
- `e2e/17-public-shooting-demo.spec.ts`: demo replaces totals, caps standings at 250, preserves bonus, removes badge after corrected totals, and retains signup intent.
- `e2e/21-first-challenge-navigation.spec.ts`: mobile/desktop signup, default and custom cap payloads, invitation recovery.
- `e2e/74-shooting-layout.spec.ts`: responsive 320–1920px layouts, tied ranks, identity failures, family/coach context, archived/scheduled/empty/error states.
- `e2e/75-all-team-leaderboards.spec.ts`: real disposable coach, parent and independent-player accounts on a shared team at 390px. Coach edits cap to 300; each actor saves 3,000 raw shots, sees 300 credited/2,700 bonus, tied first place, and Bonus Boss. Families cannot change cap. Coach publishes another challenge with a custom 175 cap. Private historical daily entries and other-team data remain inaccessible.
- Browser suite covers Chromium, WebKit and Firefox with mobile viewports; no physical-device claim. Fixture teams/users/photos references are disposable and cleaned up.
- Two reviewed migrations applied independently; no unrelated migration-history repair. Security-advisor counts unchanged, no additional exposed SECURITY DEFINER endpoints.

Publication retries lock the challenge row before comparing caps, preventing an old publication request from racing with a coach cap change. Both new public RPCs are invokers; private implementations enforce staff access with an empty search path.
