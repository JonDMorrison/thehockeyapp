/**
 * Drop-in replacement for useParams that narrows route params to `string`.
 * Throws (caught by ErrorBoundary) if a required param is missing.
 *
 * Usage:
 *   const { id } = useRequiredParams("id");
 *   const { teamId, playerId } = useRequiredParams("teamId", "playerId");
 */
import { useParams } from "react-router-dom";

export function useRequiredParams<K extends string>(
  ...keys: K[]
): Record<K, string> {
  const params = useParams();
  const result = {} as Record<K, string>;
  for (const key of keys) {
    const value = params[key];
    if (!value) {
      throw new Error(`Missing required route parameter: "${key}"`);
    }
    result[key] = value;
  }
  return result;
}
