# Shooting challenge desktop layout

The previous page forced all content into a 672px column and placed standings below the entire correction form. The page now uses the existing 1280px container with a large standings column and a 360–400px tools column on desktop. The overview combines dates/status, team shots and participation with an existing optimized hockey image. Standings use labelled numeric totals, authoritative tied ranks and comparison bars (not invented targets).

Mobile stays single-column: coaches see standings first with a shortcut to corrections/invites; families see daily entry first; newly created challenge invitations stay first. Coach entry copy refers to the selected player's totals rather than calling them the coach's shots. Existing save/version/conflict logic, date bounds, challenge timezone, invitation logic, authorization and private team visibility are unchanged. No changes to the user's live challenge records are needed.

Validation: full npm check passed (28 existing lint warnings, optional local Chrome prerender unavailable, static crawlability passed). Fifteen production-build scenarios passed across Chromium/WebKit/Firefox, including 320/390/1440/1920 layouts, desktop side-by-side geometry, tied standings, former members, long names, coach correction payload and updated totals, invitation links, family mobile order, finished lockout, scheduled/empty challenges, failed reads/retry, and first-challenge invitation order. Desktop screenshots inspected.

Artifacts: ../hockey-audit-output/shooting-layout-built. Controlled UI data is fictional; the real team challenge was not edited. Mobile tests use viewport emulation rather than physical devices.
