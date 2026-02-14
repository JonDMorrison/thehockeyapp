

# Foundation Reset: Production Architecture Discipline

## Goal
Establish a clean, production-grade foundation layer without modifying any existing UI or features. This creates the structural scaffolding that all future development will build on.

---

## Scope of Changes

### 1. Create `/src/core/` directory with foundational modules

**`src/core/types.ts`** -- Shared domain types derived from the existing database schema (in `types.ts`). These are clean, readable interfaces that the rest of the app will import instead of using raw Supabase Row types or `any`.

Types to define:
- `Player` (id, firstName, lastInitial, birthYear, ownerUserId, etc.)
- `Team` (id, name, seasonLabel, paletteId, logoUrl, photoUrl, etc.)
- `PracticeCard` (id, teamId, date, title, tier, mode, published, locked)
- `PracticeTask` (id, cardId, label, taskType, sortOrder, targetType, targetValue, shotsExpected, isRequired)
- `SessionCompletion` (id, playerId, cardId, status, completedAt, durationMinutes)
- `PersonalPracticeCard` (same shape for solo mode)
- `TrainingProgram` (id, teamId, name, status, tier, startDate, endDate, focusAreas)
- `TeamGoal` (id, teamId, name, goalType, targetValue, currentValue, status)
- `Subscription` (placeholder -- userId, plan, status, expiresAt)
- `Entitlement` (placeholder -- feature flags tied to subscription tier)
- `UserRole` type union (re-export from existing hook for single source of truth)

**`src/core/logger.ts`** -- Structured logger utility that replaces all `console.log` / `console.error` calls.

- Exposes `logger.info()`, `logger.warn()`, `logger.error()`, `logger.debug()`
- Each accepts a message string and optional context object
- In production (`import.meta.env.PROD`), all output is suppressed
- In development, outputs with level prefix and timestamp
- Approximately 40 lines of code

**`src/core/permissions.ts`** -- Centralizes permission check helpers used across the app.

- `canEditTeam(role)`, `canManagePlayers(role)`, `canPublishCard(role)`
- Maps to existing RLS helper function names (`is_team_adult`, `is_team_head_coach`, etc.) so client-side guards stay in sync with database policies
- Pure functions, no Supabase calls -- these are for UI gating only

**`src/core/entitlements.ts`** -- Feature gating scaffold (no billing integration yet).

- Defines `Plan` enum: `free | starter | pro`
- Defines `Feature` enum: `ai_assist | advanced_analytics | unlimited_programs | ...`
- `hasEntitlement(plan, feature): boolean` lookup function
- Currently returns `true` for everything (no paywall active), but the structure is ready

**`src/core/constants.ts`** -- App-wide magic values pulled into one file.

- Tier multipliers (currently in `tierScaling.ts`)
- Task type labels and icons
- Max values (e.g., max players per team, max tasks per card)
- Storage keys (currently scattered as string literals in `ActiveViewContext`, `useTeamTheme`, etc.)
- Default palette ID, default tier, etc.

**`src/core/index.ts`** -- Barrel export for clean imports: `import { logger, Player, hasEntitlement } from "@/core"`

---

### 2. Structured Logger Adoption

Replace all `console.log` and `console.error` calls across the codebase (~95 occurrences in ~15 files) with the structured logger:

- `console.log(...)` becomes `logger.debug(...)` or `logger.info(...)`
- `console.error(...)` becomes `logger.error(...)`
- `.catch(console.error)` becomes `.catch((err) => logger.error("context", { err }))`

Files affected (partial list):
- `src/pages/JoinTeamPlayer.tsx`
- `src/components/planning/ProgramBuilderWizard.tsx`
- `src/pages/SoloWeekPlanner.tsx`
- `src/components/player/InviteFriendModal.tsx`
- `src/components/builder/AIAssistSheet.tsx`
- `src/components/team/CoachProfileSection.tsx`
- `src/components/team/ScheduleSyncSection.tsx`
- `src/lib/syncEngine.ts`
- `src/pages/NotFound.tsx`
- And ~6 more

---

### 3. Remove `any` Usage

Approximately 136 occurrences across 16 files. The approach:

- Supabase query results: use the auto-generated Row types from `types.ts` (e.g., `Database["public"]["Tables"]["players"]["Row"]`) or the new domain types from `core/types.ts`
- Event handlers like `onValueChange={(v: any) => ...}` become properly typed (e.g., `(v: string) => ...`)
- Catch blocks: `catch (error: any)` becomes `catch (error: unknown)` with narrowing via `error instanceof Error`
- Map callbacks on Supabase data: type the parameter using the Row type or a local interface

Key files:
- `src/hooks/useUserRoles.ts` (2 uses)
- `src/pages/PracticeCardEditor.tsx` (5 uses)
- `src/pages/WeekPlanEditor.tsx` (6 uses)
- `src/components/dashboard/CoachCheersSection.tsx`
- `src/components/team/AddChildSection.tsx`, `JoinAsPlayerSection.tsx`, `InviteParentsModal.tsx`
- `src/pages/JoinTeamSearch.tsx`, `SoloTryWorkout.tsx`

---

### 4. Enable Strict TypeScript

Update `tsconfig.app.json`:
- `"strict": true`
- `"noImplicitAny": true`
- Keep `"noUnusedLocals": false` and `"noUnusedParameters": false` to avoid noise

Update `tsconfig.json` (root):
- Remove `"noImplicitAny": false`
- Add `"strict": true`

This will surface additional type errors that must be fixed in tandem with the `any` removal in step 3.

---

### 5. Centralized Error Boundary

Create `src/core/ErrorBoundary.tsx`:
- React class component implementing `componentDidCatch`
- Calls `logger.error("Uncaught UI error", { error, errorInfo })`
- Renders a calm fallback: app logo, "Something went wrong" message, and a "Reload" button
- No stack traces shown to users

Wrap the app in `src/App.tsx`:
- Add `<ErrorBoundary>` around the router/providers (outermost wrapper)

---

### 6. Barrel Export for `/core`

After all modules are created, add `src/core/index.ts` exporting everything so imports are clean:

```
import { logger, Player, PracticeCard, hasEntitlement, TIERS } from "@/core";
```

---

## What Will NOT Change
- No UI changes (layouts, colors, components stay identical)
- No new features added
- No database migrations
- No changes to `src/integrations/supabase/client.ts` or `types.ts` (auto-generated)
- No changes to `.env` or `supabase/config.toml`
- No changes to edge functions

## Execution Order
1. Create `src/core/` modules (types, logger, permissions, entitlements, constants, ErrorBoundary, index)
2. Enable strict TypeScript in tsconfig files
3. Replace all `any` usages across the codebase
4. Replace all console.log/error with logger calls
5. Wrap App with ErrorBoundary

## Estimated Scope
- ~8 new files created (all in `src/core/`)
- ~20 existing files edited (type fixes + logger replacement)
- 0 features added, 0 UI changes

