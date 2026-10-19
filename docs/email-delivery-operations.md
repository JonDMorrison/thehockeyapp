# Email delivery and recovery operations

## Production configuration

The sending domain is `hockeyapp.ca`, verified with DKIM, SPF and a dedicated `send` return path. Existing website DNS and DMARC records are preserved. Open and click tracking are disabled. The provider key is restricted to sending from this domain.

Supabase Auth uses `smtp.resend.com:465`, username `resend`, sender `The Hockey App <hello@hockeyapp.ca>`, and an initial limit of 60 authentication messages per hour. Passwords retain the requested six-character minimum. Signup confirmation behavior is unchanged. Secrets live in hosted configuration, never this repository.

`RESEND_API_KEY` enables application delivery. `EMAIL_REPLY_TO` and `ADMIN_EMAIL` point to `jon@getclear.ca`. Authentication email has a monitored help link; application email replies go to the configured Reply-To address.

## Recovery template rollout

The versioned template is `supabase/templates/recovery.html`. Deploy the matching Auth page first; then set hosted `mailer_templates_recovery_content` to that file and `mailer_subjects_recovery` to `Reset your Hockey App password` through the Auth configuration API. This is a targeted configuration patch, not a wholesale config push.

The template opens `/auth?mode=reset&token_hash=…&type=recovery`. The app verifies the one-time recovery token in a fresh browser and removes it from the address bar. Older PKCE-code links remain supported. The Auth route uses no-referrer/no-store headers. Expired, reused, missing and rejected links lead back to a new request; they cannot submit a password change.

## Invitations and delivery failures

The sender validates the user token, team/association permission, active invitation and association recipient. Email links and team names come from saved records rather than caller-supplied URLs. Missing configuration and provider failures return errors; a successful request must include `success: true` before the UI claims an invitation was sent. The secure copy-link fallback remains available.

A private delivery table stores hashes and provider IDs, without addresses, message content or invitation links. A service-only reservation function serializes duplicate requests and limits an actor to 30 distinct emails per hour. Provider requests use stable idempotency keys, a 15-second timeout and bounded retries. Metadata write failures remain retryable without sending a second accepted message. A provider acceptance is not proof of inbox delivery.

## Verification and activation

Run `npm run test:transactional-delivery`, `npm run test:alert-dispatch`, and the normal repository check. Run `scripts/verify-email-delivery-db.sql` in a transaction with a dedicated QA actor. Browser recovery tests require explicit opt-in and a temporary service key file; their generated test users are removed in finally blocks. Browser invitation feedback tests intercept sends to avoid contacting families.

Actual launch tests use only disposable accounts with aliases of the connected mailbox. Confirm inbox receipt and SPF/DKIM/DMARC, follow the received invitation, verify saved membership, request an actual recovery email, change the disposable account's password, reject the old password and prove the new login. Never reset an existing customer's password for a test.

Weekly messages and operational schedules must be verified separately before activation. Do not equate a configured provider or a queued SQL job with delivery. Check recipient preferences, duplicate prevention, provider response and the actual mailbox. Optional marketing mail stays disabled.

References: [Resend SMTP for Supabase](https://resend.com/docs/send-with-supabase-smtp), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

## Weekly recap safety

Weekly recaps require a deliberate choice in Settings: the category flag and its confirmation timestamp must both be set. Historical default-true rows are not permission to send. Opting out suppresses the category immediately. Only the player's consenting primary owner receives the family recap; additional guardians are never chosen arbitrarily.

Recaps cover the previous completed Monday–Sunday week, using UTC date boundaries. Coach totals include only their team. Family totals include team and personal sessions plus logged challenge shots; completed personal-drill shot targets are labelled separately from logged shots. Any failed preference, roster, consent or metric read prevents sending that message. The retired legacy parent sender returns 410 to its service caller.

Private batches process at most 50 teams/players and queue subsequent pages with a Vault-held secret. Scheduled jobs run Monday, with Tuesday retry, at 17:00 UTC for coaches and 17:15 UTC for families. A stable per-recipient/team/player/week delivery key prevents repeat sends if totals change; unresolved deliveries expire before the provider's 24-hour idempotency window. Jobs start paused until mailbox and opt-out tests pass. Optional product marketing remains disabled.

Verification: `npm run test:weekly-email`; `scripts/verify-weekly-email-db.sql` (rollback); `e2e/58-weekly-email-opt-in.spec.ts` with an explicit disposable fixture. The latter exercises failed saves, persisted explicit choices and 320px layouts in Chromium, WebKit and Firefox.
