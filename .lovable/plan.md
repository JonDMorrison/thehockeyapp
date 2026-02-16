
# Homepage Clarity Overhaul

## The Problem

The current homepage has **13 sections** before the footer. It reads like a feature catalog rather than a clear pitch. A coach visiting for the first time has to scroll through Team Goals, Game Day Mode, Team Cheers, Weekly Summaries, and more before understanding the core value. The essential "what is this and how does it work" gets lost in feature noise.

## Strategy

Reduce the homepage to **7 focused sections** that answer three questions fast:
1. What is this? (Hero)
2. Why does it exist? (Problem)
3. How does it work? (3-step flow)
4. What does it look like? (Visual proof)
5. Who built it? (Credibility)
6. What does it cost? (Pricing anchor)
7. What do I do next? (CTA)

## Sections to Keep (with refinements)

1. **Hero** -- Keep as-is. Headline and sub are strong.

2. **The Problem** -- Keep as-is. Resonates with parents and coaches.

3. **How It Works (3 roles)** -- Keep but tighten the descriptions. These are slightly long. Shorten each to 1-2 sentences max so a coach scanning gets it in seconds.

4. **Features Grid** -- Keep but reposition it right after "How It Works" as the natural follow-up ("what else does it do?"). Reduce from 6 items to 4 most important: Works Offline, Knows Your Schedule, Parent-Controlled, Milestone Recognition. Cut "Smart workout creation" and "Solo mode" (secondary features that add noise for a first-time visitor).

5. **Founder Section** -- Keep as-is.

6. **Pricing Anchor** -- Keep as-is.

7. **Final CTA** -- Keep as-is.

## Sections to Remove

These are real features but belong on the Features page, not the homepage:

- **Team Goals** (thermometer visual) -- Too detailed for a first impression
- **Consistency and Recognition** (streaks/badges phone mockup) -- Secondary feature
- **Game Day Mode** (navy card visual) -- Niche feature, not a homepage seller
- **Team Encouragement / Cheers** -- Nice-to-have, not a homepage differentiator
- **Weekly Summaries** (AI summary card) -- Detailed feature, better on /features
- **Visual Section** ("Built by hockey parents" with basement photo) -- Redundant with the Founder section that follows it

## Final Page Order

```text
Nav
-----------------------------
1. Hero (headline + phone mockup + CTA)
2. The Problem ("You shouldn't have to be the enforcer")
3. How It Works (3 roles, tighter copy)
4. Features Grid (4 items, compact)
5. Founder Section (credibility)
6. Pricing Anchor ("Less than one private lesson")
7. Final CTA
-----------------------------
Footer
```

## Technical Details

### File changed
- `src/pages/marketing/Home.tsx`

### What changes in code
- Remove 6 section blocks (Team Goals, Consistency, Game Day, Cheers, Weekly Summaries, Visual/basement-photo section)
- Remove unused imports (Flame, Heart, MessageCircle, Gamepad2, BarChart3, DollarSign icons that are only used by removed sections; FeatureRewards, MarketingMilestonePreview, MarketingAIPreview components; hockeyPlayerBasement image import)
- Shorten the 3 "How It Works" role descriptions to 1-2 sentences each
- Trim the Features Grid from 6 cards to 4 (remove "Smart workout creation" and "Solo mode")
- Reorder remaining sections: Hero, Problem, How It Works, Features Grid, Founder, Pricing, Final CTA

### No other files affected
- No routing changes
- No component deletions (removed sections are inline JSX, not separate components)
- Features page (`/features`) already covers the detailed feature content being removed from homepage
