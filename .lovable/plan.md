

## UX Audit: The Hockey App
### From the perspective of a hockey coach and dad

After reviewing every major screen, flow, and interaction pattern in the app, here are the highest-impact UX improvements -- organized from most impactful to least.

---

### 1. Haptic-quality feedback on task completion (the core interaction)

The single most important interaction in this app is checking off a training task. Right now it's a standard checkbox toggle. For a kid in a garage tapping their phone with sweaty hands, this needs to feel *great*.

**Changes:**
- Add a subtle scale animation (0.95 -> 1.0) on the `WorkoutCheckItem` when toggled
- Add a satisfying checkmark animation (draw-in SVG path) instead of instant state change
- Show a micro-celebration (small confetti burst or star animation) when the *last* task is checked off, before the full session celebration fires
- Add progressive encouragement text that changes as tasks complete: "2 of 5 done -- keep going!" -> "Almost there!" -> "Last one!"

---

### 2. Eliminate the "where am I?" problem

The app has three distinct user journeys (Coach, Parent/Player on a team, Solo) but shares a single bottom nav with generic labels (Today, Teams, Players, Settings). A coach who is also a hockey dad has to mentally context-switch constantly.

**Changes:**
- When a user has *only one role* (e.g., they're only a coach with one team), skip the Teams list page entirely and go straight to that team's dashboard. Same for Players -- if there's only one player, skip the list.
- Add a subtle "role badge" to the AppShell header showing the current context: "Coaching: Northside Wolves" or "Training: Emma M."
- On the bottom nav, rename "Today" to "Home" -- it's more universally understood and matches what it actually does (route to dashboard)

---

### 3. Empty states that teach, not just inform

Several screens show empty states like "No teams yet" or "Dashboard not available" with generic descriptions. These are missed opportunities to guide users.

**Changes:**
- **Teams empty state**: Show a 3-step visual: "1. Create team -> 2. Invite families -> 3. Assign first workout" with a progress indicator
- **Players empty state**: Differentiate between "your coach hasn't invited you yet" (show how to ask for an invite code) vs. "you haven't added your child" (show the add flow)
- **CoachDashboard when no workout is published**: Instead of just showing planning cards, add a prominent "Your players have nothing to do today" nudge with a one-tap "Assign today's workout" button

---

### 4. Reduce cognitive load on the Coach Dashboard

The CoachDashboard currently shows: TodayHeader, microcopy, OnboardingProgress, AddPlayerChoice, PlanningHubCards, ActivePrograms, AssignedWorkouts, TeamGoalCard, CoachCheers, TeamPulseBar, UpcomingEvents, and CoachDock -- up to 12 sections stacked vertically. That's overwhelming.

**Changes:**
- Collapse "Team Pulse" stats (players count, active today, sessions complete) into the TodayHeader as inline badges instead of a separate section
- Move CoachDock actions (Roster, Progress, Settings) into the existing header bar as icon buttons -- they're already partially duplicated there (Settings gear is in the header AND the dock)
- Remove the duplicate "Settings" access (it's in both the header icon and the CoachDock)
- Group "Planning" and "Programs" into a single collapsible section
- Net result: ~8 sections instead of 12

---

### 5. The "Invite Friend" card says "Give 7 days free" (beta inconsistency)

On the SoloDashboard, the third action card says "Invite Friend" with subtext "Give 7 days free". During beta, everything is free, so this copy is misleading.

**Changes:**
- When `BETA_MODE` is true, change subtext to "Train together" or "Share the app"
- Same pattern as the GetStartedModal beta copy updates already done

---

### 6. Settings page has "Coming soon" items that hurt credibility

The Settings page shows "Notifications - Coming soon" and "Privacy - Coming soon" as disabled rows. For a beta launch, showing unfinished features makes the app feel incomplete.

**Changes:**
- Remove "Coming soon" items entirely during beta, or replace with a single "More features coming soon" note at the bottom
- Move the "Help & FAQ" link higher -- it's the most useful thing for beta testers

---

### 7. Auth page: "Join Hockey App" headline on signup feels generic

The signup page says "Join Hockey App" which doesn't reinforce the value proposition at the critical moment of conversion.

**Changes:**
- Change to "Start training smarter" or "Create your free account"
- Add a single social proof line below: "Trusted by hockey families across North America" (or whatever is accurate for beta: "Join our growing beta community")

---

### 8. SoloDashboard `window.location.reload()` on photo upload

In `SoloDashboard.tsx`, the `onPhotoUploaded` callback does `window.location.reload()` which is a jarring full-page refresh that kills all state. 

**Changes:**
- Replace with `queryClient.invalidateQueries({ queryKey: ['solo-dashboard', playerId] })` to refresh data without losing scroll position or local state

---

### 9. Marketing Home: second "did you do your training?" section is redundant

The homepage has two sections that say essentially the same thing: the "Problem" section with the quoted question, and the "No more 'did you do your training?'" section lower down. This dilutes the emotional punch.

**Changes:**
- Remove the second instance or reframe it as a "Results" section: "What changes after one week" with concrete outcomes (e.g., "Kids train without being asked", "Coaches see who's putting in work", "Parents stop being the enforcer")

---

### 10. Add a "quick win" first-run experience for new players

When a kid opens the app for the first time after their parent signs them up, they land on PlayerHome which can be data-heavy and overwhelming. There's no guided first interaction.

**Changes:**
- If the player has zero completed sessions, show a simplified "Welcome" overlay: "Your coach has assigned today's training. Tap to start!" pointing at the workout card
- Dismiss after first session completion

---

### Technical Details

**Files to modify:**
- `src/components/app/WorkoutCheckItem.tsx` -- Add completion animations (#1)
- `src/components/app/AppShell.tsx` -- Smart single-entity skip logic, rename "Today" to "Home" (#2)
- `src/pages/Teams.tsx`, `src/pages/Players.tsx` -- Auto-redirect when single entity (#2)
- `src/pages/CoachDashboard.tsx` -- Consolidate sections, remove duplicate Settings (#4)
- `src/components/dashboard/CoachDock.tsx` -- Remove Settings item or the header icon (#4)
- `src/components/dashboard/TeamPulseBar.tsx` -- Merge into TodayHeader (#4)
- `src/pages/SoloDashboard.tsx` -- Fix reload, beta copy for invite card (#5, #8)
- `src/pages/Settings.tsx` -- Remove "Coming soon" items, reorder sections (#6)
- `src/pages/Auth.tsx` -- Update signup headline and add social proof (#7)
- `src/pages/marketing/Home.tsx` -- Reframe second "did you do your training" section (#9)
- `src/pages/PlayerHome.tsx` -- Add first-run welcome overlay (#10)
- Various empty state components -- Enhance with guided steps (#3)

