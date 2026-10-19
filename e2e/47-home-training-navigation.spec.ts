import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import fs from 'node:fs';

test.use({viewport:{width:320,height:568},timezoneId:'UTC'});
test('a family without a team can move from welcome through today, week and history',async({page})=>{
 test.setTimeout(90000);
 const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});expect((await client.auth.signInWithPassword({email:process.env.TEST_USER_EMAIL!,password:process.env.TEST_USER_PASSWORD!})).error).toBeNull();
 const player=await client.rpc('create_managed_player',{p_first_name:'HomeNavKid',p_birth_year:2014});expect(player.error).toBeNull();const playerId=player.data.player_id;fs.appendFileSync('/tmp/hockey-qa-family-nav-fixtures.jsonl',JSON.stringify({playerId})+'\n');
 expect((await client.rpc('save_personal_workouts',{p_player_id:playerId,p_tier:'rep',p_days:[{date:new Date().toISOString().slice(0,10),title:'Home navigation workout',tasks:[{label:'Home navigation shots',task_type:'shooting',shots_expected:50}]}]})).error).toBeNull();
 await page.goto(`/players/${playerId}/home`);await page.getByRole('button',{name:"Start Today's Training",exact:true}).click();await expect(page).toHaveURL(new RegExp(`/solo/today/${playerId}$`));await expect(page.getByText('Home navigation shots',{exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Week',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/solo/dashboard/${playerId}$`));await page.getByRole('link',{name:'History',exact:true}).click();await expect(page.getByText('Home navigation workout',{exact:true})).toBeVisible();
 await page.goto(`/players/${playerId}/week`);await expect(page).toHaveURL(new RegExp(`/solo/dashboard/${playerId}$`));
 await page.route('**/rest/v1/player_team_preferences*',route=>route.fulfill({status:503,json:{message:'Simulated preference read outage'}}));await page.goto(`/players/${playerId}/today`);await expect(page.getByText('Couldn’t load your workout',{exact:true})).toBeVisible({timeout:15000});await expect(page).toHaveURL(new RegExp(`/players/${playerId}/today$`));await page.unroute('**/rest/v1/player_team_preferences*');await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/solo/today/${playerId}$`));
 await page.getByRole('link',{name:'Home',exact:true}).click();await expect(page).toHaveURL(new RegExp(`/players/${playerId}/home$`));await expect(page.getByText('Your coach will add workouts soon!',{exact:true})).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);await client.auth.signOut({scope:'local'});
});
