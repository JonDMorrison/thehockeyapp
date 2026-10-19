# Hockey App production QA report

Audit began October 18 at 10:12 p.m. Vancouver time. Final application and cleanup checkpoint: October 19 at 3:25 a.m. (more than five hours of audit work), followed by report finalization.

The app now has a much stronger core: coaches can set up training before inviting families, families see the correct work, and recorded progress survives retries and edits. Shooting challenges and badge celebrations provide quick, tangible rewards. The largest repairs improve privacy, saved data and recovery from failed requests.

A controlled team pilot is the recommended next step. Custom email delivery and actual password recovery are now verified. Wider rollout still needs real provider feeds, physical-phone checks and a full hosted recovery exercise. The optional AI service can stay off: editable starter plans and factual summaries work without it.

## Main repairs

| Area | Result |
|---|---|
| Family privacy | Closed self-granted guardian access, private-photo access and forged storage-path/record relationships. |
| Saved training | Programs and workouts save together, retries avoid duplicates, and edits preserve started work. |
| Shared devices and offline work | Private state clears between accounts; unsaved team work stays queued for its owner and retries safely. |
| Coach and parent flow | Clear training choice, plan/date customization, invitations, siblings and useful home navigation. |
| Progress and enjoyment | Team goals count the right team and correct downward; completed home practice can earn a badge once. |
| Errors and accessibility | Retry replaces false empty states; phone layouts, control names, focus and dialogs were improved. |
| Calendars | Valid-user authentication, timezone handling, successful imports and preservation after invalid feeds were verified. Private automatic refresh is active every 15 minutes; a scheduled run and HTTP receipt were verified after cleanup. |
| Public pages | About, features, demo and legal pages return their own content before JavaScript loads. |

The privacy reproductions used fictional accounts and children. They establish the repaired authorization behavior; they do not establish whether historical customer access occurred.

## Verification

The detailed engineering log preserves earlier failures and their repairs. Browser results are separate runs with overlapping coverage; they must not be added together as unique scenarios.

- Public browser matrix: 150 passed across Chromium, WebKit and Firefox.
- Authenticated browser matrix: 81 passed across the same three engines.
- Later affected-flow checkpoint: 27 passed, followed by all 15 explicitly enabled fixture-dependent cases passing.
- Home navigation, starter program and badge checkpoint: 12 passed across three browsers.
- Calendar checkpoint: six phone cases completed a controlled HTTPS fixture through the live service/database; 58 service/helper scenarios and private SQL dispatch checks passed.
- Final broad sweep: 512 passed, 26 skipped and two test-harness failures across 540 cases (39.7 minutes). Both failures were unsupported clipboard-permission requests in WebKit/Firefox. After correcting the harness, all 12 production replays passed across three engines: fresh coach/family challenge creation, privilege denials and real calendar imports. Final badge preference/recovery tests also passed in all three engines.

The 26 skips included prepared ended-challenge, calendar, welcome and rest-day opt-ins plus 11 legacy conditional cases. Independent isolated-fixture runs covered those behaviors; skips were not counted as passes.

Browser emulation covered 320px and 390px phones and desktop widths. It does not establish physical-device or screen-reader usability.

## Fifty release gates

Updated ledger after the launch-blocker follow-up: **45 verified gates, five partial gates, none pending.** Verified means the stated scenario has recorded passing evidence. Partial means the checked behavior works but a material release condition remains. The engineering log links each repair and test batch.

