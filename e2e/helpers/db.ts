import fs from 'node:fs';

// Direct Supabase REST API calls to verify database state
// Uses anon key since we're reading data that belongs to the authenticated user

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
function getAuthToken(): string {
  if (process.env.TEST_AUTH_TOKEN) return process.env.TEST_AUTH_TOKEN;
  // Global setup already captures the dedicated test user's real session.
  const state = JSON.parse(fs.readFileSync('e2e/.auth/user.json', 'utf8'));
  for (const origin of state.origins ?? []) {
    const entry = origin.localStorage?.find((item: { name: string }) => /^sb-.*-auth-token$/.test(item.name));
    if (entry) {
      const token = JSON.parse(entry.value).access_token;
      if (token) return token;
    }
  }
  throw new Error('Database checks require the authenticated test session captured by global setup.');
}

export async function queryDB(table: string, filters: Record<string, string>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    params.append(key, `eq.${val}`);
  });

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      }
    }
  );

  if (!response.ok) throw new Error(`DB query failed: ${response.status}`);
  return response.json();
}

export async function getTaskCompletions(playerId: string, taskIds: string[]) {
  const params = new URLSearchParams();
  params.append('player_id', `eq.${playerId}`);
  params.append('practice_task_id', `in.(${taskIds.join(',')})`);

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/task_completions?${params.toString()}`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${getAuthToken()}`,
      }
    }
  );

  if (!response.ok) throw new Error(`DB query failed: ${response.status}`);
  return response.json();
}

export async function getSessionCompletion(playerId: string, cardId: string) {
  const params = new URLSearchParams();
  params.append('player_id', `eq.${playerId}`);
  params.append('practice_card_id', `eq.${cardId}`);

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/session_completions?${params.toString()}`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${getAuthToken()}`,
      }
    }
  );

  if (!response.ok) throw new Error(`DB query failed: ${response.status}`);
  return response.json();
}
