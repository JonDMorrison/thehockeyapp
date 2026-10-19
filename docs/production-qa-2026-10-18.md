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
