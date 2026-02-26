

## Recommendations to Improve The Hockey App

### 1. Pricing page is still fully accessible via direct URL
The `/pricing` route is still registered in `App.tsx` and the `Pricing.tsx` page has zero beta-mode awareness. Anyone navigating to `/pricing` directly sees full pricing ($15/mo, $500/yr, comparison tables, FAQs about payment). This contradicts the beta messaging everywhere else.

**Fix**: Either redirect `/pricing` to `/` when `BETA_MODE` is true, or wrap the page content with beta-aware copy.

---

### 2. UpgradePrompt component still shows paid copy
`src/components/app/UpgradePrompt.tsx` still references "$15/month after trial", "Start 7-Day Free Trial", and "$500/yr" pricing. If any code path renders this component during beta, users see contradictory messaging.

**Fix**: When `BETA_MODE` is true, either hide UpgradePrompt entirely or replace its copy with "All features unlocked during beta."

---

### 3. Dead Index.tsx page is routable
`src/pages/Index.tsx` is a component demo/reference screen (Team Home, Today, Players tabs with fake data). It's not linked from anywhere meaningful but is NOT the marketing home page -- that's `Home.tsx`. However, it's imported in `App.tsx` but never used in routes (Home is mapped to `/`). This is dead code that should be removed to reduce bundle size and avoid confusion.

**Fix**: Remove `Index.tsx` since it's unused.

---

### 4. Missing `<title>` and meta tags
`index.html` likely has generic Vite boilerplate metadata. For a production beta launch, proper page titles, Open Graph tags, and a favicon setup matter for link sharing.

**Fix**: Update `index.html` with proper title ("The Hockey App - Off-Ice Training for Hockey Families"), description, and OG tags.

---

### 5. Pricing route still lazy-loaded in App.tsx
Even though the nav hides the Pricing link, the route `<Route path="/pricing" element={<Pricing />} />` is still active. This means the page is accessible and indexed by search engines.

**Fix**: Conditionally render the `/pricing` route only when `BETA_MODE` is false, or redirect it.

---

### Technical Details

**Files to modify:**
- `src/App.tsx` -- Remove Index.tsx import (dead code), conditionally exclude `/pricing` route during beta
- `src/components/app/UpgradePrompt.tsx` -- Add BETA_MODE guard to hide or replace copy
- `src/pages/Index.tsx` -- Delete (unused reference screen)
- `index.html` -- Add proper title, meta description, OG tags

**Files already correct (no changes needed):**
- `MarketingNav.tsx` -- Already hides Pricing link in beta
- `MarketingFooter.tsx` -- Already hides Pricing link in beta
- `Settings.tsx` -- Already shows beta banner
- `useEntitlements.ts` -- Already grants full access in beta

