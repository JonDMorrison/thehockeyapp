import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

test('a family cannot grant itself access to another child; the actual owner can add and remove a guardian', async () => {
  test.skip(process.env.GUARDIAN_PERMISSION_RELEASE_TEST !== '1', 'Opt in to two fictional family accounts.');
  const actors=[];
  for(const role of ['owner','outsider']){
    const email=`qa-guardian-${role}-${Date.now()}@example.com`,password=`QA-${randomUUID()}`;
    const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
    const result=await client.auth.signUp({email,password});expect(result.error).toBeNull();actors.push({client,email,id:result.data.user!.id});
    fs.appendFileSync('/tmp/hockey-qa-guardian-fixtures.jsonl',JSON.stringify({email,userId:result.data.user!.id})+'\n');
  }
  const [owner,outsider]=actors;
  const player=await owner.client.rpc('create_managed_player',{p_first_name:'GuardianBoundaryKid',p_birth_year:2014,p_hockey_love:'Private family profile',p_photo_sharing_allowed:false,p_ai_personalization_allowed:false});expect(player.error).toBeNull();
  const playerId=player.data.player_id;fs.appendFileSync('/tmp/hockey-qa-guardian-fixtures.jsonl',JSON.stringify({userId:owner.id,playerId})+'\n');
  try {
    expect((await outsider.client.from('players').select('id').eq('id',playerId)).data).toEqual([]);
    for(const role of ['guardian','owner']){
      const attempt=await outsider.client.from('player_guardians').insert({player_id:playerId,user_id:outsider.id,guardian_role:role});
      // Remove any unauthorized fixture grant even when this regression fails against the old policy.
      if(!attempt.error) await owner.client.from('player_guardians').delete().eq('player_id',playerId).eq('user_id',outsider.id);
      expect(attempt.error,`Unrelated account self-granted ${role}`).toBeTruthy();
    }
    expect((await owner.client.from('player_guardians').insert({player_id:playerId,user_id:outsider.id,guardian_role:'guardian'})).error).toBeNull();
    expect((await outsider.client.from('players').select('id').eq('id',playerId)).data).toEqual([{id:playerId}]);
    expect((await owner.client.from('player_guardians').delete().eq('player_id',playerId).eq('user_id',outsider.id)).error).toBeNull();
    expect((await outsider.client.from('players').select('id').eq('id',playerId)).data).toEqual([]);
    const token=randomUUID().replaceAll('-','');
    expect((await owner.client.from('player_guardian_invites').insert({player_id:playerId,invited_email:outsider.email,token,expires_at:new Date(Date.now()+86400000).toISOString(),created_by_user_id:owner.id})).error).toBeNull();
    const unconfirmed=await outsider.client.rpc('redeem_guardian_invite',{invite_token:token,p_relationship_confirmed:false});expect(unconfirmed.error||unconfirmed.data?.success===false).toBeTruthy();
    const redeemed=await outsider.client.rpc('redeem_guardian_invite',{invite_token:token,p_relationship_confirmed:true});expect(redeemed.error).toBeNull();expect(redeemed.data.success).toBe(true);
    expect((await outsider.client.from('players').select('id').eq('id',playerId)).data).toEqual([{id:playerId}]);
  } finally {
    await owner.client.from('player_guardians').delete().eq('player_id',playerId).eq('user_id',outsider.id);
    await owner.client.auth.signOut({scope:'local'});await outsider.client.auth.signOut({scope:'local'});
  }
});

test('unrelated accounts cannot self-assign team staff roles; email-bound invites still redeem', async () => {
  test.skip(process.env.GUARDIAN_PERMISSION_RELEASE_TEST !== '1', 'Opt in to two fictional staff accounts.');
  const actors=[];
  for(const role of ['coach','staff']){
    const email=`qa-staff-${role}-${Date.now()}@example.com`,password=`QA-${randomUUID()}`;
    const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
    const result=await client.auth.signUp({email,password});expect(result.error).toBeNull();actors.push({client,email,id:result.data.user!.id});
    fs.appendFileSync('/tmp/hockey-qa-guardian-fixtures.jsonl',JSON.stringify({email,userId:result.data.user!.id})+'\n');
  }
  const [coach,staff]=actors;
  const team=await coach.client.rpc('create_team_with_owner',{p_name:`Disposable Staff Boundary ${Date.now()}`,p_age_division:'U13',p_level:'rep'});expect(team.error).toBeNull();
  const teamId=team.data.team_id;fs.appendFileSync('/tmp/hockey-qa-guardian-fixtures.jsonl',JSON.stringify({userId:coach.id,teamId})+'\n');
  try{
    for(const role of ['assistant_coach','manager','head_coach']){
      const attempt=await staff.client.from('team_roles').insert({team_id:teamId,user_id:staff.id,role});
      if(!attempt.error)await coach.client.from('team_roles').delete().eq('team_id',teamId).eq('user_id',staff.id);
      expect(attempt.error,`Unrelated account self-granted ${role}`).toBeTruthy();
    }
    const token=randomUUID().replaceAll('-','');
    expect((await coach.client.from('team_adult_invites').insert({team_id:teamId,invited_email:staff.email,role:'assistant_coach',token,expires_at:new Date(Date.now()+86400000).toISOString(),created_by_user_id:coach.id})).error).toBeNull();
    const wrong=await coach.client.rpc('redeem_team_adult_invite',{invite_token:token});expect(wrong.error||wrong.data?.success===false).toBeTruthy();
    const redeemed=await staff.client.rpc('redeem_team_adult_invite',{invite_token:token});expect(redeemed.error).toBeNull();expect(redeemed.data.success).toBe(true);
    expect((await staff.client.from('team_roles').select('role').eq('team_id',teamId).eq('user_id',staff.id)).data).toEqual([{role:'assistant_coach'}]);
    expect((await coach.client.from('team_roles').delete().eq('team_id',teamId).eq('user_id',staff.id)).error).toBeNull();
    expect((await staff.client.from('teams').select('id').eq('id',teamId)).data).toEqual([]);
  }finally{
    await coach.client.from('team_roles').delete().eq('team_id',teamId).eq('user_id',staff.id);
    await coach.client.auth.signOut({scope:'local'});await staff.client.auth.signOut({scope:'local'});
  }
});
