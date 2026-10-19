import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

test.use({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Vancouver' });
test('a successful team save with a lost response can retry without making a duplicate', async ({ page }) => {
  const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
  expect((await client.auth.signInWithPassword({email:process.env.TEST_USER_EMAIL!,password:process.env.TEST_USER_PASSWORD!})).error).toBeNull();
  const team=await client.rpc('create_team_with_owner',{p_name:`Disposable Save Retry ${Date.now()}`,p_age_division:'U13',p_level:'rep'});expect(team.error).toBeNull();
  const teamId=team.data.team_id;fs.appendFileSync('/tmp/hockey-qa-workout-fixtures.jsonl',JSON.stringify({teamId})+'\n');
  const date=new Date(Date.now()+2*86400000).toISOString().slice(0,10);await page.goto(`/teams/${teamId}/practice/new?date=${date}`);
  await page.getByLabel('Title (optional)',{exact:true}).fill('Lost response workout');await page.getByRole('button',{name:/add task/i,exact:true}).click();await page.getByLabel('Activity 1 name',{exact:true}).fill('Retry-safe drill');
  let savedId='';
  await page.route('**/rest/v1/rpc/save_team_practice_card',async route=>{savedId=route.request().postDataJSON().p_id;const response=await route.fetch();expect(response.ok()).toBe(true);await route.fulfill({status:503,json:{message:'Connection lost after saving'}});});
  await page.getByRole('button',{name:/save draft/i,exact:true}).click();await expect(page.getByText('Connection lost after saving',{exact:true})).toBeVisible();
  await page.unroute('**/rest/v1/rpc/save_team_practice_card');await page.getByRole('button',{name:/save draft/i,exact:true}).click();await expect(page).toHaveURL(new RegExp(`/teams/${teamId}/practice$`));
  expect((await client.from('practice_cards').select('id,date,practice_tasks(label)').eq('team_id',teamId)).data).toEqual([{id:savedId,date,practice_tasks:[{label:'Retry-safe drill'}]}]);
  await client.auth.signOut({scope:'local'});
});

test('solo custom workout respects the selected calendar date west of UTC', async ({ page }) => {
  const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
  expect((await client.auth.signInWithPassword({email:process.env.TEST_USER_EMAIL!,password:process.env.TEST_USER_PASSWORD!})).error).toBeNull();
  const player=await client.rpc('create_solo_player_with_plan',{p_first_name:'SoloCalendarKid',p_birth_year:2014,p_training_focus:['shooting'],p_days_per_week:3});expect(player.error).toBeNull();
  const playerId=player.data.player_id;fs.appendFileSync('/tmp/hockey-qa-workout-fixtures.jsonl',JSON.stringify({playerId})+'\n');
  const date=new Date(Date.now()+2*86400000).toISOString().slice(0,10);await page.goto(`/solo/workout/${playerId}?date=${date}`);await page.getByRole('button',{name:/Quick Skills/}).click();await page.getByRole('button',{name:'Save Workout',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/solo/dashboard/${playerId}$`));
  expect((await client.from('personal_practice_cards').select('date,personal_practice_tasks(id)').eq('player_id',playerId)).data).toEqual([{date,personal_practice_tasks:expect.any(Array)}]);
  await client.auth.signOut({scope:'local'});
});