| # | Scenario | Status | Evidence or remaining condition |
|---|---|---|---|
| 1 | Homepage and first actions | Verified | Desktop and phone public journeys. |
| 2 | Demo workout and reset | Verified | Interactive completion, reset and keyboard checks. |
| 3 | Demo shooting challenge and signup | Verified | Real coach setup, invite and saved family shots. |
| 4 | Public pages and navigation | Verified | Links, route content, legal documents and HTML before JavaScript. |
| 5 | Small phone layout | Verified | 320px route inventory in Chromium, WebKit and Firefox. |
| 6 | Keyboard and named controls | Verified | Native team/player/program links, workout controls, dialogs and calendar controls. |
| 7 | Motion and assistive technology | Partial | Reduced-motion and focus checks passed in emulation. Physical phones and screen-reader confirmation remain. |
| 8 | Signup and password entry | Verified | Validation, six-character password and Show Password. |
| 9 | Signin and account switching | Verified | Valid/invalid login, signout, return destinations and private cache isolation. |
| 10 | Password recovery | Verified | Actual inbox email opened in a fresh 320px browser; disposable password changed, old password rejected, new UI login accepted. Invalid/expired/reused links passed across three engines. |
| 11 | Expired sessions and protected routes | Verified | Rejected refresh returns to signin and prevents cached private views. |
| 12 | Workspace lookup recovery | Verified | Failed reads expose retry instead of new-account prompts. |
| 13 | Create a coach team | Verified | Real signup and validated team creation. |
| 14 | Choose or defer training | Verified | Program/challenge choice, explicit defer path, then invitations. |
| 15 | Choose a plan and dates | Verified | Visual plans, custom dates and calendar boundaries. |
| 16 | Save a draft and reload | Verified | Persisted drafts, retry and complete database saves. |
| 17 | Customize activities | Verified | Add, edit, remove, reorder and validate activities. |
| 18 | Publish and retry safely | Verified | Complete publication, duplicate prevention and started-work protection. |
| 19 | Templates | Verified | Catalog ranking, import, partial failure and failed-read retry. |
| 20 | Family invitation lifecycle | Verified | Generate, copy, reuse, expiry and revocation. |
| 21 | New family signup | Verified | New parent joins through the private invitation. |
| 22 | Existing family and siblings | Verified | Existing players join; two children and active-player switching. |
| 23 | Guardian consent and preferences | Verified | Adult acknowledgement, photo permission and optional AI consent. |
| 24 | Wrong account and staff invitations | Verified | Email-bound staff/guardian redemption and unrelated-account denial. |
| 25 | Correct published plan for families | Verified | Customized week, date and rest-day changes. |
| 26 | Activity and session completion | Verified | Saved completion agrees with the coach report. |
| 27 | Shot logging | Verified | Whole-number validation, zero correction, persistence and challenge limits. |
| 28 | Offline team workouts | Verified | Loaded team work survives outages/reload and synchronizes once for its own account. |
| 29 | Challenge dates and timezones | Verified | Custom windows, server guards and daylight-saving cases. |
| 30 | Leaderboard and final results | Verified | Zero-shot roster members, corrections and closed-window results. |
| 31 | Coach roster and progress | Verified | Saved player work agrees with displayed team totals. |
| 32 | Program edits and rest days | Verified | Unstarted work can be replaced; recorded work remains protected. |
| 33 | Quick assignment and calendar failure | Verified | Keyboard assignment, successful controlled calendar import and preservation on failed imports. |
| 34 | Team settings and staff roles | Verified | Owned settings and email-bound role access. |
| 35 | Player profile and private photos | Verified | Edit/cancel, upload/reload, private image access and failed-write cleanup. |
| 36 | Shared devices | Verified | Family/coach switching clears private views, media and pending work from the next account. |
| 37 | Goals, badges, history and summaries | Verified | Team-only goals/corrections, opted-in home badge awards, retained family history and factual summaries. |
| 38 | Home workout lifecycle | Verified | Create, complete, undo and protect recorded work. |
| 39 | Home program schedule | Verified | A real month of private scheduled workouts saves and reloads. |
| 40 | Association roles | Verified | Create, link a team, invite a reporting viewer and deny child access. |
| 41 | Unrelated and anonymous access | Verified | Fresh reads, shared caches, forged training records and private image signing. |
| 42 | Database and storage review | Partial | Database access rules and targeted function/storage permissions checked with negative tests. Formal penetration testing is outside this audit. |
| 43 | Loading, empty and error states | Verified | Route inventory plus deliberate read/write/network failures and retry. |
| 44 | Email preferences and unsubscribe | Verified | Authenticated sending domain, actual welcome/invitation/coach and family recap receipt, duplicate suppression, actual received unsubscribe link, explicit opt-in/failure persistence and private scheduled HTTP200 dispatch verified. |
| 45 | Optional providers | Partial | Starter plans, factual summaries and consent gates work. Real AI output and private calendar-provider feeds require activation/validation. Payments are disabled in the free app. |
| 46 | Operational recovery and alerts | Partial | Actual urgent alert reached the monitored inbox. Five core production tables restored into an isolated local database with exact row-content matches. Eight daily physical backups present; full hosted Auth/storage/physical restore still needs a separate exercise. |
| 47 | Build and dependencies | Verified | Typecheck, lint, build, database release gates and runtime dependency audit. |
| 48 | Performance | Partial | Constrained mobile lab measurements completed; field performance and further image-weight tuning remain. |
| 49 | Regression and CI | Verified | 512 broad-sweep passes; two harness failures repaired and production replays passed. Required CI checks passed for merged changes. |
| 50 | Live release and cleanup | Verified | Final app release deployed and replayed; fixtures removed; scheduled refresh returned HTTP200 and resumed its 15-minute cadence. |

## Performance measurements

Three cold production runs per page used Chromium at 390px, fourfold CPU slowdown, 150ms latency and a 1.6Mbps download connection. These are laboratory observations during the audit.

| Page | Median largest content paint | Largest observed layout shift |
|---|---|---|
| Home | 2.83 seconds | 0.015 |
| About | 2.99 seconds | 0.015 |
| Demo | 3.00 seconds | 0.015 |
| Signup | 1.42 seconds | 0.015 |

Large marketing images remain the clearest speed-tuning candidate. These measurements are not field Core Web Vitals or a Lighthouse score.

## Remaining launch conditions

