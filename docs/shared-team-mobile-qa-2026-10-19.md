# Shared-team mobile role audit — October 19, 2026

Four independent accounts use one disposable team in separate mobile browser contexts: head coach, manager joining a real staff share invitation, parent managing a child, and an independent adult player. The player fixture is an adult account holder; this does not introduce child logins.

| Account | Expected home | Saved progress |
| --- | --- | --- |
| Coach | Coaching dashboard | Both roster members; 2 completed workouts today; 300 challenge shots |
| Invited manager | Same coaching dashboard | Same team roster and totals as coach |
| Parent | Managed child's home | Child's completed team workout and 125 challenge shots |
| Independent player | Own player home | Own completed team workout and 175 challenge shots |

Both families complete the actual workout and shooting-entry UI. A private home workout is completed separately and is excluded from team sessions. One historical completed team session gives 3 all-time sessions, while this week's heatmap correctly shows 2. Staff cannot read the private home workout; parent and player cannot read each other's private snapshot or create staff invitations.

Repairs:

- Family **Your teams** links open the player's team plan instead of staff roster-management screens, saving the selected team before navigation.
- Player workout/week screens preserve the independent player's workspace instead of relabelling it as the parent view.
- Staff roster/progress screens use the same staff authorization as coach home. Family accounts see a recovery path instead of staff management actions or fake empty progress.
- Failed membership/card/completion/badge reads produce a retry state. Saved effort is no longer presented as zero activity during a read outage.
- The activity chart explicitly covers the current Monday–Sunday week. Historical sessions remain in All Time.

Verification includes default /today routing, manager invitation acceptance, actual task/session and shot persistence, permission boundaries, private-home exclusion, weekly/all-time separation, failed-progress retry and horizontal-overflow checks. Chromium/Firefox use390px and WebKit320px mobile viewports; these are browser emulations, not physical phones. Adjacent coach and family dashboard regressions and normal repository checks are recorded with the release evidence. Fixtures are removed in finally blocks, including users, team, both player profiles and dependent records.
