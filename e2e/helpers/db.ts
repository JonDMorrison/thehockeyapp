// Direct Supabase REST API calls to verify database state
// Uses anon key since we're reading data that belongs to the authenticated user

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN!; // JWT from user.json

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
        'Authorization': `Bearer ${AUTH_TOKEN}`,
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
        'Authorization': `Bearer ${AUTH_TOKEN}`,
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
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      }
    }
  );

  if (!response.ok) throw new Error(`DB query failed: ${response.status}`);
  return response.json();
}
