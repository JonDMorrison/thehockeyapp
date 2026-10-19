import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

test('a guardian cannot attach completion records to an unrelated team or another player’s personal workout', async () => {
  test.skip(process.env.TRAINING_SCOPE_RELEASE_TEST !== '1','Opt in to two fictional accounts and isolated training records.');
  const actors=[];
  for(const role of ['family','outsider']){
    const email=`qa-scope-${role}-${Date.now()}@example.com`,password=`QA-${randomUUID()}`;
    const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
    const result=await client.auth.signUp({email,password});expect(result.error).toBeNull();actors.push({client,id:result.data.user!.id});
    fs.appendFileSync('/tmp/hockey-qa-scope-fixtures.jsonl',JSON.stringify({email,userId:result.data.user!.id})+'\n');
  }
  const fixtures=[];
  for(const [index,actor]of actors.entries()){
    const team=await actor.client.rpc('create_team_with_owner',{p_name:`Disposable Record Scope ${Date.now()} ${index}`,p_age_division:'U13',p_level:'rep'});expect(team.error).toBeNull();
    const player=await actor.client.rpc('create_managed_player',{p_first_name:`ScopeKid${index}`,p_birth_year:2014});expect(player.error).toBeNull();
    const teamId=team.data.team_id,playerId=player.data.player_id,cardId=randomUUID();
    fs.appendFileSync('/tmp/hockey-qa-scope-fixtures.jsonl',JSON.stringify({teamId,playerId,cardId,userId:actor.id})+'\n');
    expect((await actor.client.rpc('add_my_player_to_team',{p_team_id:teamId,p_player_id:playerId})).error).toBeNull();
    expect((await actor.client.rpc('save_team_practice_card',{p_id:cardId,p_team_id:teamId,p_date:new Date().toISOString().slice(0,10),p_tier:'rep',p_title:'Scoped workout',p_notes:'',p_publish:true,p_tasks:[{label:'Scoped drill',task_type:'shooting',shots_expected:50}]})).error).toBeNull();
    const task=await actor.client.from('practice_tasks').select('id').eq('practice_card_id',cardId).single();expect(task.error).toBeNull();
    const solo=await actor.client.rpc('save_personal_workouts',{p_player_id:playerId,p_tier:'rep',p_days:[{date:new Date().toISOString().slice(0,10),title:'Scoped solo workout',tasks:[{label:'Solo scope drill',task_type:'mobility'}]}]});expect(solo.error).toBeNull();
    const personalCardId=solo.data.card_ids[0];const personalTask=await actor.client.from('personal_practice_tasks').select('id').eq('personal_practice_card_id',personalCardId).single();expect(personalTask.error).toBeNull();
    fixtures.push({teamId,playerId,cardId,taskId:task.data!.id,personalCardId,personalTaskId:personalTask.data!.id});
  }
  const [family,outsider]=actors,[own,foreign]=fixtures;
  try{
    expect((await family.client.from('practice_cards').select('id').eq('id',foreign.cardId)).data).toEqual([]);
    const task=await family.client.from('task_completions').insert({player_id:own.playerId,practice_task_id:foreign.taskId,completed:true,shots_logged:100,completed_by:'parent'}).select('id').maybeSingle();
    if(!task.error && task.data)await family.client.from('task_completions').update({practice_task_id:own.taskId}).eq('id',task.data.id);
    expect(task.error,'An unrelated team task accepted the family’s player completion').toBeTruthy();
    const session=await family.client.from('session_completions').insert({player_id:own.playerId,practice_card_id:foreign.cardId,status:'complete',completed_by:'parent'}).select('id').maybeSingle();
    if(!session.error && session.data)await family.client.from('session_completions').update({practice_card_id:own.cardId}).eq('id',session.data.id);
    expect(session.error,'An unrelated team accepted the family’s session').toBeTruthy();
    const personal=await family.client.from('personal_task_completions').insert({player_id:own.playerId,personal_practice_task_id:foreign.personalTaskId,completed:true}).select('id').maybeSingle();
    if(!personal.error && personal.data)await family.client.from('personal_task_completions').delete().eq('id',personal.data.id);
    expect(personal.error,'Another player’s personal activity accepted a completion').toBeTruthy();
    const personalSession=await family.client.from('personal_session_completions').insert({player_id:own.playerId,personal_practice_card_id:foreign.personalCardId,status:'complete'});expect(personalSession.error).toBeTruthy();
    const photo=await family.client.from('session_photos').insert({player_id:own.playerId,practice_card_id:foreign.cardId,uploaded_by_user_id:family.id,storage_path:`sessions/${foreign.cardId}/${own.playerId}/scope.png`,visibility:'parent_only'}).select('id').maybeSingle();
    if(!photo.error && photo.data)await family.client.from('session_photos').delete().eq('id',photo.data.id);
    expect(photo.error,'An unrelated workout accepted the family’s photo record').toBeTruthy();
    const objectPath=`sessions/${foreign.cardId}/${foreign.playerId}/${randomUUID()}.png`;
    fs.appendFileSync('/tmp/hockey-qa-scope-fixtures.jsonl',JSON.stringify({userId:outsider.id,bucket:'session-photos',objectPath})+'\n');
    expect((await outsider.client.storage.from('session-photos').upload(objectPath,fs.readFileSync('public/favicon.png'),{contentType:'image/png'})).error).toBeNull();
    const privatePhoto=await outsider.client.from('session_photos').insert({player_id:foreign.playerId,practice_card_id:foreign.cardId,uploaded_by_user_id:outsider.id,storage_path:objectPath,visibility:'parent_only'}).select('id').single();expect(privatePhoto.error).toBeNull();
    try{
      expect((await family.client.storage.from('session-photos').createSignedUrl(objectPath,60)).error).toBeTruthy();
      const forged=await family.client.from('session_photos').insert({player_id:own.playerId,practice_card_id:own.cardId,uploaded_by_user_id:family.id,storage_path:objectPath,visibility:'parent_only'}).select('id').maybeSingle();
      if(!forged.error && forged.data){
        const access=await family.client.storage.from('session-photos').createSignedUrl(objectPath,60);
        await family.client.from('session_photos').delete().eq('id',forged.data.id);
        expect(access.error,'A forged record exposed an unrelated family’s image').toBeTruthy();
      }
      expect(forged.error,'A photo record accepted another player’s storage path').toBeTruthy();
    }finally{
      await outsider.client.storage.from('session-photos').remove([objectPath]);await outsider.client.from('session_photos').delete().eq('id',privatePhoto.data!.id);
    }
    const valid=await family.client.from('task_completions').insert({player_id:own.playerId,practice_task_id:own.taskId,completed:true,shots_logged:50,completed_by:'parent'});expect(valid.error).toBeNull();
  }finally{await family.client.auth.signOut({scope:'local'});await outsider.client.auth.signOut({scope:'local'});}
});
