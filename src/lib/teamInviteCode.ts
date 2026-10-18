/** Accept a coach's short code or a full invite link without throwing on bad escapes. */
export function normalizeTeamInviteCode(value: string): string {
  const input = value.trim();
  const match = input.match(/(?:^|\/)join\/([^/?#]+)/i);
  if (!match) return input.toUpperCase();
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}
