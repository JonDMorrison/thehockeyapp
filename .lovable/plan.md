

## UI Improvement Recommendations

After reviewing every screen on both desktop and mobile, here are the highest-impact visual and interaction improvements.

---

### 1. Marketing hero section: phone mockup clips on mobile

On mobile (390px), the phone mockup gets cut off at the bottom of the hero -- the stats bar ("7 DAY STREAK", "142 TOTAL SHOTS") is partially hidden. The phone should either be fully visible or elegantly cropped with a fade-out gradient.

**Fix**: Add a bottom gradient mask on the phone mockup container in the mobile hero, so it fades out cleanly instead of being abruptly clipped by the section boundary.

**File**: `src/pages/marketing/Home.tsx`

---

### 2. Demo page CTA copy leaks pricing during beta

The Demo page final CTA still says "Get started free. Teams can cover families. Otherwise parents upgrade after a 7-day trial." This contradicts the beta messaging everywhere else.

**Fix**: Wrap the paragraph in a `BETA_MODE` conditional: show "Free during the beta. All features unlocked." when in beta.

**File**: `src/pages/marketing/Demo.tsx` (line ~262)

---

### 3. Mobile nav: "Off-Ice Training for Families" tagline is hidden

The tagline below "The Hockey App" in the MarketingNav uses `hidden sm:block`, so mobile users only see the logo and brand name. On mobile, the nav feels bare -- there's no context about what the app does until you scroll.

**Fix**: This is actually fine for nav bar space constraints. No change needed -- just confirmed intentional.

---

### 4. Consistent CTA button styling across marketing pages

The Features page final CTA uses `asChild` with `Link to="/auth"`, while Home and Demo use `onClick` to open the `GetStartedModal`. This means clicking "Get Started" on the Features page skips the role selection flow entirely and goes straight to auth.

**Fix**: Replace the Features page CTA with the same `GetStartedModal` pattern used on Home and Demo so users go through role selection first.

**File**: `src/pages/marketing/Features.tsx` (lines ~210-219)

---

### 5. "Founder" and "Results" sections share the same gray background

On the Home page, the Founder section and the Results section both use `bg-[hsl(0,0%,96%)]`, making them visually merge into one giant block. There's no separation -- the user can't tell where one ends and the other begins.

**Fix**: Change the Results section background to `bg-background` (white) to alternate properly: gray (Founder) then white (Results) then white (CTA). Or insert a subtle divider.

**File**: `src/pages/marketing/Home.tsx` (line ~208)

---

### 6. SoloDashboard three-card grid is too cramped on small screens

The 3-column `grid grid-cols-3 gap-3` with `aspect-square` cards becomes very tight on 320px-375px screens. The text inside ("Ready to Train", "Plan Training") can overflow or wrap awkwardly.

**Fix**: Change to `grid-cols-3 gap-2` on small screens with slightly reduced padding (`p-3` instead of `p-4`), or use `min-h-[100px]` instead of `aspect-square` to let cards flex vertically.

**File**: `src/pages/SoloDashboard.tsx` (line ~254)

---

### 7. Coach Dashboard header logo + back button takes too much horizontal space

The CoachDashboard header has: back chevron + logo image + "The Hockey App" text + context switcher + refresh + settings. On narrow screens, the text gets pushed off or the icons crowd. The "The Hockey App" branding in the header is redundant -- the user is already inside the app.

**Fix**: Remove "The Hockey App" text from the CoachDashboard and PlayerHome headers (keep only the logo icon). This frees ~120px of horizontal space for the action buttons.

**Files**: `src/pages/CoachDashboard.tsx` (line ~221), `src/pages/PlayerHome.tsx` (line ~431)

---

### 8. Empty state component lacks visual warmth

The generic `EmptyState` component uses a small icon + plain text. For an app targeting kids and families, empty states should feel encouraging, not clinical.

**Fix**: Add an optional `illustration` prop (React node) to EmptyState that renders above the icon, allowing pages to pass in custom illustrations or emoji-based graphics. Also increase the icon size from `h-6 w-6` to `h-10 w-10` and add a subtle background circle behind it.

**File**: `src/components/app/EmptyState.tsx`

---

### 9. Settings page "Help & FAQ" links to the About page

The Help & FAQ row opens `https://thehockeyapp.lovable.app/about` in a new tab, which is just the founder story. That's not help or FAQ content. Users clicking "Help" expect actual help.

**Fix**: Either create a simple `/help` page with real FAQ content, or rename the link to "About The Hockey App" so expectations match. For beta, renaming is the fastest fix.

**File**: `src/pages/Settings.tsx` (line ~367)

---

### 10. Auth page form card has inconsistent border radius

The form card uses `rounded-3xl` (24px) while the inner inputs use `rounded-2xl` (16px). The toggle button at the bottom has no explicit rounding. This creates a subtle visual inconsistency.

**Fix**: Standardize: card at `rounded-2xl`, inputs at `rounded-xl`. This matches the design system's `--radius: 1rem` (16px) base with `--radius-sm: 0.75rem` (12px) for inputs.

**File**: `src/pages/Auth.tsx` (line ~162)

---

### Technical Details

**Files to modify:**
- `src/pages/marketing/Home.tsx` -- Fix merged gray sections (#5)
- `src/pages/marketing/Demo.tsx` -- Beta CTA copy fix (#2)
- `src/pages/marketing/Features.tsx` -- Use GetStartedModal instead of direct Link (#4)
- `src/pages/SoloDashboard.tsx` -- Responsive card grid fix (#6)
- `src/pages/CoachDashboard.tsx` -- Remove redundant brand text from header (#7)
- `src/pages/PlayerHome.tsx` -- Remove redundant brand text from header (#7)
- `src/components/app/EmptyState.tsx` -- Larger icon, optional illustration (#8)
- `src/pages/Settings.tsx` -- Rename misleading "Help & FAQ" link (#9)
- `src/pages/Auth.tsx` -- Standardize border radius (#10)

