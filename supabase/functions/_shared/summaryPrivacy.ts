/** A saved opt-in counts only while its confirmed guardian relationship is active. */
export async function aiConsentedPlayers(client: any, playerIds: string[], guardianId?: string): Promise<Set<string>> {
  if (!playerIds.length) return new Set();
  let consentQuery = client.from('player_consents').select('player_id,guardian_user_id').in('player_id',playerIds).eq('relationship_confirmed',true).eq('ai_personalization_allowed',true).is('withdrawn_at',null);
  if (guardianId) consentQuery=consentQuery.eq('guardian_user_id',guardianId);
  const {data:consents,error}=await consentQuery;
  if(error)throw error;
  if(!consents?.length)return new Set();
  const {data:guardians,error:guardianError}=await client.from('player_guardians').select('player_id,user_id').in('player_id',playerIds);
  if(guardianError)throw guardianError;
  const active=new Set((guardians||[]).map((g:any)=>`${g.player_id}:${g.user_id}`));
  return new Set(consents.filter((c:any)=>active.has(`${c.player_id}:${c.guardian_user_id}`)).map((c:any)=>c.player_id));
}

export function validDateOnly(value: unknown): value is string {
  return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;
}
