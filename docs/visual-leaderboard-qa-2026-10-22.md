# Visual shooting leaderboard and coach-parent entry

Players get photo avatars (private signed media when configured), jersey badges, trophy markers for the first three ranks, comparison bars and a separate shortcut for each owned player's rank. Server-provided ranks remain authoritative, including ties and unranked players. Former players and inaccessible/missing media fall back to initials. Optional identity failures never hide standings and offer retry. Identity reads use existing player RLS, limited to enrolled IDs, in batches of 100; no permission or schema changes.

A challenge opened with an owned player now uses personal entry rather than coach corrections, even for staff accounts. Dashboard Log shots links target the entry section; leaderboard links retain their separate destination. Staff can explicitly open coach tools. Challenge navigation retains the chosen context, including historical challenges without enrollment. Correction authorization remains enforced on the backend.

Validation:
- Full npm check (brand, link, journey, backend unit checks, TypeScript, lint and production build).
- Shooting layout suite at 320/390px mobile and 1440/1920px desktop in Chromium, WebKit and Firefox: ties, unranked/former players, photo success and failure, jersey display, own-rank jump, multiple owned players, identity retry, personal entry for staff, coach correction mode, empty/scheduled/finished/error states and first-challenge invitations.
- Disposable real backend actors: parent and independent player see authorized peer identities and historical leaderboards while cross-team/forged-player/write denial assertions remain intact. Coach-parent opens personal entry, saves 100 shots for their own player, observes updated totals and returns to coach corrections.
- Real fixture users and teams are removed in finally; no real team/player records edited and no emails sent.

Mobile verification uses browser viewport emulation, not physical devices. Existing lint warnings and optional local Chrome prerender limitation are unchanged.
