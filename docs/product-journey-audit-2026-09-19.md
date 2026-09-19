# Product Journey Audit and Repair — 2026-09-19

## Executive status

The production journey was audited from public discovery through account creation, team setup, roster management, training assignment, player completion, progress reporting, and invite recovery. Three major correctness failures were reproduced, repaired in separate pull requests, deployed, and re-tested in production. No blocker remains in the exercised journey.

The product is materially safer to use than at the start of the audit: onboarding now schedules future work, the coach dashboard reflects real roster/activity data, and a player cannot receive a false successful completion for unfinished work. The remaining work is concentrated in authentication hardening, database policy/performance hygiene, and smaller accessibility/copy issues.

## Baseline and release identity

| Surface | Baseline / final evidence |
| --- | --- |
| Repository | `JonDMorrison/thehockeyapp`; baseline `5204b90`; audited release `6670edc` |
| Production | `https://www.hockeyapp.ca`; Vercel production deployment `dpl_Hz44E3zQAuMkJRWtDbDwD8fpgQAt`; state `READY` |
| Database | Supabase project `xonpnkzkvqxarbxpinhm`; dashboard contract migration applied remotely as `20260919183607` |
| Runtime | Repository requires Node.js 22 or newer, consistent with the current Supabase runtime direction |
| Billing | Beta mode is active; pricing routes back to the beta experience, so no real-money purchase was in scope |
| Automated baseline | Dependency install reported 0 vulnerabilities. The full repository check passed. The final public production suite passed 5/5. |

## Journey coverage

| Journey area | Conditions exercised | Result |
| --- | --- | --- |
| Public discovery | Home, feature positioning, association contact, legal pages, mobile scrape | Passed; public production suite 5/5 |
| Sign-up | Empty/invalid inputs, terms gate, valid disposable registration | Validation worked; registration currently creates a usable account without email verification |
| Coach onboarding | Empty team name, valid team, age/division selection, template selection | Validation worked; template date defect found and fixed |
| Roster | Empty state, child creation, membership, consent, populated state | Data persisted correctly; smaller form/accessibility issues remain |
| Invitations | Valid token, invalid token, reused token, already-joined recovery | Passed; reuse is idempotent and reports “Already joined” |
| Training plan | Template import, draft dates, quick assignment, published player task | Passed after repair; six new cards were dated Sep 21–26, the upcoming week |
| Player session | Empty/incomplete task state, task completion, session completion | False completion reproduced and fixed; incomplete completion is now disabled |
| Progress/reporting | Coach progress and season report before/after completion | Passed; session, completion rate, active week, and streak reflected the persisted result |
| Billing | Pricing behavior in current beta configuration | Correct beta redirect; live checkout intentionally not exercised |
| Recovery | Invalid/revoked/reused invite states and retry behavior | Clear recovery paths observed; offline write queue reviewed but not force-failed end to end |

## Evidence ledger

Severity uses `blocker`, `major`, `minor`, and `polish` as defined by the audit method.

