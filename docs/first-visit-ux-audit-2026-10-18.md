# Hockey App: first-time parent and coach audit

Date: October 18, 2026 (America/Vancouver)

## Verdict

This is a useful product with the right core loop: a coach assigns something clear, a child does it, and the adults see the effort. The existing assignment, template, progress, family-account, privacy, and reward features are a strong foundation. The app's problem was less a missing feature list than how long it took a new visitor to understand and experience that loop.

Before this pass, I would have hesitated to invite a busy parent: the homepage led with association language, there was no obvious parent starting point, and the product tour mostly showed illustrations. A preview even instructed visitors to tap a control that did nothing. The interface looked more complete than its first-use experience felt.

The revised entry experience is much stronger: parents can join with a code or start for their child, coaches enter the correct signup flow, and anyone can finish a small sample session before creating an account. The sample shows the same state to a player, parent, and coach. The real persisted journey is tested separately; a working demo is not being used as proof that the backend works.

| Question | Assessment |
| --- | --- |
| Is it a great tool? | A strong practical tool for a narrow job: organizing off-ice training and making effort visible. Calling it loved by families requires observing families using it. |
| Simple but capable? | The core is appropriately simple; templates, longer programs, progress, and multiple roles provide depth. The former marketing journey made that breadth feel complicated. |
| Quick value? | The sample now gives value before signup. The coach journey starts with one shooting assignment rather than demanding a full program. There is no measured first-time-user setup-time claim. |
| Does it work? | A dedicated fictional account exercises publication → required task → saved session → reload → coach reporting. Additional checks cover access denial and failure recovery. See final evidence below. |
| Is it fun? | Check-offs, immediate progress, and a friendly completion reward give the sample a satisfying finish. Existing player badges and celebration support that direction. Enjoyment by children has not been measured. |
| Would I use it? | Yes, for a small team trial with a coach willing to assign a manageable routine and a few parents willing to give feedback. |

## Scope and method

Inspected the production homepage and tour in a browser, reviewed the current application and previous audits, tested local changes at 390px and 1280px, and exercised the production backend through the normal authenticated client using fictional test data. No real player's records were edited. No schema or permission changes were needed. The recently merged community-free changes were preserved.

The 50 milestones below define this bounded release pass. They do not imply that all integrations, AI outputs, devices, or long-term user satisfaction have been validated.

Evidence shorthand:

- **Public**: `e2e/10-public-launch.spec.ts`, `e2e/12-first-visit.spec.ts`.
- **Recovery**: `e2e/14-recovery-and-accessibility.spec.ts`.
- **Persisted**: `e2e/13-journey-integrity.spec.ts`, against the real backend with a dedicated fictional account; template failure is explicitly simulated.
- **Check**: required repository checks, genuine application and tooling typechecks, lint, build, static homepage/private metadata verification.
- **Review**: inspected implementation and compared it with the relevant data/API contract; this is not a substitute for a browser assertion.

## The 50 milestones

