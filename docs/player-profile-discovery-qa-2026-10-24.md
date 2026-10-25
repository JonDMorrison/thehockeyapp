# Player profile discovery and photo upload

Families can open a photo/profile directly from the player dashboard avatar. An optional completion card offers Add player photo and Complete player profile when personal details are missing; a completed card removes the invitation. Coaches visiting another player's dashboard get a read-only profile destination rather than an edit invitation.

The profile now has a large Add/Change player photo button alongside Edit player details, with an equally clear action while editing. The entire portrait is tappable. Accepted image types, 5 MB limit, who can see the photo, upload progress, success and retry messages are visible. Failed uploads retain the existing photo.

Replacement images use unique private storage paths, preventing stale signed-URL/browser caching. The player update is confirmed before success is shown; failed record updates clean up their uploaded object, and successful replacements remove the previous object only within that player's folder. Relevant family, roster, profile and leaderboard identity caches are refreshed. Photo uploads no longer reset unsaved profile answers. Read failures show a retry action rather than a misleading missing-player screen. Sensitive profile/invitation caches are scoped to the viewer.

Roster cards now explicitly say View player profile. The existing team-scoped profile shows the player's portrait, favourites and goals; coach read access does not become photo/profile edit access. No storage or database permissions were expanded.

## Validation

- `npm run check`: typecheck, lint, unit checks, production build and static crawlability. Existing 28 lint warnings and optional local Puppeteer prerender limitation remain.
- `e2e/63-family-home-states.spec.ts`: workout/challenge states and switching active teams.
- `e2e/69-roster-visual-states.spec.ts`: 320/390/1440px roster, player details, keyboard navigation, pagination, failures and empty states.
- `e2e/77-player-profile-discovery.spec.ts` with `PROFILE_RELEASE_TEST=1`: disposable real family/coach, joined through a real team invite. Dashboard prompt → profile read recovery → visible upload picker → invalid file rejection → private image upload and rendered pixels → failed replacement preserves old reference → completion invitation opens editing → successful replacement preserves unsaved answers → save → prompt disappears → coach opens profile from roster and sees image/favourites/goals without edit controls. Layout checked at 320/390/1440px. Objects, team, player and accounts removed in cleanup.

Browser checks use mobile viewport emulation in Chromium, WebKit and Firefox, not physical devices. Test credentials stay in private temporary files; no real player records or email delivery are used.
