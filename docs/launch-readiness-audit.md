# The Hockey App — Association Launch Readiness Audit

**Audit date:** September 12, 2026

**Repository:** [JonDMorrison/thehockeyapp](https://github.com/JonDMorrison/thehockeyapp)

**Production site reviewed:** [hockeyapp.ca](https://www.hockeyapp.ca/)

**Primary competitor:** [How To Hockey — 10,000 Shots](https://howtohockey.com/10000-shots/)

## Executive decision

The product is now a **production release candidate for a controlled, founder-supported association pilot**. The software supports an association hierarchy, least-privilege staff roles, team provisioning, private invite redemption, aggregate cross-team reporting, child-consent records, private media, email preferences, unsubscribe, and an audit trail. The recommended first rollout is still 3–5 teams—not every team on day one—so operations, support, and real-world onboarding can be proven before expanding.

The underlying product is stronger than the original presentation suggested. It already covers coach-created plans, team and solo workflows, schedule-aware training, offline check-offs after a plan is loaded, parent/guardian roles, shot tracking, challenges, progress reporting, and a season report. The best market position is not “another shot counter.” It is **the structured development system that connects coaches, players, and families between ice times**.

The most important risks were not visual. They were authorization, child-data handling, deployment drift, unreliable account recovery, misleading privacy/offline claims, public invite enumeration, and the absence of an association administration layer. This release closes the identified code-level gaps. Remaining risk is operational: production verification, legal review, staff training, support ownership, and a tested data-recovery procedure.

### Readiness scorecard

| Area | Before this pass | After local fixes | Launch assessment |
|---|---:|---:|---|
| Core player/coach product | 7/10 | 8/10 | Strong enough for a guided multi-team pilot |
| Visual design and positioning | 4/10 | 9/10 | Cohesive dark performance system and association-specific story |
| Authentication and recovery | 4/10 | 8/10 | Reset, confirmation, and invite return paths repaired |
| Application/database security | 3/10 | 8/10 | Explicit grants, RLS, private invites, atomic mutations, and security tests |
| Child privacy and legal readiness | 3/10 | 7/10 | Consent/media controls added; counsel and association paperwork remain |
| Reliability and operations | 4/10 | 7/10 | Redacted client-error capture added; external alerting/runbooks remain |
| Testing and release process | 3/10 | 8/10 | CI, type/build gates, database permission tests, and public browser tests |
| Association administration | 2/10 | 8/10 | Hierarchy, roles, team linking/provisioning, invites, audit, aggregate dashboard |

## What was fixed in this branch

### Product and authentication

- Implemented a real password-recovery completion flow instead of redirecting recovery users away before they could choose a new password.
- Split sign-in and sign-up password validation so older valid accounts are not locked out by a newer sign-up rule.
- Added password confirmation for registration/reset.
- Fixed registration behavior when email confirmation is required; the UI no longer pretends the user is signed in.
- Added Terms and Privacy acceptance during registration.
- Added an adult-account acknowledgement when creating a player profile.
- Added a working Contact / support / privacy-request form and exposed it in navigation and the sitemap.

### Security and privacy

- Added an explicit database function allowlist. PostgreSQL previously granted execution to `PUBLIC`, making security-definer admin, notification, entitlement, and mutation helpers callable by anonymous or ordinary authenticated clients.
- Removed the policy that allowed every authenticated user to read every support submission, including names, emails, and messages.
- Added constrained contact-form validation and an internal admin event for new support submissions.
- Reworked schedule synchronization to authenticate the caller, check team/player ownership, limit it to safe public HTTPS calendar URLs, block private/local destinations, disable redirects, set time/size limits, and stop logging calendar URLs/content.
- Removed raw AI prompts/results and user identifiers from sensitive server logs.
- Restricted internal bulk email, notification, summary, and adoption jobs to service credentials.
- Restricted browser-triggered transactional email types to the correct signed-in user or team staff member.
- Added authorization for team-plan purchases and removed caller-controlled payment return URLs.
- Escaped event data inserted into admin emails.
- Replaced hard-coded personal admin addresses with a required deployment secret.
- Tightened private session-photo access, capped image size/type, and changed the UI from broken public URLs to expiring signed URLs.
- Rewrote privacy language to remove unsupported “COPPA compliant” and “regular security audits” claims.
- Added training-safety language to the Terms.
- Removed anonymous/authenticated direct reads of guardian, team-staff, and solo referral invitations; public previews now return only the minimum display fields.
- Bound adult and guardian invitation redemption to the invited email address and made team/player creation transactional.
- Added explicit guardian relationship acknowledgement and versioned consent records.
- Split private player/profile/team photos into private buckets with time-limited signed delivery while keeping team branding public.
- Added per-user email preferences, one-click unsubscribe tokens, and suppression checks in scheduled email jobs.
- Added redacted client-error capture without shipping player data or free-form form contents.

### Design, marketing, accessibility, and performance

- Applied the preferred dark performance direction: black/navy rink-side surfaces, decisive red actions, ice-blue data accents, condensed athletic headings, tighter cards, and a dark bottom navigation with a red active marker.
- Protected marketing brand colors from being overwritten by a previously selected team palette.
- Reframed the homepage around the between-practice development problem and a staged association rollout.
- Added a “more than a shot counter” feature block and clearer team-dashboard/progress proof.
- Extended the dark system to the Features, Demo, About, Privacy, Terms, and Contact pages.
- Added accessible labels/state to the mobile navigation and reduced-motion behavior.
- Replaced two approximately 2 MB marketing images with 87–117 KB WebP versions.
- Updated crawlable static homepage copy and added Contact to prerendering/sitemap.
- Removed the hidden beta Pricing page from the static navigation and sitemap.
- Added an Association HQ marketing section and product dashboard aligned to the actual permission model: association leaders see rollout/adoption aggregates, not a cross-team child leaderboard.
- Rebuilt the public team-join experience around a private coach-provided code or link, with no searchable team directory.

### Engineering quality

- Upgraded vulnerable dependencies, removed unused vulnerable prerender packages, and reached **0 known npm vulnerabilities**.
- Lazy-loaded route screens and upgraded the build tool; the current shared entry bundle is roughly **520 KB / 148 KB gzip**, with route chunks loaded on demand. This is acceptable for the pilot but should receive a measured performance budget.
- Added typecheck and full quality scripts and a normal GitHub pull-request/main-branch CI workflow.
- Repaired lint errors; remaining messages are non-blocking Fast Refresh and stale-dependency warnings that should be burned down.
- Rebuilt the end-to-end login setup so a public homepage can no longer be mistaken for an authenticated session.
- Added an example configuration for a dedicated test account.
- Removed the tracked runtime `.env` from future source control while preserving the local copy, and added a safe `.env.example`. It contained only the public Supabase project URL/ID and publishable key, not the service-role secret.
- Added 21 database permission/transaction tests and four public launch browser tests covering association positioning, private joining, registration acknowledgement, and legal routes.

### Association operations

- Added associations above teams with owner, admin, director, and reporting roles.
- Added atomic team provisioning with automatic owner assignment, plus safe linking/unlinking of existing teams.
- Added email-bound association invitations with expiry, revocation, redemption, and audit history.
- Added a privacy-safe association dashboard for team count, roster activation, live-plan coverage, completed sessions, and shot totals.
- Kept individual player details inside existing team/family permissions; association roles receive aggregates only.
- Added Association HQ entry points from Teams and Settings so the capability is discoverable after login.

## Remaining release gates

The software gates are implemented and tested locally. These operational gates must be owned during the pilot:

1. **Run real-role acceptance testing.** Use dedicated coach, assistant/manager, guardian, adult-player, association director, reporting-only, and unauthorized accounts. Exercise password recovery, every invite type, player/team creation, plan publication, offline sync, media sharing, report export, schedule sync, consent withdrawal, email opt-out, and privacy deletion/export.
2. **Finish legal/association paperwork.** Publish the operator’s full legal identity/contact details, privacy officer, retention/deletion schedule, subprocessors/processing locations, incident process, association data-processing agreement, acceptable-use rules, and governing law. Have Canadian/US youth-privacy counsel review it. Starting points: [FTC COPPA rule](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa), [FTC COPPA compliance plan](https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business), and [BC OIPC private-sector privacy guidance](https://www.oipc.bc.ca/about/legislation/).
3. **Make support operational.** Verify the `hockeyapp.ca` sending domain, set and test the admin/support destinations, name a support owner, publish response targets, and rehearse privacy/deletion and incident runbooks.
4. **Prove recovery and alerts.** Add an independent uptime monitor/alert owner and complete a documented database restore exercise. Client errors are now captured in-app, but somebody must routinely review them.
5. **Keep recurring marketing email disabled until reviewed.** Preference and unsubscribe controls are implemented, but production schedules, consent language, sender identity, and records should be reviewed against [CRTC CASL guidance](https://crtc.gc.ca/eng/com500/guide.htm) before activation. Service-critical invitation/account messages remain separate.

## Important next work (P1)

- Add CSV roster import, season rollover, bulk coach handoff, team archival, and richer association audit filters.
- Add server-side rate limits and abuse protection for AI generation, public contact, invitation, and schedule-sync endpoints.
- Replace broad `Access-Control-Allow-Origin: *` headers on browser-facing functions with the production/staging origin allowlist.
- Add an installable PWA/service worker. The current offline system works after today’s plan has loaded in an already-open app, but it is not a complete offline-first install/reload experience.
- Add user-visible deletion/export controls and administrator tooling for verified privacy requests.
- Add a documented data model for seasons, retired teams, inactive players, and record ownership after staff leave.
- Expand automated tests around offline conflict resolution, calendar DST/time zones, report totals, billing webhook idempotency, and seeded end-to-end role journeys.
- Burn down React hook dependency warnings, particularly offline queue callbacks and invite redemption.
- Add accessible form-error summaries, automated axe checks, keyboard testing, and screen-reader checks across all role flows.
- Add an association consent-status view that shows whether required guardian approvals exist without exposing the underlying child profile.
- Measure Core Web Vitals with real pilot traffic and set page-level performance budgets.

## Competitor analysis: 10,000 Shots

The original 10,000 Shots proposition is easy to understand: log a large goal, break it down by shot type, learn from embedded lessons, and compete with teammates. Its design is visually coherent because nearly every screen supports the same loop: **shoot → log → see progress → return**. The current app-store listings also show an active product with team/challenge features and paid tiers: [Google Play](https://play.google.com/store/apps/details?id=com.howtohockey.tenthousandshotchallenge) and [Apple App Store](https://apps.apple.com/us/app/10-000-shots/id1569692675).

| Dimension | 10,000 Shots | The Hockey App | Strategic response |
|---|---|---|---|
| Primary promise | Improve shooting through 10,000 tracked shots | Build consistent off-ice development across multiple skills | Keep the broader promise, but make the daily action as obvious as logging shots |
| Brand advantage | How To Hockey audience and instructional credibility | Founder/coach story and direct team-development workflow | Add credible training content/advisors and pilot evidence |
| Core loop | Fast shot entry and visible progress | Coach assigns; player completes; team/family sees progress | Reduce every daily flow to one dominant action and immediate feedback |
| Skill scope | Shooting types and lessons | Shooting, conditioning, mobility, prep, recovery, programs | This is the main differentiation; demonstrate it, do not bury it |
| Team features | Challenges, teammates, invites | Roles, plans, progress, cheers, goals, reports | Sell coach workload reduction and season visibility |
| Offline | Native app expectation | Cached web workflow after initial load | Deliver installable, reload-safe PWA behavior |
| Association fit | Primarily player/team challenge | Association hierarchy, private team operations, development planning, and aggregate rollout reporting | Lead with the operational advantage and keep child-level data inside team/family permissions |
| Trust | Mature store presence/reviews | Early beta, no published proof | Use transparent beta language, a supported pilot, references, and outcome metrics |

Current competitor reviews reveal useful opportunities: clearer pricing before signup, reliable invites/account recovery, session editing/backdating, and dependable offline behavior. These are not glamorous features, but they heavily influence ratings and association trust.

## Recommended positioning and marketing

### Category

**Between-practice player development for hockey teams.**

Avoid leading with “accountability,” surveillance, or a feature inventory. For families, the emotional benefit is less nagging and a child who knows what to do. For coaches and associations, it is a repeatable development standard with evidence of participation.

### Homepage message

**Turn the days between practices into an advantage.**

Give every player a clear off-ice plan matched to the team schedule. Coaches assign in minutes. Players check off the work. Families and staff see progress.

Primary CTA: **Start a free team pilot**

Secondary CTA: **See the player and coach flow**

Do not say “association-ready,” “COPPA compliant,” “secure,” “works offline,” or “nothing is public” without the qualifying evidence and scope. Prefer specific, testable statements.

### Ideal first customer

- A development director, technical director, or motivated head coach in a Canadian minor-hockey association.
- One U11–U15 rep/development team with 15–22 players.
- A coach who already sends optional off-ice work but cannot see adoption.
- A parent group willing to participate in a 30-day supported pilot.

### 30-day pilot offer

- One team, all features unlocked, no payment details.
- 30-minute staff setup and a 15-minute parent onboarding session.
- Ready-made 30-day program plus team-schedule connection.
- Weekly founder check-in and issue response within one business day.
- End-of-pilot report with activation, sessions, completion, shots, coach time, and parent feedback.
- Written agreement that the pilot does not auto-convert to a paid plan.

### Pilot success criteria

- Coach publishes the first week within 30 minutes of setup.
- At least 75% of families activate within seven days.
- At least 60% of rostered players complete one session in week one.
- At least 50% remain weekly active in week four.
- Coach reports less than 15 minutes/week of administration.
- No unresolved privacy/security incident and no P0 support issue open longer than one business day.
- At least 70% of surveyed parents/coaches would continue.

## Design direction

The supplied 10,000 Shots screenshot is the right directional reference, not a screen-by-screen template. Its strengths are dark contrast, red action hierarchy, compact metrics, tab clarity, and a sports-specific visual rhythm.

Keep:

- Near-black/navy canvas, light text, red primary actions, restrained ice-blue data accents.
- One obvious action per screen and persistent role-appropriate bottom navigation.
- Large progress number/ring/bar before secondary content.
- Condensed uppercase labels for session, shot, and status data.
- Tighter radii and divider-led hierarchy instead of many floating pastel cards.

Avoid:

- Copying the competitor’s exact branding, layouts, icons, or illustrations.
- Making every element red; reserve red for active state and primary action.
- Dense coach dashboards on player screens.
- Invented settings or privacy controls in marketing mockups.
- Showing individual rankings by default for younger age groups; make competitive displays an explicit guardian/team choice.

The next design pass should concentrate on measured usability rather than a new visual direction: time the player Today, quick check-off/shot entry, and coach assignment journeys with real pilot users. The product should feel as fast as a shot counter even though it does more.

## Ninety-day product plan

### Phase 0 — controlled release (days 1–7)

- Deploy the verified release, complete production smoke/security checks, and monitor a founder-owned internal association for 48 hours.
- Complete real-role acceptance testing and produce the privacy/security summary, support process, pilot agreement, and onboarding checklist.

### Phase 1 — association pilot (days 8–38)

- Onboard 3–5 teams in one association, starting with one team for the first 48 hours.
- Track invite sent, guardian activation, player creation, first plan published, first session, week-two return, and support incidents by team.
- Interview the development director weekly and five families at days 7 and 30.
- Fix onboarding and daily-loop friction before expanding the roster.

### Phase 2 — prove repeatability (days 39–60)

- Add CSV roster import, season rollover, coach handoff, consent-status reporting, privacy export/delete tooling, installable PWA behavior, and seeded journey tests.
- Turn pilot outcomes into an evidence-based case study with permission.
- Define transparent team/association pricing and exactly what happens after beta.

### Phase 3 — scale the association (days 61–90)

- Expand to the remaining association teams only if activation, retention, support, and privacy gates are met.
- Establish service targets, incident communications, release cadence, and renewal/retention reporting.
- Add program libraries by age group, association templates, bulk season operations, and director-level trend comparisons without individual child rankings.

## Final launch checklist

- [x] Security and association migrations apply cleanly to a fresh local database
- [x] Database authorization tests pass (21 assertions)
- [x] Public launch browser tests pass
- [ ] Production security advisors clean or accepted with written rationale
- [ ] Deployment manifest reconciled: required functions deployed; recurring email jobs intentionally enabled or disabled
- [ ] Coach, manager, guardian, player, and unauthorized role tests pass
- [ ] Password reset, invites, calendar sync, offline sync, photos, export, and deletion tested on staging
- [x] Parent relationship/consent records and withdrawal model implemented
- [x] New child/profile photos use private signed access
- [ ] Privacy policy, Terms, DPA, subprocessors, retention, and incident process legally reviewed
- [x] Email preferences, unsubscribe, and job-level suppression implemented
- [ ] Recurring email consent/sender/schedule legally reviewed before activation
- [ ] Support inbox/form monitored with a named owner and response target
- [ ] Error monitoring, uptime alerts, and restore test operational
- [ ] Association pilot agreement, onboarding materials, success metrics, and exit criteria approved
