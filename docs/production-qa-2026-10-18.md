# Production QA — October 18, 2026

Audit started October 18 at 10:12 p.m. Vancouver time. Authorized work window: five to six hours. Baseline: `54aa054` (program setup release). This is a working evidence log; pending gates are not passing claims.

## Release approach

Exercise real coach, family, player, solo and association journeys using fictional fixtures; inspect anonymous and cross-account access; inject failures; inspect phone layouts and keyboard use. Separate externally dependent checks from verified application behavior. Merge fixes only with appropriate regression coverage. Do not send unsolicited messages to real families or alter real teams.

## QA gates

| # | Area / scenario | Evidence / result |
|---|---|---|
| 1 | Homepage first visit and primary actions | Verified — public journeys in the 136-pass run |
| 2 | Demo workout completion and reset | Verified — interactive completion/reset |
| 3 | Demo shooting challenge and signup handoff | Verified — real mobile handoff and saved shots |
| 4 | About / features / support / legal navigation | Verified — public pages/navigation |
| 5 | Small phone layouts and no horizontal overflow | 390px inventory passed; 320px welcome passed; full small-phone sweep pending |
| 6 | Keyboard navigation and accessible control names | Keyboard workout/tabs and welcome focus/Escape passed; other controls under review |
| 7 | Reduced motion and focus visibility | Code review passed; physical-device validation pending |
| 8 | Signup validation and password visibility | Verified — signup normalization, six-character password and visibility |
| 9 | Signin, signout, return destinations | Signin/return paths passed; account-switch cache repair passes locally |
| 10 | Recovery invalid/expired links and request errors | Invalid-link/recovery UI passed; real mail receipt unverified |
| 11 | Session expiry and protected routes | Route guards passed; dedicated expiry case pending |
| 12 | Account/workspace lookup failure recovery | Verified — welcome and five workspace retry paths |
| 13 | Coach team creation and validation | Verified — real coach signup/team setup |
| 14 | Program/challenge choice and skipping | Program/challenge choices passed; skip path pending |
| 15 | Visual program plans and date selection | Verified — visual plans and edited dates |
| 16 | Program draft save, reload and retry | Verified — save/reload/retry plus atomic database gates |
| 17 | Activity edit/add/remove/reorder/validation | Edit/remove passed; add/reorder cases pending |
| 18 | Publish, conflicts, duplicates and failure recovery | Verified — atomic publication, failed-request retry and progress protection |
| 19 | Template browse/filter/import and partial failures | Failed/partial import gates passed; catalog filtering still to exercise |
| 20 | Family invite generation/copy/expiry/reuse | Generate/copy/reuse passed; expired/revoked cases pending |
| 21 | Parent signup via invitation | Verified — real new parent signup and join |
| 22 | Existing family joining and multiple players | Sibling switching passed; existing-player invite case pending |
| 23 | Guardian acknowledgement and profile preferences | Adult acknowledgement/profile wizard passed; upload/privacy cases pending |
| 24 | Invalid/revoked/wrong-account invitations | Malformed/private codes passed; invited-email staff cases pending |
| 25 | Family/player sees correct published plan | Verified — published customized week and rest-day edit |
| 26 | Required activity and session completion | Verified — persisted completion and reports on two local calendars |
| 27 | Shot logging validation and persistence | Challenge shot gates passed; dedicated practice-shot gate pending |
| 28 | Offline completion and reconnect exactly once | Loaded workout syncs exactly once; account-switch/offline recovery pending |
| 29 | Shooting challenge dates and timezone | Verified — custom dates and daylight-saving boundaries |
| 30 | Challenge leaderboard/final result consistency | Closed-window API guards passed; final-results browser fixture pending |
| 31 | Coach roster/progress versus saved player work | Verified — persisted coach/player counts agree |
| 32 | Program edit/unpublish/delete lifecycle | Rest-day edit passed; unpublish/delete lifecycle pending |
| 33 | Quick assignment and schedule changes | Assignment API passed; full Quick Assign UI still to exercise |
| 34 | Team settings and staff roles | Authorization review in progress; staff journeys pending |
| 35 | Player profile edit/cancel/photos | Profile wizard passed; private-photo defect under repair |
| 36 | Parent/shared device player switching | Verified — coach/parent switching and ten repeated phone cases |
| 37 | Goals/badges/history/reflections | Routes passed; award/reflection write cases pending |
| 38 | Solo setup, planning and workout completion | Routes passed; full solo setup/workout lifecycle pending |
| 39 | Solo recurring programs and schedule | Pending |
| 40 | Association setup/team linking/staff boundaries | Pending |
| 41 | Anonymous and unrelated-account data denial | Fresh read denial passed; cached-view isolation repair reproduced and locally verified |
| 42 | Database function/storage permission review | All 75 public tables have RLS; targeted storage/function review in progress |
| 43 | Error/empty/loading states across routes | Five workspace recovery paths and phone route health passed |
| 44 | Notifications/preferences/unsubscribe | Preferences render; persistence/unsubscribe cases pending |
| 45 | AI/integration/payment failure states | Routes render; external integration results unverified |
| 46 | Runtime error/failed request monitoring | Error-capture code reviewed; operational alerting/restore checks pending |
| 47 | Dependency audit/typecheck/lint/build | Verified — full quality check and zero known runtime dependency vulnerabilities |
| 48 | Performance and asset/network review | Pending |
| 49 | Complete regression run and CI | Batch 27: 136 passed, 6 explicit skips; CI passed |
| 50 | Production release verification and fixture cleanup | PRs 26 and 27 live and verified; ongoing repairs and fixture cleanup pending |

## Findings

| Severity | Finding | Repair / verification |
|---|---|---|
| Major | Failed team/player/association reads render empty-workspace setup prompts; failed practice/program reads expose creation flows. | Shared retry state added to five pages. Five authenticated mobile failure-injection/recovery tests passed. |
| Minor | Single-team/player redirects run during React render. | Moved navigation to effects; failed refetches cannot trigger redirect using stale data. |
| Minor | Solo planning treats a missing optional plan as an HTTP 406 error. | Use a nullable single-row read instead of requesting a required row. Route inventory replay pending. |
| Major, investigation | Week publication and practice editing perform separate delete/insert requests, so a failed task write can leave incomplete published work. Existing team replacement also lacks a completed-work guard. | Atomic publication and progress-preservation repair being designed and tested. |

Baseline quality check passed; runtime dependency audit: zero known vulnerabilities. All 75 public tables have RLS enabled. Database shooting release gates passed, including simultaneous-save conflict and daylight-saving boundaries. The leaked-password advisor warning reflects the user’s explicit earlier password preference; no password policy change made. Security-definer warnings require function-level review rather than blanket revocation.

The first phone route inventory covered 43 authenticated routes: no runtime crashes or horizontal overflow; one failed read from the optional solo plan query above. This is route health evidence, not full feature-completion evidence.

## Limits

Browser emulation does not prove physical iPhone/Android behavior or screen-reader usability. Email receipt, external calendar providers, payments and AI output require separate evidence; UI presence is not a passing integration check. Operational readiness (support response, restore drills, legal review) will be reported separately from application tests.

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
