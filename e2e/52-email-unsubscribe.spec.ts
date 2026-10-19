import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';

test.use({storageState:{cookies:[],origins:[]},viewport:{width:320,height:568}});
test('anonymous unsubscribe changes only the selected optional email, validates categories and recovers failures honestly',async({page})=>{
 test.setTimeout(90000);page.setDefaultTimeout(15000);
 const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});const email=`qa-settings-unsubscribe-${Date.now()}@example.com`;const account=await client.auth.signUp({email,password:`QA-${randomUUID()}`});expect(account.error).toBeNull();const userId=account.data.user!.id;
 fs.appendFileSync('/tmp/hockey-qa-settings-fixtures.jsonl',JSON.stringify({email,userId})+'\n');
 const token=randomUUID();expect((await client.from('email_preferences').upsert({user_id:userId,unsubscribe_token:token,team_invites:true,weekly_coach_digest:true,player_weekly_progress:true,product_updates:true})).error).toBeNull();
 const read=async()=>{const r=await client.from('email_preferences').select('team_invites,weekly_coach_digest,player_weekly_progress,product_updates').eq('user_id',userId).single();expect(r.error).toBeNull();return r.data;};
 await page.goto(`/unsubscribe/${token}?kind=product_updates`);await expect(page.getByRole('heading',{name:"You're unsubscribed",exact:true})).toBeVisible();expect(await read()).toEqual({team_invites:true,weekly_coach_digest:true,player_weekly_progress:true,product_updates:false});await page.reload();await expect(page.getByText('Your choice is saved.',{exact:true})).toBeVisible();
 let requests=0;await page.route('**/rest/v1/rpc/unsubscribe_email',route=>{requests++;return route.continue();});await page.goto(`/unsubscribe/${token}?kind=typo`);await expect(page.getByRole('heading',{name:'Link unavailable',exact:true})).toBeVisible();expect(requests).toBe(0);expect((await read()).weekly_coach_digest).toBe(true);await expect(page.getByText('Your choice is saved.',{exact:true})).toHaveCount(0);await page.unroute('**/rest/v1/rpc/unsubscribe_email');
 await page.route('**/rest/v1/rpc/unsubscribe_email',route=>route.fulfill({status:503,json:{message:'QA preference outage'}}));await page.goto(`/unsubscribe/${token}?kind=weekly_coach_digest`);await expect(page.getByRole('heading',{name:'Couldn’t save your choice',exact:true})).toBeVisible();await expect(page.getByText('Your choice is saved.',{exact:true})).toHaveCount(0);expect((await read()).weekly_coach_digest).toBe(true);await page.unroute('**/rest/v1/rpc/unsubscribe_email');await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.getByRole('heading',{name:"You're unsubscribed",exact:true})).toBeVisible();expect(await read()).toEqual({team_invites:true,weekly_coach_digest:false,player_weekly_progress:true,product_updates:false});
 await page.goto(`/unsubscribe/${randomUUID()}?kind=all_optional`);await expect(page.getByRole('heading',{name:'Link unavailable',exact:true})).toBeVisible();expect((await read()).player_weekly_progress).toBe(true);
 await page.goto(`/unsubscribe/${token}`);await expect(page.getByRole('heading',{name:"You're unsubscribed",exact:true})).toBeVisible();expect(await read()).toEqual({team_invites:true,weekly_coach_digest:false,player_weekly_progress:false,product_updates:false});await client.auth.signOut({scope:'local'});
});
