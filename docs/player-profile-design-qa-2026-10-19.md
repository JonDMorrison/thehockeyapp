# Player profile design — October 19, 2026

## Change

Roster player details and the family player profile share a compact hockey card: an existing optimized hockey image, private avatar or initials, jersey number, factual metadata and personality tiles. Roster details retain the progress action. Family editing, photo upload and guardian controls retain their existing authorization and save handlers. No statistics or accomplishments are invented. Missing information is omitted, and families can personalize an empty card.

The roster profile now distinguishes a failed/unavailable read from a successfully loaded profile, with retry and back navigation. Player/photo query keys include the signed-in account. Shared photos retain the team-adults filter, private bucket and signed URL handling; practice-card errors are no longer swallowed.

## Verification

`e2e/67-player-card-design.spec.ts` covers five scenarios in Chromium, WebKit and Firefox:

- Coach roster profile at 390px and 1440px, loaded decorative imagery, no family edit controls, progress navigation.
- Family profile at 390px, signed photo resolution, editing and saving a favorite, persisted read after reload.
- Sparse profile at 320px, no fabricated/unknown facts or trailing punctuation, family personalization prompt.
- Long player/team names and unbroken goal text at 320px, failed profile read, retry recovery and no horizontal overflow.
- Non-guardian profile viewer at 320px sees no photo upload or edit controls.

These are authenticated browser UI tests with controlled REST/storage fixtures, not fresh database authorization or physical-device certification. Existing backend policies and photo upload logic are unchanged. No live player records are created or edited by these tests.

Full `npm run check` passed (28 existing lint warnings). The local optional Chrome prerender was unavailable; the static-shell crawlability verification passed. Final component type/lint checks passed. Screenshots and browser results are retained outside the source tree in `hockey-audit-output/player-card-design-2026-10-19/`.

An initial test run found an ambiguous test locator because the existing editor has two Save controls; targeting the lower Save control resolved it. No save-handler change was needed.

Release run: all 15 browser checks passed. The final mobile layout places favorites side by side, with longer personal answers spanning the full width.
