# Production QA — October 18, 2026

Audit started October 18 at 10:12 p.m. Vancouver time. Authorized work window: five to six hours. Baseline: `54aa054` (program setup release). This is a working evidence log; pending gates are not passing claims.

## Release approach

Exercise real coach, family, player, solo and association journeys using fictional fixtures; inspect anonymous and cross-account access; inject failures; inspect phone layouts and keyboard use. Separate externally dependent checks from verified application behavior. Merge fixes only with appropriate regression coverage. Do not send unsolicited messages to real families or alter real teams.

## Final status and fifty release gates

The [production readiness report](production-readiness-report-2026-10-19.md) is the authoritative final gate ledger, verification summary and remaining launch checklist. The entries below preserve investigation history, including failures subsequently repaired. They are not unresolved findings unless the final report identifies them as such.

## First verification batch

The initial broad run completed with **104 passed, 24 skipped, 1 failed** in 7.3 minutes. The failure was the shared-workspace test clicking a welcome primary action while workout data changed that action, followed by clicking the departing page's workspace menu before the destination rendered. It now dismisses the stable close control and waits for the destination team heading. Both shared-account phone cases passed on replay (5.3 seconds). Skips remain explicit coverage gaps rather than counted passes.

The required project check passed again after the read-recovery fixes. The first route replay was interrupted when the separate broad test run shut down its owned development server; subsequent audit runs use a persistent server so test lifecycle does not terminate other checks.

The additive atomic program-save function passed rollback-only checks against the hosted schema: tier-scaled targets and notes preserved, invalid replacement rolls back prior draft and published tasks, retry keeps one program/card, started work remains unchanged, unrelated accounts are denied and anonymous execution is disabled. No schema change was committed to the hosted database during this test.

## Data integrity, calendars and first-run readiness

- Atomic week save/publication is implemented and the additive database migration is installed. Isolated PostgreSQL release checks and hosted rollback checks pass. A real mobile coach → edited program → invited new parent → player week replay passed (19.8 seconds). Existing default clients remain compatible.
- Production read recovery replay passed all five cases (43.5 seconds). A prior overlapping run shared its authentication file with a localhost run and ended on signin; test authentication paths are now independently configurable.
- Local calendar requests now use PostgREST's documented timezone preference, preserving count/return/upsert preferences. Actual hosted snapshots returned October 18 for Vancouver and October 19 for Tokyo/UTC during the same instant. Nine repeated browser calendar checks passed; real assignment → player completion → coach totals passed in Vancouver and Tokyo. See [PostgREST timezone preferences](https://docs.postgrest.org/en/v14/references/api/preferences.html#timezone).
- The longer release run exposed a genuine first-run readiness issue beyond the earlier selector repair: the welcome could appear before team preferences loaded, then disappear while the initial workout loaded. Player Home now waits for those reads; snapshot requests ignore stale responses after player changes. The welcome uses a proper modal with focus containment, Escape dismissal and a viewport limit. A deliberately delayed-read test passed at 320×568, and the two shared-workspace cases passed five repetitions (10 passes) after the final fix.
- Test API clients now sign out their own session rather than globally revoking the shared browser account's sessions. The route inventory must be replayed with this isolation fix; the previous broad run's late 401s and signin redirects are not counted as product permission failures.
- A rollback-only reproduction found another lifecycle issue: changing a published day to rest leaves its earlier unstarted workout visible. This remains an open repair; started/locked work must stay protected when clearing a day.


## First-hour release record