1. Validate a real private team calendar feed, including its recurrence and timezone conventions. The controlled HTTPS fixture verifies the app import path, not every provider format.
2. Check the critical flow on physical iPhone and Android devices, including the keyboard, date picker, sharing and screen reader.
3. Complete a full hosted backup restoration including Auth and storage. Jon’s monitored address is configured for replies and launch alerts. The targeted five-table logical restore is complete.

Actual AI output is optional. Payment testing is not applicable to the current community-free release. The six-character password policy and visibility controls preserve the requested behavior.

## Release evidence

See [the engineering QA log](production-qa-2026-10-18.md) for individual pull requests, migration checks, production replays and failures corrected during the audit. See [calendar operations](calendar-sync-operations.md) for the private refresh configuration and controls.

Final application release: [PR48](https://github.com/JonDMorrison/thehockeyapp/pull/48), commit `f62197db1284e706d758aa1e46d33591dd73ec86`, verified READY on production. Its final live 320px badge/recovery case passed in 39.6 seconds. Audit application repairs span merged PR26–48.

Cleanup removed 379 fictional login accounts, 607 fictional teams, 801 fictional players, 564 practice cards, 28 fictional associations and three uploaded test objects, with dependent test records removed together. Verification found zero scoped accounts/teams/players remaining. All pre-audit users (seven), teams (14) and players (14), including the protected original QA fixtures, remain.

The private calendar scheduler ran at 10:25 UTC with a successful SQL job and HTTP200 response (`success: true`, zero remaining sources, zero failures). This proves scheduler authorization and dispatch; the separate controlled-feed browser cases prove actual imports. The normal 15-minute schedule is active. Custom email schedules were not enabled without a working provider, and no real family emails were sent.


## October 19 launch-blocker follow-up

[PR50](https://github.com/JonDMorrison/thehockeyapp/pull/50) fixes real application email delivery and fresh-browser recovery. GoDaddy records now authenticate the sending domain; SMTP and application delivery are live. Welcome, family invitation, recovery and urgent alert emails reached the controlled mailbox with SPF/DKIM/DMARC passing. The received invitation created the expected saved family membership. The received reset link changed only a disposable account, rejected its old password and accepted the new password in the actual sign-in UI. Replies and launch alerts go to `jon@getclear.ca`.

[PR51](https://github.com/JonDMorrison/thehockeyapp/pull/51) hosts the existing fonts locally. Twenty-four font/loading/layout cases passed across three browser engines. Repeated constrained mobile production measurements (390px, 4× CPU, 150ms latency, 1.6Mbps download, three cold runs) returned median LCP: home 2.84s, about 2.98s, demo 2.98s, signup 1.62s; maximum observed CLS respectively .015, .045, .083, .011. The same-condition before/after differences were small and mixed; this change removes external font requests rather than proving a speed increase. Field Core Web Vitals and image-weight tuning remain open.

[PR52](https://github.com/JonDMorrison/thehockeyapp/pull/52) replaces unsafe weekly jobs with explicit opt-in, closed-week metrics, team scoping, primary-owner consent, private pagination, bounded retries and stable weekly duplicate protection. Six mobile preference-save/retry/persistence cases passed across three engines, 26 mocked service cases passed, and scoped production SQL fixtures rolled back cleanly. Actual coach and family recaps reached the inbox; the actual family unsubscribe link suppressed subsequent delivery. A scheduled SQL run and its HTTP200 responses proved private dispatch. Normal Monday delivery/Tuesday retry schedules are active; optional marketing stays off. Existing default-true preference rows without a confirmation timestamp receive no recaps.

The restore drill matched all rows in five core tables: 14 players, 14 teams, 45 practice cards, 33 practice tasks and 12 task completions. This is useful recovery evidence, not a full production restoration or formal penetration test. No customer password was changed and no customer families received test email.


[PR53](https://github.com/JonDMorrison/thehockeyapp/pull/53) adds coach banner customization with two AI-created hockey backgrounds, private uploads, saved horizontal/vertical focus, desktop hover/keyboard access and a visible mobile action. Six real-backend mobile/desktop cases passed across Chromium, WebKit and Firefox; an additional failed-upload check confirmed the new file is removed when the database save fails. Visual inspection caught and corrected a narrow-screen dialog overflow and the account control overlapping dialogs.

Final follow-up release checks: 174 public browser cases passed across three engines; shooting and program database release gates passed; runtime dependency audit found zero vulnerabilities; normal type/lint/build/content checks passed. GitHub reported an Actions/Pages incident with degraded Actions performance and its hosted jobs remained queued. Normal merges used the tested commit identifiers; no required-check or administrator bypass was used. Local evidence is recorded separately from hosted CI status.


The final live banner review exposed a date-only parsing bug: `2026-10-19` displayed as Sunday October 18 in Vancouver. The header now parses a local calendar date without converting midnight UTC into the prior day. Nine browser cases passed across Vancouver, Honolulu and Auckland in all three engines. The banner application release is commit `533464462063b4c83e2876dbba2295b5ffcf9b7c`, verified READY in production; its email-preference, banner and font production replay is recorded separately below.
