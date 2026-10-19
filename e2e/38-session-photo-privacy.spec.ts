import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

test('a parent-only session photo stays private from the coach until the family shares it', async () => {
  test.skip(process.env.PHOTO_PRIVACY_RELEASE_TEST !== '1', 'Opt in to a fictional coach/family and private test image.');
  const actors=[];
  for(const role of ['coach','parent']){
    const email=`qa-photo-${role}-${Date.now()}@example.com`,password=`QA-${randomUUID()}`;
    const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
    const result=await client.auth.signUp({email,password});expect(result.error).toBeNull();actors.push({client,id:result.data.user!.id});
    fs.appendFileSync('/tmp/hockey-qa-photo-fixtures.jsonl',JSON.stringify({email,userId:result.data.user!.id})+'\n');
  }
  const [coach,parent]=actors;
  const team=await coach.client.rpc('create_team_with_owner',{p_name:`Disposable Photo Privacy ${Date.now()}`,p_age_division:'U13',p_level:'rep'});expect(team.error).toBeNull();
  const player=await parent.client.rpc('create_managed_player',{p_first_name:'PhotoPrivacyKid',p_birth_year:2014});expect(player.error).toBeNull();
  const teamId=team.data.team_id,playerId=player.data.player_id,cardId=randomUUID(),token=randomUUID().replaceAll('-','');
  fs.appendFileSync('/tmp/hockey-qa-photo-fixtures.jsonl',JSON.stringify({teamId,playerId,cardId})+'\n');
  expect((await coach.client.from('team_invites').insert({team_id:teamId,token,expires_at:new Date(Date.now()+86400000).toISOString(),created_by_user_id:coach.id})).error).toBeNull();
  expect((await parent.client.rpc('join_team_with_invite',{invite_token:token,p_player_id:playerId})).error).toBeNull();
  expect((await coach.client.rpc('save_team_practice_card',{p_id:cardId,p_team_id:teamId,p_date:new Date().toISOString().slice(0,10),p_tier:'rep',p_title:'Private photo workout',p_notes:'',p_publish:true,p_tasks:[{label:'Photo privacy drill',task_type:'mobility'}]})).error).toBeNull();
  const objectPath=`sessions/${cardId}/${playerId}/${randomUUID()}.png`;
  fs.appendFileSync('/tmp/hockey-qa-photo-fixtures.jsonl',JSON.stringify({userId:parent.id,bucket:'session-photos',objectPath})+'\n');
  expect((await parent.client.storage.from('session-photos').upload(objectPath,fs.readFileSync('public/favicon.png'),{contentType:'image/png'})).error).toBeNull();
  const orphanPath=`sessions/${cardId}/${playerId}/${randomUUID()}.png`;
  fs.appendFileSync('/tmp/hockey-qa-photo-fixtures.jsonl',JSON.stringify({userId:parent.id,bucket:'session-photos',objectPath:orphanPath})+'\n');
  expect((await parent.client.storage.from('session-photos').upload(orphanPath,fs.readFileSync('public/favicon.png'),{contentType:'image/png'})).error).toBeNull();
  expect((await parent.client.storage.from('session-photos').createSignedUrl(orphanPath,60)).error).toBeNull();
  expect((await parent.client.storage.from('session-photos').remove([orphanPath])).error).toBeNull();
  expect((await parent.client.storage.from('session-photos').createSignedUrl(orphanPath,60)).error).toBeTruthy();
  let photoId='';
  try{
    const spoof=await parent.client.from('session_photos').insert({practice_card_id:cardId,player_id:playerId,uploaded_by_user_id:coach.id,storage_path:objectPath,visibility:'team_adults'}).select('id').maybeSingle();
    if(!spoof.error && spoof.data)await parent.client.from('session_photos').delete().eq('id',spoof.data.id);
    expect(spoof.error,'An uploader cannot impersonate another guardian’s sharing permission').toBeTruthy();
    const photo=await parent.client.from('session_photos').insert({practice_card_id:cardId,player_id:playerId,uploaded_by_user_id:parent.id,storage_path:objectPath,visibility:'parent_only',caption:'Private family caption'}).select('id').single();expect(photo.error).toBeNull();photoId=photo.data!.id;
    expect((await parent.client.storage.from('session-photos').createSignedUrl(objectPath,60)).error).toBeNull();
    expect((await coach.client.from('session_photos').select('id,caption').eq('id',photoId)).data).toEqual([]);
    expect((await coach.client.storage.from('session-photos').createSignedUrl(objectPath,60)).error).toBeTruthy();
    expect((await parent.client.from('session_photos').update({visibility:'team_adults'}).eq('id',photoId)).error).toBeNull();
    expect((await coach.client.from('session_photos').select('id').eq('id',photoId)).data).toEqual([]);
    expect((await parent.client.from('player_consents').update({photo_sharing_allowed:true}).eq('player_id',playerId).eq('guardian_user_id',parent.id)).error).toBeNull();
    expect((await coach.client.from('session_photos').select('id').eq('id',photoId)).data).toEqual([{id:photoId}]);
    expect((await parent.client.from('player_consents').update({photo_sharing_allowed:false}).eq('player_id',playerId).eq('guardian_user_id',parent.id)).error).toBeNull();
    expect((await coach.client.from('session_photos').select('id').eq('id',photoId)).data).toEqual([]);
    expect((await coach.client.storage.from('session-photos').createSignedUrl(objectPath,60)).error).toBeTruthy();
    expect((await parent.client.from('player_consents').update({photo_sharing_allowed:true}).eq('player_id',playerId).eq('guardian_user_id',parent.id)).error).toBeNull();
    expect((await coach.client.storage.from('session-photos').createSignedUrl(objectPath,60)).error).toBeNull();
    expect((await parent.client.from('session_photos').update({visibility:'parent_only'}).eq('id',photoId)).error).toBeNull();
    expect((await coach.client.from('session_photos').select('id').eq('id',photoId)).data).toEqual([]);
    expect((await coach.client.storage.from('session-photos').createSignedUrl(objectPath,60)).error).toBeTruthy();
  }finally{
    await parent.client.storage.from('session-photos').remove([objectPath]);
    if(photoId)await parent.client.from('session_photos').delete().eq('id',photoId);
    await coach.client.auth.signOut({scope:'local'});await parent.client.auth.signOut({scope:'local'});
  }
});
