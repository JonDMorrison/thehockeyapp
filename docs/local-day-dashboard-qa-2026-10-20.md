# Local calendar and midnight dashboards

Date-only workout schedules follow each viewer's device calendar. Database REST requests already send `Prefer: timezone=<IANA zone>`; fresh-page live tests confirmed the server honors it. Shooting challenges retain their configured challenge timezone. Completion timestamps remain absolute instants and are grouped into local weeks.

## Fixes

- A shared calendar subscription updates at the next local midnight, observes timezone/clock changes, and catches sleeping tabs on focus/visibility. It invalidates active feeds without remounting forms.
- Coach and personal dashboard query keys include the calendar day and zone. Family snapshots include that identity in their request guards and cache validation. Late responses cannot revive the previous day.
- Team/home workout screens update their date filters automatically. The player workout clears old optimistic session state and ignores stale offline/cache query side effects after its player/day changes.
- Team progress, roster activity and weekly heatmap recompute at the week boundary.
- The authorized coach snapshot groups calendar events in the request timezone instead of UTC. The header accepts both the snapshot's local display time and legacy ISO instants, guards invalid values and wraps on narrow screens. A real 23:30 local event exposed and now verifies the old header crash.

## Validation

`npm run check` passed, including types, lint, build, privacy, links and journeys. Existing lint warnings remain; optional local Chrome prerender is unavailable, static crawlability passed. CI verifies hosted first visits.

Live baseline: original local-calendar snapshot tests passed Vancouver, Tokyo and UTC. 63 production-build calendar scenarios passed. Nine additional player reset assertions passed. Controlled mobile clock tests cover coach, family home, home workout, player workout, Sunday/Monday progress, and sleeping-tab wakeup in Vancouver, Tokyo and New York across Chromium/WebKit/Firefox, at 320px. The test session expiry is extended only inside the controlled browser fixture so fake future time does not invalidate the QA session. WebKit's emulated offset is fixed: future wall dates are constructed inside the emulated browser, rather than mixing host DST offsets with it.

Real disposable coach/manager/parent/player flows passed in Vancouver, Tokyo and New York. Node clients now send the same timezone preference as browsers; removed the earlier UTC workaround and admin date patches. Real New York late-game fixture verifies the coach RPC returns the correct 11:30 PM display time and retains correct workout totals. All disposable records are cleaned in finally blocks.

`tests/sql/local-calendar-boundaries.sql` passed against the linked database: eight deterministic midnight/DST instant-to-date assertions, with no user-data changes. Database security advisors reported no error-level issues. Migration retains existing staff authentication/authorization and execute grants; no RLS policy changes. CLI bulk migration push was avoided because unrelated remote history differs from this checkout; the single reviewed migration was applied through the remote migration API.

Artifacts are in `../hockey-audit-output/timezone-*`. Failed fixture runs are retained (array-vs-object fixture response, fake session expiry, WebKit offset construction, and the genuine game-time crash before its fix). Tests emulate mobile browsers and do not certify physical devices.