| # | Milestone and acceptance criterion | Evidence | Status |
| --- | --- | --- | --- |
| 01 | Homepage explains what a parent can do, in the first section. | Public; homepage review | Done |
| 02 | Primary coach action enters coach signup directly. | Public; Recovery | Done |
| 03 | Families can find a team-code entry from the homepage and navigation. | Public | Done |
| 04 | “Start for my child” opens a family account flow with the solo setup intent preserved. | Public; Review | Done |
| 05 | A visitor can try a sample without creating an account. | Public | Done |
| 06 | Community-free positioning replaces temporary-trial messaging in the entry journey. | Check; Review | Done |
| 07 | Tour answers what the app costs. | Tour FAQ review | Done |
| 08 | Tour answers whether a child needs an email or a separate device. | Tour FAQ review | Done |
| 09 | Tour explains private teams and authorized adult access. | FAQ review; Persisted access test | Done |
| 10 | Founder story remains available; the team motivation section becomes a visual, scannable story. | About browser checks; desktop/mobile image review | Done |
| 11 | Product tour puts a working experience before more marketing content. | Public; visual review | Done |
| 12 | Sample uses three understandable drills with targets and an equipment/time estimate. | Public; Review | Done |
| 13 | Sample cannot finish until required exercises are checked. | Public | Done |
| 14 | Sample check-offs can be undone before finishing. | Public | Done |
| 15 | Sample percentage and completed count agree. | Public | Done |
| 16 | Drill instructions expand on demand. | Recovery | Done |
| 17 | Finishing the sample produces a clear, friendly reward. | Public | Done |
| 18 | Coach perspective reflects the same sample progress. | Public | Done |
| 19 | Parent perspective reflects the same sample progress. | Public | Done |
| 20 | Sample is clearly labeled, resets honestly, and performs no backend writes. | Public; Recovery | Done |
| 21 | Empty team code cannot submit. | Public | Done |
| 22 | Short codes tolerate surrounding spaces and normalize case. | Public | Done |
| 23 | Full invitation links preserve token case and discard query strings. | Public | Done |
| 24 | Malformed URL escapes do not crash the join form. | Public | Done |
| 25 | Switching signin/signup preserves the team invitation destination. | Public | Done |
| 26 | Signup submits trimmed email/name while preserving the password exactly. | Recovery; intercepted submission | Done |
| 27 | Password recovery exchanges the PKCE code; unusable links explain recovery. | Recovery; Review | Done |
| 28 | Welcome loads independent workspace lookups in parallel. | Review | Done |
| 29 | A failed workspace lookup cannot masquerade as a new account. | Persisted; simulated outage | Done |
| 30 | The workspace error state has a working retry action. | Persisted; outage removed before retry | Done |
| 31 | Coach assignment creates a published workout through the normal authenticated API. | Persisted | Done |
| 32 | Real session completion is disabled while required work remains. | Persisted | Done |
| 33 | Real keyboard task completion writes the expected data. | Persisted | Done |
| 34 | Completed work survives a reload and has a saved session record. | Persisted | Done |
| 35 | Coach roster, active, and complete counts reflect the persisted work. | Persisted | Done |
| 36 | Anonymous access cannot read the test player, team, or workout. | Persisted | Done |
| 37 | A loaded workout can be completed offline and syncs exactly once on reconnection. | Persisted | Done |
| 38 | Solo planner uses the real `date` field instead of nonexistent `scheduled_date`. | Schema inspection; Persisted | Done |
| 39 | Canceling a profile edit retains its position field in both reset paths. | Genuine typecheck; Review | Done |
| 40 | Failed template task writes never count as successful imported workouts. | Persisted; simulated task failure and cleanup check | Done |
| 41 | Main public pages fit desktop and phone widths without runtime exceptions. | Public; seven routes at two widths | Done |
| 42 | Role picker remains usable on both 568px- and 844px-high phones. | Recovery | Done |
| 43 | Homepage role tabs support arrows, Home/End, focus, and panel labeling. | Public | Done |
| 44 | Active desktop navigation exposes its current-page state; auth navigation closes the phone menu. | Review | Done |
| 45 | Route animation respects the visitor's reduced-motion preference. | MotionConfig and existing CSS review | Done |
| 46 | Public metadata matches team/family positioning; private routes remain nonindexable. | Check | Done |
| 47 | Typecheck genuinely checks the application and tooling, with the ten discovered errors repaired. | Check | Done |
| 48 | Public first-visit and recovery checks become a persistent CI gate. | CI configuration; release checks | Verification pending |
| 49 | Final required checks and authenticated browser suite have reviewed results. | Final verification below | Done |
| 50 | Changes are reviewed, merged, and checked on the production release. | Release record below | Verification pending |

## Findings and repairs