| ID | Severity | Page / layer | Reproduction and evidence | Expected vs. actual | Consequence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| F-01 | major | Coach onboarding / template picker | On Sat Sep 19, selecting the U13 in-season template said six days were added, but created Sep 14–19 cards | A new plan should start in the upcoming week; it started in the current/past week | A new coach's first plan was stale as soon as it was created | **Fixed and proven in production** by [PR #7](https://github.com/JonDMorrison/thehockeyapp/pull/7); fresh production plan created Sep 21–26 cards |
| F-02 | major | Coach dashboard / RPC contract | After adding a player, Roster, Active, and Complete were blank and the empty-roster warning remained. The client expected `players_count`, `active_today_count`, nested `today.practice_card`, and `upcoming`; the RPC returned legacy names/shapes | Dashboard should reflect persisted roster/activity state; it rendered an incompatible payload | Coaches could not trust their operational dashboard | **Fixed and proven in production** by [PR #8](https://github.com/JonDMorrison/thehockeyapp/pull/8); a fresh one-player team showed Roster 1, Active 0, Complete 0 with no false warning |
| F-03 | major | Player Today / write integrity | Production allowed “Complete session” at 0/1 required tasks and celebrated “0/1 Tasks Done.” Several write paths logged failures and continued as success | Required work and successful persistence should precede success UI; the app permitted false success | Player progress and coach reporting could become misleading | **Fixed and proven in production** by [PR #9](https://github.com/JonDMorrison/thehockeyapp/pull/9); at 0/1 the action is disabled with a clear instruction, and failed writes enter the durable queue |
| F-04 | major | Authentication configuration | A disposable fictional address immediately received a usable session; Supabase email confirmations are disabled | Production identity should have an explicit verification/recovery policy | Mistyped or invented email addresses can own durable accounts and weaken recovery | **Open — owner decision required**; enable verified email or document and mitigate the deliberate no-confirmation model |
| F-05 | major | Authentication security | Final Supabase security advisor reports one `auth_leaked_password_protection` warning | Known-compromised passwords should be rejected | Account takeover risk is unnecessarily higher | **Open**; enable leaked-password protection |
| F-06 | minor | Invite preview RPCs | Six token-scoped `SECURITY DEFINER` preview/unsubscribe functions are executable anonymously. They were reviewed and rely on unguessable tokens; some previews still return limited context for expired/revoked tokens | Stale tokens should disclose the minimum needed for recovery | A holder of an old token may retain limited contextual visibility | **Open hardening**; narrow stale-token fields and document grants |
| F-07 | minor | Supabase/PostgREST operations | 28 “Thread killed by timeout manager” log events in the inspected 24-hour window; 27 occurred during the audit's burst. No matching client HTTP error was observed | Requests should complete without server timeout-manager kills | Possible capacity/query warning; no proven user-facing failure | **Open monitoring item**; correlate recurrence with request/query telemetry |
| F-08 | minor | Database performance | Final advisor: 38 unindexed foreign keys, 191 auth RLS init-plan warnings, 15 unused indexes, 132 multiple-permissive-policy warnings, and one fixed-count auth connection setting | Hot paths and authorization should avoid unnecessary repeated work | Scaling risk and harder policy reasoning | **Open backlog**; prioritize measured hot paths rather than bulk-changing indexes/policies |
| F-09 | minor | Add-child form / validation | The child tab retained the “Invite Parents” modal title; required fields were not visibly marked; a long name surfaced a generic schema message; empty team submit did not move focus to the invalid field | Form purpose, requirements, errors, and focus should be explicit | Slower and less accessible first-hour setup | **Open** |
| F-10 | polish | Template picker | Loose OR-based ranking can place an U11 match ahead of the exact U13 choice | Exact age/division matches should rank first | Extra decision friction during onboarding | **Open** |
| F-11 | polish | Roster / task copy | Singular counts render as “1 players” and “1 tasks” in some views | Counts should pluralize correctly | Visible quality defect | **Open** |
| F-12 | polish | Public metadata / footer | Static and runtime SEO metadata are duplicated; invite pages inherit canonical home metadata; footer copy is still family-first while the lead offer is association-first | Metadata and positioning should be route- and launch-strategy-consistent | Search/social ambiguity and mixed positioning | **Open** |
| F-13 | minor | Client maintainability | Lint passes with 27 warnings, including missing hook dependencies in player, checkoff, and settings paths | State-changing callbacks should have explicit stable dependencies | Future stale-state regressions are easier to introduce | **Open** |

## Repairs and proof

### 1. Upcoming-week template scheduling

- Added one shared start-date helper and deterministic boundary tests.
- Changed onboarding and template import to start on the next Monday rather than the Monday of the current week.
- Added three checks to the required repository verification command.
- Production proof: a fresh Sep 19 onboarding flow created exactly six drafts dated Sep 21–26.

### 2. Coach dashboard contract restoration

- Replaced the legacy dashboard RPC payload with the contract already consumed by the client.
- Added pgTAP contract assertions for count fields, pulse keys, nested today's card, upcoming array, and removal of legacy keys.
- Applied the migration through the managed Supabase migration path after the CLI dry run exposed pre-existing remote/local migration-history drift.
- Production proof: a new one-player team rendered Roster 1, Active Today 0, and Complete 0 without the empty-roster warning.
- Transactional database proof: a disposable fixture exercised the RPC contract in production and was rolled back; follow-up counts were zero.

### 3. Honest player-session completion

- Completion is disabled until every required task is complete and pending task writes have settled.
- The UI explains what remains instead of showing a misleading success state.
- Rejected task, shot, and session writes now fail into the durable offline queue rather than being logged and ignored.
- Expanded required journey checks from 14 to 18.
- Production proof: a fresh required-task session remained at 0/1 with completion disabled and no runtime error.

## Cross-layer verification

| Layer | Evidence |
| --- | --- |
| UI | Real desktop journeys plus mobile/public Firecrawl rendering; empty, invalid, populated, repeated, and recovery states exercised |
| Client | Read-path payload expectations and write-path success/failure behavior inspected; 18 launch-journey checks passed |
| Server/API | Dashboard RPC contract inspected before and after migration; invite preview functions and edge-function JWT settings reviewed |
| Database | Team, player, membership, consent, cards, tasks, completions, and report output checked against the UI; transactional RPC fixture rolled back |
| Authorization | RLS/advisor inventory reviewed; six anonymous token-scoped security-definer functions inspected; remaining warnings recorded above |
| Integrations | GitHub checks/merges, Vercel deployment state/runtime errors, Supabase migration/logs/advisors, and Firecrawl public/mobile output checked |
| Output | Coach dashboard, player progress, season report, invite statuses, and generated schedule were checked for user-visible truthfulness |
| Deployment | All three repair PRs merged; final deployment is `READY`; Vercel reported no runtime errors in the post-release hour; live public suite passed 5/5 |

## Final automated verification

`npm run check` passed on `6670edc`, including:

- brand-color verification;
- 18 launch-journey checks;
- three template start-date checks;
- TypeScript checking;
- lint (0 errors, 27 recorded warnings);
- production build and prerender.

The public Playwright suite was then pointed at `https://www.hockeyapp.ca` and passed 5/5. A local first attempt was invalid because `.env.test` contains no Supabase credentials; it is not counted as product evidence.

## Security and performance snapshot

The post-DDL Supabase security advisor reports 58 warnings and five informational notices:

- 51 authenticated-executable security-definer functions;
- six anonymous-executable security-definer functions;
- one leaked-password-protection warning;
- five RLS-enabled internal tables with no policy (informational and inaccessible through RLS).

The performance advisor reports 323 warnings and 54 informational findings: 191 auth RLS init-plan findings, 132 multiple-permissive-policy findings, 38 unindexed foreign keys, 15 unused indexes, and one fixed-count auth connection setting. These are a prioritized hardening backlog, not regressions caused by the three repairs.

Reference remediation: [Supabase database linter](https://supabase.com/docs/guides/database/database-linter) and [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Cleanup inventory

| Disposable artifact | Cleanup proof |
| --- | --- |
| Audit user identities and sessions | Deleted; final targeted user count 0 |
| Audit teams and memberships | Deleted; final targeted team count 0 |
| Audit players and consent records | Deleted; final targeted player count 0 |
| Audit invites | Deleted; final targeted invite count 0 |
| Audit practice cards, tasks, assignments, shots, and completion records | Deleted with their audit parents; no targeted rows remain |
| Transactional dashboard fixture | Rolled back; fixture counts confirmed 0 |
| Firecrawl browser sessions | Stopped and cleanup queued |
| Local credentials/tokens | Not written to this report or committed |

## Honest completion status

### Fixed and proven in production

- Upcoming-week onboarding schedule.
- Coach dashboard roster/activity contract.
- Required-task and persistence gate for player-session completion.

### Shipped but not fully verified in every environment

- The dashboard pgTAP contract test is committed, but the local Docker daemon was unavailable, so that SQL test suite could not run locally. The same contract was verified transactionally against production with rollback and through the live UI.
- Durable offline fallback is covered by code inspection and required checks, but a forced browser network-drop/reconnect scenario was not executed in production.

### Still open

- Email ownership/recovery policy and leaked-password protection.
- Security-definer grant minimization and expired-token disclosure review.
- Database performance-policy backlog and remote/local migration-history reconciliation.
- The smaller accessibility, copy, ranking, metadata, and hook-dependency findings in the ledger.

### Known limits

- Live billing was not applicable while beta mode redirects away from checkout; no real money was used.
- No message was sent to a real third-party inbox.
- Vercel's deployment build-log connector was unavailable during the audit; GitHub checks, deployment state, production runtime errors, and live browser behavior were used instead.
- Operational log conclusions are bounded to the inspected 24-hour Supabase and post-release Vercel windows.

## Three highest-impact first-hour changes

1. **Start the first plan in the future, not the past** — completed and proven. This removes the earliest “the product is already wrong” moment.
2. **Make the coach dashboard truthful immediately after roster setup** — completed and proven. This preserves trust in the product's central operational view.
3. **Never celebrate unfinished or unpersisted work** — completed and proven. This aligns player feedback, coach reporting, and the database.

The next security release should enable leaked-password protection, resolve the intentional email-verification decision, and then narrow privileged-function grants based on measured call paths.
