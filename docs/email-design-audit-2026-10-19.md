# Email design audit — October 19, 2026

The audit covered every active send path: five transactional types, the player recap's zero-activity state, urgent admin alerts, daily admin digests, and Auth password recovery. The retired parent-weekly sender remains retired. Signup confirmation and magic-link emails are not active app flows and have not been enabled by this change.

## Findings and changes

- Plain navy transactional messages, unrelated admin layouts, and a separate bright-red recovery design now share charcoal branding, a muted red action, warm photography, white cards, and generous readable spacing.
- Existing rink and driveway JPEGs now have stable public email URLs. They carry no private data or tracking parameters; the email remains useful when images are blocked.
- Family recaps show sessions and actual logged shots in a compact stat card. Home drill targets remain clearly distinguished from logged shots. Zero weeks never claim progress or invent encouragement for work not recorded.
- Welcome instructions preserve program/challenge → publish → invite order. Family invitations explain what the coach may offer without promising a published workout. The team code is separated into a visual card.
- Invitations and recaps use small, email-safe typographic symbols with visible text labels. Password recovery stays short, image-free, and focused on its single-use, one-hour action.
- Admin alerts remain concise and serious. Daily digests gain a clear summary card, and both now include a plain-text companion.
- All layouts include language/direction, a title, semantic headings, meaningful image alt text, labeled links, and presentational tables. The coach roster remains a real data table with column headers.

## Validation

`npm run test:email-design` renders nine variants at 320, 390, and 600 px in Chromium, Firefox, and WebKit (81 renders), checks overflow, headings, accessible links, private invitation/reset URLs, unsubscribe controls, plaintext, HTML clipping limits, blocked-image usability, and dark color-scheme preference. Browser emulation does not certify Outlook Word rendering or every inbox's forced dark-mode transformation; layouts therefore use conservative tables, inline styles, and no SVG, external fonts, scripts, background-image-dependent text, or CSS-only icons.

Existing mocked delivery/authorization tests verify staff permissions, canonical saved invites, consent-aware weekly dispatch, duplicate protection, provider failure handling, and expired retry limits. Delivery infrastructure, opt-in rules, monitored reply-to, security token handling, and unsubscribe destinations are unchanged.

Preview HTML and PNGs are generated locally in `/tmp/hockey-email-previews` by default and are not committed with private links. Fixtures use fictional players and placeholder tokens.
