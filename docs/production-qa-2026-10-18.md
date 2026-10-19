# Production QA — October 18, 2026

Audit started October 18 at 10:12 p.m. Vancouver time. Authorized work window: five to six hours. Baseline: `54aa054` (program setup release). This is a working evidence log; pending gates are not passing claims.

## Release approach

Exercise real coach, family, player, solo and association journeys using fictional fixtures; inspect anonymous and cross-account access; inject failures; inspect phone layouts and keyboard use. Separate externally dependent checks from verified application behavior. Merge fixes only with appropriate regression coverage. Do not send unsolicited messages to real families or alter real teams.

## QA gates

| # | Area / scenario | Evidence / result |
|---|---|---|
| 1 | Homepage first visit and primary actions | Pending |
| 2 | Demo workout completion and reset | Pending |
| 3 | Demo shooting challenge and signup handoff | Pending |
| 4 | About / features / support / legal navigation | Pending |
| 5 | Small phone layouts and no horizontal overflow | Pending |
| 6 | Keyboard navigation and accessible control names | Pending |
| 7 | Reduced motion and focus visibility | Pending |
| 8 | Signup validation and password visibility | Pending |
| 9 | Signin, signout, return destinations | Pending |
| 10 | Recovery invalid/expired links and request errors | Pending |
| 11 | Session expiry and protected routes | Pending |
| 12 | Account/workspace lookup failure recovery | Pending |
| 13 | Coach team creation and validation | Pending |
| 14 | Program/challenge choice and skipping | Pending |
| 15 | Visual program plans and date selection | Pending |
| 16 | Program draft save, reload and retry | Pending |
| 17 | Activity edit/add/remove/reorder/validation | Pending |
| 18 | Publish, conflicts, duplicates and failure recovery | Pending |
| 19 | Template browse/filter/import and partial failures | Pending |
| 20 | Family invite generation/copy/expiry/reuse | Pending |
| 21 | Parent signup via invitation | Pending |
| 22 | Existing family joining and multiple players | Pending |
| 23 | Guardian acknowledgement and profile preferences | Pending |
| 24 | Invalid/revoked/wrong-account invitations | Pending |
| 25 | Family/player sees correct published plan | Pending |
| 26 | Required activity and session completion | Pending |
| 27 | Shot logging validation and persistence | Pending |
| 28 | Offline completion and reconnect exactly once | Pending |
| 29 | Shooting challenge dates and timezone | Pending |
| 30 | Challenge leaderboard/final result consistency | Pending |
| 31 | Coach roster/progress versus saved player work | Pending |
| 32 | Program edit/unpublish/delete lifecycle | Pending |
| 33 | Quick assignment and schedule changes | Pending |
| 34 | Team settings and staff roles | Pending |
| 35 | Player profile edit/cancel/photos | Pending |
| 36 | Parent/shared device player switching | Pending |
| 37 | Goals/badges/history/reflections | Pending |
| 38 | Solo setup, planning and workout completion | Pending |
| 39 | Solo recurring programs and schedule | Pending |
| 40 | Association setup/team linking/staff boundaries | Pending |
| 41 | Anonymous and unrelated-account data denial | Pending |
| 42 | Database function/storage permission review | Pending |
| 43 | Error/empty/loading states across routes | Pending |
| 44 | Notifications/preferences/unsubscribe | Pending |
| 45 | AI/integration/payment failure states | Pending |
| 46 | Runtime error/failed request monitoring | Pending |
| 47 | Dependency audit/typecheck/lint/build | Pending |
| 48 | Performance and asset/network review | Pending |
| 49 | Complete regression run and CI | Pending |
| 50 | Production release verification and fixture cleanup | Pending |

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
