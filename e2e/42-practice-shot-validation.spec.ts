import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

test.use({ viewport: { width: 390, height: 844 }, timezoneId: 'UTC' });
test('practice shots reject negative, fractional, scientific and oversized values, persist valid shots and allow zero', async ({ page }) => {
  test.setTimeout(90000); page.setDefaultTimeout(10000);
  const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
  expect((await client.auth.signInWithPassword({email:process.env.TEST_USER_EMAIL!,password:process.env.TEST_USER_PASSWORD!})).error).toBeNull();
  const team=await client.rpc('create_team_with_owner',{p_name:`Disposable Workout Edit ${Date.now()}`,p_age_division:'U13',p_level:'rep'});expect(team.error).toBeNull();
  const player=await client.rpc('create_managed_player',{p_first_name:'WorkoutEditKid',p_birth_year:2014});expect(player.error).toBeNull();
  const teamId=team.data.team_id,playerId=player.data.player_id,cardId=randomUUID();
  fs.appendFileSync('/tmp/hockey-qa-workout-fixtures.jsonl',JSON.stringify({teamId,playerId,cardId})+'\n');
  expect((await client.rpc('add_my_player_to_team',{p_team_id:teamId,p_player_id:playerId})).error).toBeNull();
  expect((await client.rpc('save_team_practice_card',{p_id:cardId,p_team_id:teamId,p_date:new Date().toISOString().slice(0,10),p_tier:'rep',p_title:'Original edit workout',p_notes:'Keep team notes',p_publish:true,p_tasks:[{label:'Original wrist shots',task_type:'shooting',target_type:'none',shot_type:'wrist',shots_expected:50,is_required:true,coach_notes:'Hands out front',video_url:'https://youtu.be/dQw4w9WgXcQ'}]})).error).toBeNull();
  const task=await client.from('practice_tasks').select('id').eq('practice_card_id',cardId).single();expect(task.error).toBeNull();
  await page.goto(`/players/${playerId}/today`);await page.getByRole('button',{name:'0 shots',exact:true}).click();
  for(const invalid of ['-1','2.5','10001','1e3']){
    await page.getByLabel('Shot count',{exact:true}).fill(invalid);await page.getByRole('button',{name:'Save',exact:true}).click();
    await expect(page.getByRole('alert').filter({hasText:'Enter a whole number'})).toBeVisible();
    expect((await client.from('task_completions').select('id').eq('player_id',playerId)).data).toEqual([]);
  }
  await page.getByLabel('Shot count',{exact:true}).fill('75');await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect.poll(async()=>(await client.from('task_completions').select('shots_logged').eq('player_id',playerId)).data).toEqual([{shots_logged:75}]);
  await page.reload();await page.getByRole('button',{name:'75 shots',exact:true}).click();await page.getByLabel('Shot count',{exact:true}).fill('0');await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect.poll(async()=>(await client.from('task_completions').select('shots_logged').eq('player_id',playerId)).data).toEqual([{shots_logged:0}]);
  for(const invalid of [-1,10001])expect((await client.from('task_completions').update({shots_logged:invalid}).eq('player_id',playerId)).error).toBeTruthy();
  expect((await client.from('task_completions').select('shots_logged').eq('player_id',playerId)).data).toEqual([{shots_logged:0}]);
  await client.auth.signOut({scope:'local'});
});
