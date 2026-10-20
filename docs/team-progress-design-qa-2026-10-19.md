# Team progress redesign

The overview separates Monday–Sunday team workout participation from each shooting challenge's full date range. Workout rows link to player profiles; shooting uses authorized snapshots, authoritative ranks and totals, and links to the full challenge. Comparison bars are labelled as comparisons, not invented goals. Scheduled, empty, loading and retry states have distinct copy. Existing heatmap, all-time rankings, badges, streaks, player details and season report remain available.

Completion reads now join directly to this team's practice cards and paginate in batches of 500, rather than truncating the card list or completion list. Future records and parent programs are excluded; overview and heatmap use the active roster. Fixed yesterday-starting streak calculation. Player ranking rows now support keyboard activation.

Validation: full npm check passed (existing lint warnings; local optional Chrome prerender unavailable, static crawlability passed). Nine browser scenarios passed across Chromium, WebKit and Firefox, covering 320/390/1440 layouts, workout participation, shot totals, challenge switching, scheduled zero, empty challenge and recovery from failed snapshots. Screenshots inspected at 320px. An initial test used the wrong retry-button label; corrected to the actual accessible name. Real-role fixture needed adjustment for UTC save-date validation versus Vancouver day; retained failed run evidence.

Artifacts: ../hockey-audit-output/team-progress-final and team-progress-real-final. Tests use browser mobile viewport emulation, not physical devices.

Existing limitation discovered during extended regression: workout creation uses the database UTC date while some home-workout and coach-day views use different date boundaries. The previous Vancouver fixture fails near UTC midnight. Real-role progress validation uses an explicitly UTC test team to isolate this redesign. This does not certify the existing cross-timezone daily dashboard behavior.
