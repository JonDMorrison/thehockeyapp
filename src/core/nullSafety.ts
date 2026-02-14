/**
 * Null-safety helpers for strictNullChecks.
 *
 * Use these instead of non-null assertions (!) across the codebase.
 * The only place `!` is acceptable is inside these helper implementations.
 */

import { User } from "@supabase/supabase-js";

/** Throws if value is null/undefined; returns the narrowed value. */
export function assertDefined<T>(
  value: T | null | undefined,
  name: string
): T {
  if (value === null || value === undefined) {
    throw new Error(`'${name}' is unexpectedly ${value === null ? "null" : "undefined"}.`);
  }
  return value;
}

/** Type-guard: narrows T | null | undefined → T */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Require an authenticated user.
 * Throws if user is null (should be caught by ErrorBoundary).
 */
export function requireUser(user: User | null): User {
  return assertDefined(user, "Authenticated user");
}

/**
 * Require a route-param player ID.
 * Throws if the param is missing.
 */
export function requireActivePlayer(playerId: string | undefined): string {
  return assertDefined(playerId, "Active player ID");
}

/**
 * Require a route-param team ID.
 * Throws if the param is missing.
 */
export function requireActiveTeam(teamId: string | undefined): string {
  return assertDefined(teamId, "Active team ID");
}
