import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

test.use({ viewport: { width: 390, height: 844 }, timezoneId: 'UTC' });
test('solo workout creation, completion, undo, and replacement preserve recorded work', async ({ page }) => {
  test.setTimeout(90000);
  const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
  expect((await client.auth.signInWithPassword({email:process.env.TEST_USER_EMAIL!,password:process.env.TEST_USER_PASSWORD!})).error).toBeNull();
  const player=await client.rpc('create_solo_player_with_plan',{p_first_name:'SoloLifecycleKid',p_birth_year:2014,p_training_focus:['shooting'],p_days_per_week:3});expect(player.error).toBeNull();
  const playerId=player.data.player_id;fs.appendFileSync('/tmp/hockey-qa-workout-fixtures.jsonl',JSON.stringify({playerId})+'\n');
  await page.goto(`/solo/today/${playerId}`);
  const quick=page.getByRole('button',{name:/Quick Skills/});await expect(quick).toBeVisible();
  await page.route('**/rest/v1/rpc/save_personal_workouts',route=>route.fulfill({status:503,json:{message:'Simulated solo creation failure'}}));
  await quick.click();await expect(page.getByText('Simulated solo creation failure',{exact:true})).toBeVisible();
  expect((await client.from('personal_practice_cards').select('id').eq('player_id',playerId)).data).toEqual([]);
  await page.unroute('**/rest/v1/rpc/save_personal_workouts');await quick.click();
  const tasks=page.getByRole('checkbox');await expect(tasks).toHaveCount(3);const count=await tasks.count();
  await page.route('**/rest/v1/rpc/set_personal_task_completion',route=>route.fulfill({status:503,json:{message:'Simulated solo completion failure'}}));
  await tasks.first().press('Space');await expect(page.getByText('Simulated solo completion failure',{exact:true})).toBeVisible();await expect(tasks.first()).not.toBeChecked();
  expect((await client.from('personal_task_completions').select('id').eq('player_id',playerId)).data).toEqual([]);
  await page.unroute('**/rest/v1/rpc/set_personal_task_completion');
  for(let index=0;index<count;index++){await expect(tasks.nth(index)).toBeEnabled();await tasks.nth(index).press('Space');await expect(tasks.nth(index)).toBeChecked();}
  await expect.poll(async()=>(await client.from('personal_session_completions').select('status').eq('player_id',playerId)).data).toEqual([{status:'complete'}]);
  await page.reload();await expect(tasks.first()).toBeChecked();await tasks.first().press('Space');await expect(tasks.first()).not.toBeChecked();
  await expect.poll(async()=>(await client.from('personal_session_completions').select('status,completed_at').eq('player_id',playerId)).data).toEqual([{status:'partial',completed_at:null}]);
  const before=await client.from('personal_practice_tasks').select('id,label,personal_practice_cards!inner(player_id)').eq('personal_practice_cards.player_id',playerId);expect(before.error).toBeNull();
  await page.getByRole('button',{name:'Change',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:/Recovery/}).click();
  await expect(page.getByText(/has player progress.*choose another date/i)).toBeVisible();
  expect((await client.from('personal_practice_tasks').select('id,label,personal_practice_cards!inner(player_id)').eq('personal_practice_cards.player_id',playerId)).data).toEqual(before.data);
  await page.keyboard.press('Escape');await page.reload();await expect(tasks).toHaveCount(3);
  await client.auth.signOut({scope:'local'});
});

test('solo week saves all days together and can retry without duplicate workouts', async ({ page }) => {
  const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
  expect((await client.auth.signInWithPassword({email:process.env.TEST_USER_EMAIL!,password:process.env.TEST_USER_PASSWORD!})).error).toBeNull();
  const player=await client.rpc('create_solo_player_with_plan',{p_first_name:'SoloWeekAuditKid',p_birth_year:2014,p_training_focus:['shooting'],p_days_per_week:3});expect(player.error).toBeNull();
  const playerId=player.data.player_id;fs.appendFileSync('/tmp/hockey-qa-workout-fixtures.jsonl',JSON.stringify({playerId})+'\n');
  await page.goto(`/solo/week-planner/${playerId}`);await page.getByRole('button',{name:/Shooting Focus/}).click();
  await page.route('**/rest/v1/rpc/save_personal_workouts',route=>route.fulfill({status:503,json:{message:'Simulated week save failure'}}));
  await page.getByRole('button',{name:'Save Week Plan',exact:true}).click();await expect(page.getByText('Simulated week save failure',{exact:true})).toBeVisible();
  expect((await client.from('personal_practice_cards').select('id').eq('player_id',playerId)).data).toEqual([]);
  await page.unroute('**/rest/v1/rpc/save_personal_workouts');await page.getByRole('button',{name:'Save Week Plan',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/solo/dashboard/${playerId}$`));
  const cards=await client.from('personal_practice_cards').select('id,date,personal_practice_tasks(id)').eq('player_id',playerId);expect(cards.error).toBeNull();expect(cards.data).toHaveLength(5);expect(cards.data!.every(card=>card.personal_practice_tasks.length>0)).toBe(true);
  await page.goto(`/solo/week-planner/${playerId}`);await page.getByRole('button',{name:/Shooting Focus/}).click();await page.getByRole('button',{name:'Save Week Plan',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/solo/dashboard/${playerId}$`));
  const after=await client.from('personal_practice_cards').select('id').eq('player_id',playerId);expect(after.data?.map(card=>card.id).sort()).toEqual(cards.data?.map(card=>card.id).sort());
  await client.auth.signOut({scope:'local'});
});
