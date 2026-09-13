# The Hockey App brand system

## Brand idea

The Hockey App is the development system an association can put behind every team. It should feel disciplined, energetic, and credible—not playful, noisy, or like a collection of unrelated tools.

The visual shorthand is **performance red on rink-side black**, supported by a restrained neutral scale. Green has one job: confirming real completion or success.

## Core palette

| Role | Token | HSL | Hex | Use |
| --- | --- | --- | --- | --- |
| Brand red | `primary` | `358 82% 55%` | `#EA2E34` | Primary actions, active navigation, selected states, progress, key data |
| Deep red | `brand-strong` / gradient end | `358 72% 43%` | `#BD1F24` | Red gradients, hover depth, restrained decorative glow |
| Rink black | `background` | `222 18% 5%` | `#0A0C0F` | Page background |
| Charcoal | `surface` | `222 16% 8%` | `#111318` | Navigation and elevated shells |
| Raised grey | `surface-muted` | `222 14% 12%` | `#1A1D23` | Cards, secondary controls, grouped content |
| Line grey | `border` | `222 12% 21%` | `#2F333C` | Dividers and boundaries |
| Ice white | `foreground` | `0 0% 96%` | `#F5F5F5` | Primary text |
| Secondary text | `text-secondary` | `0 0% 76%` | `#C2C2C2` | Supporting copy |
| Muted text | `text-muted` | `0 0% 64%` | `#A3A3A3` | Metadata and labels |
| Completion green | `success` | `139 59% 46%` | `#30BB5C` | Completed tasks and confirmed success only |

## Colour rules

1. **Red means action or momentum.** Use it for the one primary action, active navigation, selected controls, progress bars, and the most important metric.
2. **Green means completed.** Do not use green to identify a role, decorate a card, or distinguish an ordinary feature.
3. **Grey means pending or secondary.** Pending counts, inactive states, informational notices, and secondary controls stay neutral.
4. **No product-level blue, purple, cyan, or orange.** These colours must not appear in standard controls, gradients, charts, role selectors, or status cards.
5. **Team colours are identity, not interface.** A crest, jersey swatch, or team identity detail may use association colours. Buttons, links, tabs, focus rings, and progress remain Hockey App red.
6. **Charts are not rainbows.** Use red for the primary series, green for completed/success, and greys for comparison or incomplete data. Use labels and patterns—not extra colours—to distinguish series.
7. **One dominant colour per component.** Red gradients may move from brand red to deep red. Avoid gradients that cross colour families.

## Component hierarchy

- **Primary button:** solid brand red, white label, subtle deep-red hover.
- **Secondary button:** charcoal or transparent, grey border, white label.
- **Active tab:** brand-red fill or underline. Inactive tabs remain grey.
- **Progress:** red while underway; green only when 100% complete.
- **Completed task:** green check and restrained green border/tint. Keep the surrounding surface charcoal.
- **Pending task:** grey icon, grey label, charcoal surface. Never orange.
- **Alerts:** neutral surface with a red icon for action-required states. Destructive actions use red with explicit wording.
- **Awards and streaks:** use red, white, and metallic-looking greys. Green appears only after an award is actually earned.

## Photography and video

- Use real hockey environments, natural contrast, and decisive action.
- Video tips live inside the matching exercise card so they feel instructional—not promotional.
- Video previews never autoplay. Marketing mockups are non-interactive; the real player opens only after the user chooses to watch.
- Use a dark overlay so white labels and the red play symbol remain legible over any thumbnail.

## Typography

- **Display:** Inter Tight, heavy weight, short statements, sentence or uppercase treatment depending on context.
- **Interface/body:** Inter, regular through bold.
- Keep body copy compact. Prefer one clear sentence over explanatory paragraphs.
- Use uppercase sparingly for eyebrows, short labels, and calls to action—not long instructions.

## Messaging principles

Lead with the association outcome, then explain the simple product loop:

1. Consistent development across every team.
2. Low effort for coaches.
3. Clear work for players and families.
4. Visible participation and progress for association leaders.

Avoid vague claims such as “everything that matters.” Name the role, action, or outcome directly.

## Release checklist

- Does the screen have only one dominant red action?
- Is green limited to a completed or successful state?
- Are pending and inactive states neutral grey?
- Are team colours limited to identity details?
- Do charts use red, green, and greys only?
- Is every text/background combination readable in dark mode?
- Does the screen still make sense without relying on colour alone?

Run `npm run brand:check` before release. It blocks off-brand interface utilities and prevents team palette tokens from leaking back into shared controls.