| Severity | Finding | Repair |
| --- | --- | --- |
| Major | Product tour promised interaction but mostly supplied static illustrations. | Added a working sample at the beginning; removed the long duplicated tour; labeled remaining preview art. |
| Major | Parent starting path was buried behind association/coach framing. | Added explicit team-code and child-training actions; family-specific signup heading; coach-first role preview and picker. |
| Major | Typecheck passed while checking no application files. | Check both actual TypeScript projects; fix all ten exposed errors. |
| Major | Solo planner queried a nonexistent database date column. | Match the inspected production schema and generated types. |
| Major | Welcome ignored lookup errors and could present new-account setup after a failed request. | Parallel lookups, surfaced errors, and a retry state that preserves the user's workspace. |
| Major | Template import could count a card even when its exercise writes failed. | Remove the incomplete new draft when possible, count failed days, reject zero imports, and explicitly report partial imports. |
| Major | Reset flow disabled automatic URL detection without exchanging its reset code. | Exchange PKCE code before password update; explain invalid/expired links. Successful email delivery itself is not tested. |
| Major | Shared-workout CTA supplied an unused return state pointing to a missing claim route. | Use a real signup/setup destination and explicitly describe it as starting a separate routine. Exact workout/program cloning is not implemented. |
| Minor | Referral links truncated random UUID tokens. | Generate the full UUID for new invites. Existing links are unchanged. |
| Minor | Role dialog extended beyond small phone screens. | Bound it to the viewport and allow vertical scrolling; test both phone heights. |
| Minor | Malformed percent escapes in pasted invites could throw during typing. | Use a safe normalizer, preserve link tokens, and disable malformed submissions. |
| Minor | Validated normalized auth values were not the values actually submitted. | Submit trimmed email and display name; preserve passwords unchanged. |
| Minor | Profile cancel paths dropped position state. | Reset all profile fields consistently. |
| Minor | Role tabs lacked keyboard navigation and panel ownership. | Add roving focus, arrow/Home/End behavior, and panel labeling. |
| Minor | Older database browser checks required an unsupplied token and team ID. | Reuse global setup's dedicated session and configured test-team fixture; remove a hardcoded unused user ID. |

## About section redesign

The requested “Why we built it for teams” section now uses a large two-tone headline (“Practice ends. Progress shouldn’t.”), a team photograph, and three concise coach/player/family benefits. A direct sample-workout link connects the story to an experience visitors can try. The layout uses two columns on desktop and stacks cleanly on a phone. Existing founder details are preserved.

## Backend health

The current security advisor reports six anonymous and 51 authenticated SECURITY DEFINER function warnings, plus five informational internal tables with RLS and no policy. The anonymous functions provide token-bound preview/unsubscribe operations; broad grant changes were not justified by these findings alone. The live anonymous fixture test denies player/team/workout reads and dashboard access.

The performance advisor currently reports 36 informational unused-index notices and one informational absolute auth-connection setting. The previous audit's hundreds of policy/index warnings and leaked-password warning are absent from this current report. This is a snapshot, not a comprehensive authorization proof. Reference: [Supabase database linter](https://supabase.com/docs/guides/database/database-linter).

## Remaining product questions

- **Real adoption:** Observe five parents and two volunteer coaches completing first setup without hints. Measure time to first assignment, invitation acceptance, first saved workout, and week-two return. This audit does not prove that parents or children love the app.
- **Shared-workout cloning:** The repaired referral flow is an honest preview → own-routine flow. If one-tap copying is desired, it needs an authorized atomic import, not another link change.
- **Email delivery and integrations:** Actual welcome/reset/invite email receipt, TeamSnap synchronization, AI output quality, notification delivery, and payment-provider behavior were not exercised as live external transactions.
- **Offline limits:** Test the loaded-session offline path separately from a cold start on an uncached device. Do not imply that every route works without a connection.
- **Devices and accessibility:** Desktop Chromium and phone-sized Chromium are covered. Real iOS Safari, Android devices, screen-reader use, and a full contrast audit remain useful follow-ups.
- **Maintainability:** The inherited lint warnings are recorded rather than hidden. A broad dependency/policy rewrite would expand this release beyond the observed UX repairs.

## Final verification

Local final verification:

- Required repository check passed, including the actual application/tooling typechecks, 60 source-level journey guards, date/ranking checks, lint (0 errors; 27 inherited warnings), build, and crawler metadata validation.
- Public first visits and recovery: **38 passed**, including the revised About section at phone and desktop widths.
- Real persisted/failure-injection journey suite: **6 passed**, including offline reconnection and failed template cleanup.
- Mobile shared account and player profile wizard: **2 passed**.
- Legacy coach/player/parent/database rechecks: **31 passed, 3 skipped**. Skipped cases lack an unfinished task/shooting task or a complete-session action in the selected fixture; they are not counted as passing coverage. The new dedicated persisted suite independently verifies required task and session completion.
- The initial 91-case broad run exposed ten failures: ambiguous older selectors, missing older database-test configuration, and an unselected required player-position field in the phone test. Those failures were repaired and rechecked in the groups above. This is not a claim that a subsequent single 104-case run passed.

CI and production release checks remain the final gates.

## Release record

Pending commit, pull request, merge, and production confirmation.
