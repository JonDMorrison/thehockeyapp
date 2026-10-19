# Team staff invitations — October 19, 2026

Coaches can open **Invite team staff** directly from coach home or Team settings. They choose an email invitation or a private share link. Coaches and managers join the same coaching workspace, with no separate manager setup or player/team creation. The existing head coach retains staff-removal and ownership controls.

Email invitations require the recipient's account email; private links can be accepted by one signed-in account. Both expire after 14 days. Each new request is idempotent on retry. Existing staff can open their dashboard without consuming a new link. Accepted links cannot restore a removed staff member's access. Row locking prevents two accounts from claiming one link. Team settings lists identifiable colleagues, copies pending links and revokes invitations.

The directory returns names and emails only for colleagues in a team the caller belongs to; public profile-table permissions stay unchanged. Anonymous preview discloses no recipient email or user IDs. Staff emails use saved team/invitation context, recipient checks, canonical URLs and the existing bounded retry/rate/idempotency delivery guards. The redesigned email includes real expiry and a plain subject, with separately escaped HTML.

## Test coverage

- Real backend with separate disposable owner, invited staff, two unrelated accounts and a fresh signup. Mobile: email creation → failed email → retry with one saved invite → sign in → accept → coaching dashboard → create shooting challenge. Private link → fresh signup → direct dashboard. No player profile or new team setup.
- Wrong email, outsider invite creation, direct role escalation, unrelated staff directory, used/expired/revoked links, concurrent redemption, request replay, and owner removal through settings. Removal denies reads and prevents accepted-link reuse; refreshing an open dashboard stops displaying cached team data after authorization fails.
- Invite-preview failure recovery, 320/390px layouts, three browser engines, plus coach/family dashboard regressions: 24 release cases passed. Three additional 320px long-name/create-retry cases verify request reuse and layout.
- 12 staff-specific mocked email authorization/delivery cases, existing delivery safety tests, and 90 email render cases (ten variants × three widths × three engines). Additional hostile-name staff renders passed.
- Normal repository type/lint/build/content/safety checks. Browser emulation is not physical-device or every-inbox certification.

Database changes are additive and backward-compatible with existing email-bound invitations. Hosted migration versions match their committed files. All test accounts, teams, invite tokens and dependent fixture records are removed after verification.
