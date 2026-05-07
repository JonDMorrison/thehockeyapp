# Hockey App (thehockeyapp.ca)

## Deploy
- Vercel auto-deploys on push to main
- Supabase project: tyfkyzdeuyhpeurxigrm

## Critical Rules
- Read only first, report findings, confirm with Jon, then make changes
- Do not restructure live systems without fully understanding the flow first
- Tests are gates, not optional — see Testing section below

## Stack
- Lovable + Supabase + Vercel + OpenAI (AI features in `e2e/08-ai-features.spec.ts`)

## Testing

End-to-end tests live in `e2e/` and run with Playwright (chromium-only). Config is `playwright.config.ts`; baseURL honors `TEST_BASE_URL` (default `http://localhost:8080`). Storage state for an authenticated test user is captured at `e2e/.auth/user.json` via `e2e/helpers/global-setup.ts`. The webServer auto-starts `npm run dev` if nothing is on 8080.

Scripts:
- `npm run test:e2e` — full suite
- `npm run test:e2e:ui` — interactive Playwright UI
- `npm run test:e2e:headed` — visible browser
- `npm run test:e2e:report` — open the most recent HTML report

Existing coverage (~57 test cases across 9 spec files):
- `e2e/01-auth.spec.ts` (5) — signup, login, logout, session persistence, route guards
- `e2e/02-coach-flow.spec.ts` (11) — coach dashboard, team management, scheduling
- `e2e/03-player-flow.spec.ts` (9) — player dashboard, stats, profile
- `e2e/04-parent-flow.spec.ts` (3) — parent view, child linking
- `e2e/05-solo-flow.spec.ts` (2) — solo skater workflows
- `e2e/06-team-features.spec.ts` (6) — roster, invites, team settings
- `e2e/07-settings.spec.ts` (6) — account, notifications, integrations
- `e2e/08-ai-features.spec.ts` (4) — AI-driven features (stub or test-mode keys before enabling)
- `e2e/09-deep-audit.spec.ts` (11) — broad regression sweep

When tests break:
1. Real regression — fix the code.
2. Selector drift — update the test or add a stable `data-testid`.
3. Storage state expired — delete `e2e/.auth/user.json` and let global-setup re-capture.
4. Local server didn't start on 8080 — `lsof -i :8080` and free the port.

Tests are gates. Don't merge to main if tests are failing without an explicit, written reason.

The Expect MCP (AI-driven exploratory browser testing) is registered globally in Claude Code; invoke `/expect` for ad-hoc test runs on top of the persistent suite.