- [PR 26](https://github.com/JonDMorrison/thehockeyapp/pull/26): merged `1841fc4`; five production recovery cases passed.
- [PR 27](https://github.com/JonDMorrison/thehockeyapp/pull/27): merged `048ef27`; frozen-build regression **136 passed, six explicit skips**, followed by **13 production passes**. The skipped legacy completion cases have independent real-fixture coverage; the finished-challenge browser case still needs its dedicated fixture.
- Shared-device cache reproduction: an unrelated account could see the former family's fictional profile through browser history while fresh database reads were denied. Session-scoped UI/query/media cleanup fixes the reproduction. Offline read caches and queues are associated with their account, without discarding pending work. Twenty-eight targeted frozen-build cases passed, including the new privacy and published-rest-day journeys. This batch is not yet merged at this checkpoint.
- Rest-day clearing passed both hosted-schema rollback checks and local PostgreSQL checks. The local fixture was corrected to match production's non-cascading workout foreign keys, so it catches incomplete deletion sequences.
- Further navigation inspection found four account-menu links pointing to absent routes (notifications, billing, privacy and help). These are the next UX repairs. A static route guard now detects them; it will become a gate after the links are corrected.

## Account and media verification

- [PR 28](https://github.com/JonDMorrison/thehockeyapp/pull/28) merged `3e6e6ea`. Both new shared-device privacy and published-rest-day browser gates passed on production (12.6 seconds).
- A prepared disposable ended challenge passed its complete production browser gate (4.1 seconds): family writes disabled, audited staff correction, final standings, historical totals after leaving, and denied access after the last sibling leaves. Fixture enrollment was dated within its challenge window; an initially invalid fixture correctly failed the eligibility guard.
- Account-menu review found four absent destinations. Notifications now opens actual email preferences; privacy/support open existing pages, and the unavailable billing entry is removed for the community-free app. A static navigation checker is included in the required quality check.
- Player-menu photos used public URLs for a private bucket, making saved images unavailable. Uploads now save private references, render signed URLs, use unique object names, validate type/size, and remove a new object if the profile write fails. Legacy public-shaped URLs for private buckets resolve through authorization. The mobile test verified upload, reload, legacy read repair, and anonymous public-URL denial.
- Profile readers shared a cache key but requested different fields. Both now request the complete profile so changing a coach name cannot blank saved coaching answers. Failed profile/preference reads expose retry controls rather than editable default values.

## Offline reliability repair

- A real offline completion followed by an injected HTTP 503 reproduced lost retry visibility: failed events were excluded from every subsequent sync attempt and count. Unsaved failed/interrupted records are now retried in order, retained across reload, and never abandoned after a fixed retry limit.
- The app-wide pending notice explains that work is saved on the device and offers an accessible Retry sync action. A brief outage also recovers through the automatic interval without pressing it.
- In-flight sync is aborted on identity changes and reuses each event's original idempotency key. Two fresh-family browser tests verified that the next family sees no former pending work, cannot sync it, and the original family can return and finish exactly once.
- Frozen build: **11 passed (1.2 minutes)** covering existing offline completion, shared-account use, server outage/reload/manual retry, automatic retry, and an interrupted account switch. Full project quality check passed.
- The 320×568 route sweep found horizontal overflow on the team and player lists; all 43 routes were free of runtime crashes and failed reads. Small-screen overflow remains open for the next repair.

## Small phones, keyboard access and browser coverage

- [PR 29](https://github.com/JonDMorrison/thehockeyapp/pull/29) merged `f8587e4`; its complete real mobile profile/preferences/photo journey passed on production (18.5 seconds).
- [PR 30](https://github.com/JonDMorrison/thehockeyapp/pull/30) merged `7ef97e1`; all three production offline recovery gates passed (50.3 seconds).
- Removed duplicate workspace controls from crowded team/player headers and allowed actions to wrap. The 43-route sweep passed at 320×568 with no horizontal overflow, failed reads or runtime exceptions.
- The route sweep now audits actual accessible names (including labels attached by HTML), rather than assuming every textless element is unnamed. Remaining unnamed buttons, switches and selects were labeled. Team/player/program cards are native links; a real-fixture keyboard test opens all three using Enter. Both strict route/control-name and keyboard gates passed (59.7 seconds).
- Added opt-in WebKit and Firefox test projects. First public matrix: **147 passed, three Firefox scroll failures**. The router inherited CSS smooth scrolling during route replacement, which Firefox could interrupt at the wrong position. Route restoration now positions immediately; all three Firefox reproductions passed (12.1 seconds). The full matrix is being replayed before merge.

## Workout integrity and solo completion

- [PR 31](https://github.com/JonDMorrison/thehockeyapp/pull/31) merged `e4b38f6`. Public matrix: **150 passed**, no skips; signed-in matrix: **81 passed**, no skips, across Chromium, WebKit and Firefox. Production Firefox reproductions passed (11.0 seconds); production strict 43-route small-phone and keyboard gates passed (1.3 minutes).
- Single-workout team editing, solo quick workouts, custom workouts and solo weeks previously saved cards/tasks through separate requests. These now use complete database transactions, preserve notes/videos, reject replacement of started work, and retry without duplicate cards. A deliberately failed second solo day rolls back the whole save and plan metadata.
- Solo template replacement previously deleted the old card before creating its replacement, including recorded progress. That destructive preliminary delete is removed. Started work is retained with an actionable error.
- Solo task completion and session completion were separate writes, with unchecked session failures; undoing a task left the session complete. A new authorized transaction derives the session after every explicit task state change. Repeated completion is idempotent, undo clears the completion timestamp, and a simulated session-write failure leaves no partial task write.
- Workout checkbox animations now run alongside saving rather than delaying it. Pending solo saves disable repeat actions; template choices are keyboard-operable buttons. Date-only values use local calendar parsing in custom workouts, program previews, dashboard history and active programs.
- Local PostgreSQL and rollback-only hosted-schema gates passed. Five new real mobile lifecycle checks passed on a frozen build (13.1 seconds), including a genuinely committed save with a lost response followed by a duplicate-free retry and a Vancouver custom date. Broader replay is in progress before merge.

The workout browser matrix initially found two unsupported clipboard-permission requests in the test harness (WebKit/Firefox) and an intermittent Firefox tap failure. Browser-specific clipboard verification now uses the actual supported capabilities; fixture manifests have configurable/browser-specific paths. The repaired lifecycle matrix passed all **36 cases** across three browsers. Investigating rapid taps also exposed swipe handling that changed wrapper structure after mount and attached drag recognition to ordinary controls; gestures now start explicitly at the edge, and the session boundary resolves the local account before mounting the workspace. Final repeated readiness checks are running before this release is merged.
## Guardian authorization finding

A fresh unrelated family could insert itself into another fictional child's guardian list because the INSERT policy accepted `user_id = auth.uid()` as authorization. The reproduction failed before repair and removed its temporary grant in cleanup. The policy now requires the actual player owner; verified invite redemption remains separately authorized.

The repair is installed in production. Two real-account API gates passed (3.3 seconds): self-grants as guardian/owner are denied, the true owner can grant/revoke, relationship acknowledgement is required for guardian invite redemption, and email-bound staff invitations still work. Direct uninvited staff assignment was already denied by table privileges. At inspection, additional guardian memberships and mismatched owner-role rows both counted zero; this is current-state evidence, not a historical-access claim. A local RLS test deliberately grants table INSERT and proves the row policy itself still denies self-grants.

## Session-photo privacy finding

The private-photo fixture reproduced a coach reading a caption marked `parent_only`. The photo-record policy now limits staff access to photos explicitly shared with team adults; private images remain accessible to their family. Storage signing inherits that record visibility. Additional owner-path policies allow cleanup when the photo-record write fails, avoiding inaccessible orphan uploads.

The production API/storage test passed the private → shared → private transition, denied/allowed image signing, and an uploaded object's deletion before any photo record exists (3.4 seconds). Matching local row/storage-policy gates passed. Issued signed URLs have an expiry; changing access prevents new signed URLs rather than undoing an image someone already received.

## Association and photo-permission follow-through

- [PR 32](https://github.com/JonDMorrison/thehockeyapp/pull/32) merged `2a8db09`; the final matrix passed 48 cases and 20 repeated Firefox immediate-interaction journeys. [PR 33](https://github.com/JonDMorrison/thehockeyapp/pull/33) merged `5d479c5`. The production integrity/privacy replay passed all eight cases (22.0 seconds).
- A fresh association owner connected a real fixture team, created an email-bound reporting invitation during a simulated email-service outage, and a fresh viewer accepted it. The viewer sees aggregate totals, cannot read the private player record, cannot disconnect teams, and cannot invite administrators. Wrong-account redemption is denied.
- Association read outages now offer retry; failed team/staff/invite reads no longer silently resemble empty workspaces. Invite links have a readable/selectable field and clipboard failure guidance; failed email delivery is described accurately.
- Photo sharing preference records were collected but not enforced. Staff access now requires both per-photo sharing and the uploader's active, confirmed consent. Uploader impersonation is denied. The live API/storage consent regression passed after repair (4.4 seconds); local row/storage/consent gates pass.
- Player Settings now exposes the saved photo permission. The 320×568 photo journey passed upload, nested permission settings, persisted consent and failed-write recovery, orphan cleanup on metadata failure, safe storage-removal failure, missing-image recovery after a partial delete, and retry (the combined association/photo replay passed three cases in 32.6 seconds). Photo/settings sheets scroll within the viewport and appear above account controls. Supported image validation, same-file reselection and preview cleanup are included.

## Training record boundaries and image identity

- PR 34 merged `f4ae8ee`. Its live 320×568 photo recovery journey passed (15.9 seconds), and the independently opted-in association owner → viewer journey passed (15.2 seconds). No real invitation email was sent.
- A guardian could attach their child's completion to an unrelated team's task or another player's personal workout. New database triggers verify the player/workout relationship for task, session and photo records; personal task completions also have a unique key. Historical records are preserved.
- A separate reproduction confirmed forged photo metadata could authorize an unrelated family's stored image. Canonical player/workout paths are now enforced before metadata writes. The live two-family negative/positive API/storage test passed after repair (3.6 seconds); local SQL checks cover valid paths and forged/traversal paths.
- Practice shot entry now rejects negative, fractional, scientific-notation and oversized input with an inline explanation. Valid totals persist, zero clears a total, and database bounds also reject direct invalid writes. All three browsers passed the mobile test (16.1 seconds).
- Expired/rejected refresh-token sessions return to sign-in and cannot reopen the private team screen; three-browser replay passed (5.0 seconds). The first test attempt expected a nonexistent heading, then incorrectly expected Back from the first page to remain in the site; those test assumptions were corrected.
- A broader replay exposed an intermittent WebKit sheet layering failure after nested photo permissions. Modal content now has an explicit layer above its backdrop, with a separate layer for nested permissions. Repeated verification is in progress before release.

The corrected sheet build passed **15 repeated WebKit photo journeys** (4.1 minutes). The original build reproduced the overlay problem once in ten runs, with the DOM confirming the backdrop was appended above its equal-layer dialog. Explicit layers remove that ordering dependency. The broader integrity matrix passed 23 of 24 cases; one Firefox immediate shot tap did not open its dialog, while 20 instrumented repetitions then passed. That intermittent interaction remains under observation in the full browser sweep and is not counted as a clean matrix pass.

## Optional AI and weekly summary accuracy

The backend secret inventory contains Supabase's platform credentials only: no AI provider key, Resend key, administrator email or cron secret. Provider-generated workouts and email delivery cannot be represented as verified operational services. Family invitation links remain available. No real recipient was contacted during this audit.

Three summary functions now honor active guardian AI consent and exclude player names from provider prompts. Opted-out or unavailable-provider cases produce factual summaries. Home summary scheduled counts are scoped to the requesting family's cards; scheduled weekly workout/streak totals use the requested week. Failed data reads fail the summary instead of silently persisting zero totals. Community summaries no longer require an unavailable paid entitlement.

Fifteen handler-level scenarios pass with controlled database/provider responses, covering consent, withdrawal, removed guardians, invalid dates, foreign cards, prior weeks and provider failure. The actual live backend generated and persisted a factual summary without AI permission. Its mobile UI journey passed in all three browsers (47.4 seconds), including generation failure/retry, reload, list-read outage/retry and saved consent toggles. The test accounts for the deliberately asynchronous server-confirmed switch state and the shared component's hidden desktop/mobile copies.

Player home now exposes privacy settings even without a team. First-run welcome also recognizes a ready personal workout and routes it to the home workout instead of telling the child to wait for a coach. Team-workout readiness and nested photo regressions passed independently across all three browsers.

## Privileged operations and alert delivery

The admin activity email function accepted public API credentials as its only gateway check. Its database trigger also used public credentials. The function now requires a dedicated private dispatcher secret or service authentication; the trigger reads the matching secret from Vault. The dedicated credential is configured without putting its value into source control. Email provider credentials remain absent, so delivery is still an explicit operational prerequisite.

Ten actual-handler scenarios passed with mocked delivery, covering anonymous/ordinary/wrong-key denial, authorized dispatch, escaped metadata, missing configuration, duplicate prevention, provider failure and a failed post-send database mark. Each event has a stable provider idempotency key and a bounded request timeout. Local PostgreSQL tests validate trigger payloads, urgent-only dispatch and revoked direct execution privileges. The live negative test passed against eleven privileged endpoints (9.3 seconds), with ordinary-user requests denied; anonymous/wrong-secret alert requests are denied, and the correct private dispatcher reaches body validation. No email was sent.

## Family training history

The existing history page showed only the active team's last seven days. A real two-account reproduction displayed the team session but omitted the child's published home workout. The replacement combines published home and active-team history in 30-day windows, preserves only the family's own recorded team work after leaving, and does not grant continued access to future team workouts or other families' history. Load failures offer retry; older-window failures retain already loaded records.

Local SQL gates passed for home/team totals, older-window pagination, leaving, future-work exclusion and unrelated-family denial. The actual 390px family → history → leave → preserved history → failed read/retry journey passed in all three browsers (34.7 seconds); a final 320×568 replay is running on the release build. The summary/shot/privileged boundary production replay passed all three journeys (25.4 seconds). PR 35 merged `2251f00`, PR 36 merged `b120d7d`, and PR 37 merged `b5abd00` after their quality checks passed.

## Invitation recovery and home-only navigation

Home-only players reached a team-only empty state from Today/Week and lost navigation inside a home workout. Those paths now open the existing private home workout/week views and retain player navigation. An active-team preference read failure stays a retryable error rather than sending the family into a different workspace. Coach-only empty-workout copy is hidden when no team exists.

Invitation preview/list outages now offer retry instead of claiming an invite is invalid or the family has no children. Player selection uses keyboard-operable native buttons. Expired/revoked invites remain closed, and revoking an invite does not remove children who already joined.

All six new journeys passed across three browsers (1.6 minutes), including 320×568 welcome → home workout → week → history, preference outage/retry, public preview outage, family list outage, existing-account sign-in, two-child joins by Space/Enter, expiry and revocation. Broader affected-flow regression is running before merge. The family history release also passed on the actual live deployment (12.6 seconds); an earlier live attempt loaded the pre-deployment page, so it was discarded as a deployment timing failure.

## Starter drafts without a provider dependency

AI drafts previously failed before authentication because the provider key is absent. Authorized coaches/families now receive an explicitly labeled editable starter template when AI is unavailable or disabled. Draft generation validates dates, frequency, time budget, supported activities and ownership; invalid/provider-failed drafts fall back safely. Templates preserve requested dates/frequency, respect activity preferences and lighter ice days, and support selected backhand/puck-control focus. No program is published by the draft endpoint.

The family goal was required but unused. It is now optional, bounded and saved privately in workout notes rather than sent as unused AI context. Draft focus controls no longer toggle twice when clicking their checkboxes, and dialog controls have accessible names.

Thirty handler/helper scenarios passed, including calendar rollover/leap dates, one-to-seven-day frequency, consented guardian authorization, malformed requests, provider failure and rejected negative AI targets. Six real 320×568 coach draft → review/edit → publication and parent → twelve private workouts over four weeks journeys passed across three browsers (22.0 seconds). The endpoint is deployed with JWT verification. Genuine provider-generated text remains unverified because the provider key is not configured.

The affected-flow regression for the family navigation release passed all eighteen cases across three browsers (6.3 minutes). Sixty isolated Firefox editor → workout → immediate-tap transitions also passed; the earlier intermittent tap could not be reproduced in that isolated run and remains noted separately.

## Broad sweep and final interaction checks

The frozen three-browser sweep completed **432 passed, 51 explicit skips, 3 failed** in 33.3 minutes. The skipped feature opt-ins/conditional legacy fixtures are not counted as passes; separate targeted evidence covers the release journeys. Two failures came from a legacy session test using an arbitrary first player, unrelated pre-existing assignment state and a disabled completion control. That test now creates its own published assignment, completes it and verifies the exact persisted session after reload, rather than relying on a non-asserting record-count heuristic.

The third failure was the WebKit association invite journey after team connection. Team connection now waits for its dashboard refresh before confirming success, so the form is not confirmed ready while its layout/data is still changing. Implicit smooth document scrolling is removed from automatic control/focus transitions; deliberate in-page smooth scrolling remains explicit. The association gate now holds the refresh and proves confirmation waits. Session persistence, workout edits and association invitations passed all nine targeted cases across three browsers (59.6 seconds). Repeated interaction checks are running before this final release.


## Team goals and secondary coach journeys

A rollback-only reproduction confirmed team goals counted a rostered child's shots from another team. The goal calculator now restricts shots/sessions to published work for its own team, counts participation against current membership, serializes refreshes and clears a completed state when corrected totals fall below the target. Targets and date windows are constrained in both the form and database. No existing team goals were present at the migration preflight.

The installed migration and local PostgreSQL release gates passed. Six phone browser cases passed across Chromium, WebKit and Firefox (58.0 seconds): defer training → invite families → recover a failed template catalog; keyboard Quick Assign → add/reorder/remove activities → parent shot/session completion → team-only goal → downward correction. Initial attempts used a hidden More team tools section and the standard planner rather than its onboarding variant; those test navigation assumptions were corrected. The template catalog now exposes a retry when its read fails, and the empty goal entry is a native keyboard-operable button.

## Home badges and saved-read recovery

A hosted rollback reproduction confirmed a completed home practice could not earn the existing First Practice badge: the evaluator only counted team completion tables. The installed additive migration now counts actual personal sessions, game-day sessions and prep completions alongside team records, retains opt-in/guardian authorization and awards each badge once. Planned shooting targets are deliberately not counted as actual shots.

Solo completion triggers evaluation, and opening a badge page can catch up after an interrupted evaluation. The celebration now uses a keyboard-accessible dialog with Escape/focus handling, reduced-motion support and a cleaned-up confetti timer. Saved home workouts and both badge pages expose retry states instead of suggesting missing work or zero awards during a read outage. Shared player cache entries now have a consistent complete shape; the profile's guardian-enriched read has a distinct cache suffix.

Local PostgreSQL checks and the required project check pass. First affected-browser matrix: nine passes across three browsers (1.7 minutes). Final starter/navigation/badge matrix after cache and catch-up refinements: 12 passes, no skips, across Chromium, WebKit and Firefox (2.3 minutes), including 320px reduced-motion completion, single award, Escape dismissal, and home/badge read-failure recovery.

## Email preference behavior

Anonymous unsubscribe testing found malformed category names silently changed every optional preference, and the page claimed the choice was saved even when the request failed. Unknown categories now leave preferences untouched; invalid links, temporary save failures and saved choices have distinct states. A failed save offers retry.

All three phone-browser cases pass (8.7 seconds). Actual anonymous API writes verified category-specific changes, reload/idempotency, invalid token/category denial, a forced 503 followed by retry, and all-optional unsubscribe preserving team invites. No email was sent; delivery remains an external configuration gap.

## Production replay and browser-free public content

- [PR 42](https://github.com/JonDMorrison/thehockeyapp/pull/42) merged `745ace5`. The affected replay completed with 27 passes and 15 opt-in skips; explicitly enabling the five skipped groups then passed all 15 cases (5.9 minutes). Production defer-training, catalog recovery, goal/correction, home navigation and existing-family invite journeys passed all four cases (55.5 seconds) after the exact release was READY.
- [PR 43](https://github.com/JonDMorrison/thehockeyapp/pull/43) merged `a13e679`; [PR 44](https://github.com/JonDMorrison/thehockeyapp/pull/44) passed CI and is being released.
- Reading the actual production `/about` response confirmed it returned the homepage heading until JavaScript mounted. Public build fallbacks now contain route-specific main content. Privacy and Terms render their actual static JSX policy source, including the privacy-request link, rather than maintaining a second policy. Private route fallbacks show the appropriate entry point instead of sample team statistics. `/pricing` redirects permanently to the free homepage at the hosting layer.
- Browser-free HTML checks passed all 21 cases across Chromium, WebKit and Firefox (8.3 seconds). Initial local tests accidentally exercised Vite's SPA fallback instead of Vercel's explicit route mapping; artifact paths are now used for local preview. A privacy-link selector was corrected to its actual accessible name. Hosted public-path verification follows deployment. The required build guard checks distinct page content and full legal sections even without Chromium installed.

## Calendar import integrity and authentication

The actual calendar endpoint rejected valid signed-in accounts: its older SDK's `getUser()` did not consume the supplied bearer token. It now validates that token explicitly. A real request reproduced the 401 before repair and reached authorized validation afterward.

The original handler also treated an HTML HTTP-200 response as an empty calendar, could cancel all saved events, and reported database read/write failures as success. The repaired importer validates complete calendar content, bounds streaming downloads, rejects incomplete events, checks every persistence stage and keeps existing events when input or upserts fail. Public `fc...`/`fd...` hostnames are no longer mistaken for private IPv6 addresses. Private calendar URLs and event titles are excluded from error logs.

Timezone handling now uses the runtime's timezone database, honors the selected timezone for floating events, handles fixed abbreviations without adding DST twice, and covers Phoenix, European offsets and repeated/skipped clock changes. This is not evidence of every calendar provider or recurrence format.

The required project check passes. Fifty-one actual-handler/helper scenarios pass with controlled provider/database responses. Six 320px browser flows passed across Chromium, WebKit and Firefox (1.2 minutes), using the live endpoint and saved fictional events: a real non-calendar response leaves events active; source-read retry works; failure details refresh; repeated invalid previews remain usable. Imported team events correctly rejected normal-client insertion, so their fixture setup uses an explicitly opted-in service client restricted to a verified disposable team. Initial tests also used the wrong Connect button name; corrected harness paths pass.

## Automatic calendar refresh

The hosted `cron.job` table was empty, despite automatic-calendar copy. A private Vault-backed dispatcher and matching function secret are now configured. The additive migration registers a 15-minute job paused until fixture cleanup and the final HTTP receipt check. The dispatcher covers team and home calendars, uses bounded batches/concurrency and rejects ordinary accounts or the private key on unrelated actions. Bulk event upserts reduce request fan-out and preserve the previous event set on a failed upsert.

Local SQL dispatch/privilege gates and the required project check pass. Fifty-eight calendar helper/actual-handler scenarios pass, including batch bounds and partial failures. Six mobile calendar cases also completed a controlled public HTTPS fixture through the live function and database: a valid floating-time practice imports at the chosen timezone, the old event is cancelled only after successful import, and a subsequent invalid response preserves the new active event. This uses a fictional [HTTPbingo Base64 response fixture](https://httpbingo.org/), not a real family feed. Real TeamSnap/provider-specific recurrence remains separate validation.

The combined browser batch passed eight cases with one API test exceeding its old 30-second limit. The privilege test now uses a bounded native request wrapper that omits authorization headers from diagnostics and a 90-second batch limit. Its three-browser replay passed (10.2 seconds). A temporary QA session exposed in that earlier local diagnostic was revoked and the stored diagnostic redacted. No credential is included in the delivered report.

## Final badge preference and production regression checkpoint

PR48 adds a visible Player options entry to the two badge pages for the owning or confirmed guardian. Privacy preference reads expose retry; failed writes restore the attempted switch; a separate optional award evaluation cannot misreport the already-saved choice. Final 320px tests passed in Chromium, WebKit and Firefox (three cases, 1.9 minutes), including read/write outages, one award after completion, repeat evaluation and persisted preference.

The final frozen broad sweep completed 540 cases: 512 passed, 26 explicit skips, two harness failures. Both failures were unsupported clipboard permission requests on WebKit/Firefox, now corrected. All 12 production challenge/signup/family, privilege-denial and calendar replays then passed across all three engines. Production no-JavaScript route checks also passed all 21 cases; `/pricing` returned the intended HTTP308 redirect. PR48 required CI passed before merge.


## Final live release, fixture cleanup and scheduler receipt

Application release PR48 (`f62197db1284e706d758aa1e46d33591dd73ec86`) was confirmed READY on production. The final 320px badge/recovery case passed live in 39.6 seconds. Cleanup passed a rollback rehearsal and explicit baseline guards, then removed 379 fictional auth accounts via Auth Admin API, 607 fictional teams, 801 fictional players, 564 practice cards, 28 associations and dependent records. Three uploaded test objects were removed through Storage API. Scoped account/team/player verification returned zero remaining; original seven users, 14 teams and 14 players remain, including the protected QA fixtures.

Private calendar dispatch request2 returned HTTP200, success=true, total=0 and failed=0 after cleanup. An actual scheduled run at 2026-10-19 10:25:00 UTC succeeded; request3 also returned HTTP200, success=true, total=0 and failed=0 with no timeout/error. The temporary one-minute verification cadence was immediately restored to active `*/15 * * * *`. Actual event import remains independently proved by the controlled HTTPS fixture cases; zero-source dispatch alone is not import evidence.

Final gate ledger: 43 verified, seven partial, no pending gates. The partial gates and concrete launch conditions are listed in the final report. No real family emails were sent.
