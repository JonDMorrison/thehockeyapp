import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {format,startOfWeek} from 'date-fns';
import fs from 'node:fs';

test.use({viewport:{width:390,height:844},timezoneId:'UTC'});
test('a family can generate and reload a factual home summary without AI permission and retry summary outages',async({page})=>{
 test.setTimeout(90000);
 const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});expect((await client.auth.signInWithPassword({email:process.env.TEST_USER_EMAIL!,password:process.env.TEST_USER_PASSWORD!})).error).toBeNull();
 const player=await client.rpc('create_managed_player',{p_first_name:'SummaryPrivacyKid',p_birth_year:2014,p_ai_personalization_allowed:false});expect(player.error).toBeNull();const playerId=player.data.player_id;
 fs.appendFileSync('/tmp/hockey-qa-summary-fixtures.jsonl',JSON.stringify({playerId})+'\n');
 const date=format(new Date(),'yyyy-MM-dd'),weekStart=format(startOfWeek(new Date(),{weekStartsOn:1}),'yyyy-MM-dd');
 const saved=await client.rpc('save_personal_workouts',{p_player_id:playerId,p_tier:'rep',p_days:[{date,title:'Summary home workout',tasks:[{label:'Home shots',task_type:'shooting',shots_expected:75}]}]});expect(saved.error).toBeNull();
 await page.goto(`/players/${playerId}/home`);await page.getByRole('button',{name:'Close welcome',exact:true}).click();
 const generate=page.getByRole('button',{name:'Generate Weekly Summary',exact:true});await expect(generate).toBeVisible();
 await page.route('**/functions/v1/generate-parent-summary-ai',route=>route.fulfill({status:503,json:{error:'Simulated summary outage'}}));await generate.click();await expect(page.getByText('Couldn’t generate the summary. Please try again.',{exact:true})).toBeVisible();
 expect((await client.from('parent_week_summaries').select('id').eq('player_id',playerId)).data).toEqual([]);
 await page.unroute('**/functions/v1/generate-parent-summary-ai');const response=page.waitForResponse(r=>r.url().includes('/functions/v1/generate-parent-summary-ai'));await generate.click();const generated=await response;expect(generated.status()).toBe(200);expect((await generated.json()).ai_personalization_used).toBe(false);
 await expect(page.locator('p:visible').filter({hasText:/SummaryPrivacyKid completed 0 of 1 home workouts this week/})).toBeVisible();await page.reload();await expect(page.locator('p:visible').filter({hasText:/SummaryPrivacyKid completed 0 of 1 home workouts this week/})).toBeVisible();
 expect((await client.from('parent_week_summaries').select('stats').eq('player_id',playerId).eq('week_start',weekStart).single()).data?.stats).toMatchObject({workouts_scheduled:1,workouts_completed:0});
 await page.route('**/rest/v1/parent_week_summaries*',route=>route.fulfill({status:503,json:{message:'Simulated summary read outage'}}));await page.goto(`/parents/${playerId}/summaries`);await expect(page.getByText('Couldn’t load weekly summaries',{exact:true})).toBeVisible({timeout:15000});await page.unroute('**/rest/v1/parent_week_summaries*');await page.getByRole('button',{name:/try again/i}).click();await expect(page.locator('p:visible').filter({hasText:/SummaryPrivacyKid completed 0 of 1 home workouts this week/})).toBeVisible();
 await page.goto(`/players/${playerId}/home`);await page.getByRole('button',{name:'Player options',exact:true}).click();const consent=page.getByRole('switch',{name:'Allow AI training summaries',exact:true});await expect(consent).not.toBeChecked();await consent.click();await expect(consent).toBeChecked();await consent.click();await expect(consent).not.toBeChecked();
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.reload();await page.getByRole('button',{name:'Player options',exact:true}).click();await expect(consent).not.toBeChecked();
 await client.auth.signOut({scope:'local'});
});
