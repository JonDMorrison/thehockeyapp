import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import fs from 'node:fs';

test.use({viewport:{width:320,height:568},timezoneId:'UTC',reducedMotion:'reduce'});
test('home session earns an opted-in badge exactly once and recovers saved workout and badge reads',async({page})=>{
 test.setTimeout(120000);page.setDefaultTimeout(15000);
 const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
 expect((await client.auth.signInWithPassword({email:process.env.TEST_USER_EMAIL!,password:process.env.TEST_USER_PASSWORD!})).error).toBeNull();
 const created=await client.rpc('create_solo_player_with_plan',{p_first_name:'BadgeAuditKid',p_birth_year:2014,p_training_focus:['shooting'],p_days_per_week:3});expect(created.error).toBeNull();const playerId=created.data.player_id;
 fs.appendFileSync('/tmp/hockey-qa-badge-fixtures.jsonl',JSON.stringify({playerId})+'\n');
 const date=new Date().toISOString().slice(0,10);expect((await client.rpc('save_personal_workouts',{p_player_id:playerId,p_tier:'rep',p_days:[{date,title:'Badge home practice',tasks:[{label:'Home prep',task_type:'prep',is_required:true},{label:'Home mobility',task_type:'mobility',is_required:true}]}]})).error).toBeNull();
 await page.route('**/rest/v1/personal_practice_cards*',route=>route.fulfill({status:503,json:{message:'QA home read outage'}}));await page.goto(`/solo/today/${playerId}`);await expect(page.getByText('Couldn’t load your home workout',{exact:true})).toBeVisible({timeout:15000});await expect(page.getByRole('checkbox')).toHaveCount(0);await page.unroute('**/rest/v1/personal_practice_cards*');await page.getByRole('button',{name:'Try again',exact:true}).click();
 const tasks=page.getByRole('checkbox');await expect(tasks).toHaveCount(2);await tasks.first().press('Space');await expect(tasks.first()).toBeChecked();expect((await client.from('player_badges').select('id').eq('player_id',playerId)).data).toEqual([]);
 expect((await client.from('player_privacy_settings').upsert({player_id:playerId,national_challenges_opt_in:true})).error).toBeNull();await tasks.last().press('Space');await expect(page.getByRole('dialog').getByText('First Practice',{exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 const badges=await client.from('player_badges').select('id').eq('player_id',playerId);expect(badges.data).toHaveLength(1);expect((await client.rpc('evaluate_player_challenges',{p_player_id:playerId})).data.badges_awarded).toBe(0);
 await page.route('**/rest/v1/personal_task_completions*',route=>route.fulfill({status:503,json:{message:'QA completion read outage'}}));await page.reload();await expect(page.getByText('Couldn’t load your home workout',{exact:true})).toBeVisible({timeout:15000});await page.unroute('**/rest/v1/personal_task_completions*');await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(tasks.first()).toBeChecked();await expect(tasks.last()).toBeChecked();
 await page.route('**/rest/v1/player_badges*',route=>route.fulfill({status:503,json:{message:'QA badge read outage'}}));await page.goto(`/solo/badges/${playerId}`);await expect(page.getByText('Couldn’t load your badges',{exact:true})).toBeVisible({timeout:15000});await page.unroute('**/rest/v1/player_badges*');await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.getByText('First Practice',{exact:true})).toBeVisible();expect((await client.from('player_badges').select('id').eq('player_id',playerId)).data).toHaveLength(1);
 await client.auth.signOut({scope:'local'});
});
