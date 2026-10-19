import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import fs from 'node:fs';
test.use({storageState:{cookies:[],origins:[]},viewport:{width:320,height:568},screenshot:'off',trace:'off',video:'off'});
for(const role of ['coach','parent'])test(`${role} explicitly chooses weekly email on mobile and a failed save stays off`,async({page})=>{
 test.skip(!process.env.EMAIL_TEST_FIXTURE_FILE,'Uses only an explicitly supplied disposable fixture.');test.setTimeout(60000);
 const f=JSON.parse(fs.readFileSync(process.env.EMAIL_TEST_FIXTURE_FILE!,'utf8'));const user=f.users.find((u:{role:string})=>u.role===role);const key=JSON.parse(fs.readFileSync(process.env.RECOVERY_TEST_KEY_FILE!,'utf8')).find((r:{name:string})=>r.name==='service_role').api_key;
 const admin=createClient(process.env.VITE_SUPABASE_URL!,key,{auth:{persistSession:false}});const flag=role==='coach'?'weekly_coach_digest':'player_weekly_progress';const timestamp=role==='coach'?'coach_digest_confirmed_at':'player_progress_confirmed_at';
 expect((await admin.from('email_preferences').upsert({user_id:user.id,[flag]:false,[timestamp]:null},{onConflict:'user_id'})).error).toBeNull();
 await page.goto('/auth?mode=signin');await page.getByLabel(/^Email/).fill(user.email);await page.getByLabel(/^Password/).fill(user.password);await page.getByRole('button',{name:/^sign in$/i}).click();await expect(page).not.toHaveURL(/\/auth/);await page.goto('/settings');const toggle=page.getByRole('switch',{name:role==='coach'?'Coach weekly digest':'Player weekly progress',exact:true});await expect(toggle).toBeEnabled();await expect(toggle).not.toBeChecked();
 let blocked=false;await page.route('**/rest/v1/email_preferences*',async route=>{if(route.request().method()==='POST'&&!blocked){blocked=true;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Temporary test outage'})});}else await route.continue();});
 await toggle.click();await expect(page.getByText('Could not save email preference',{exact:true})).toBeVisible();await expect(toggle).not.toBeChecked();await toggle.click();await expect(toggle).toBeChecked();await page.reload();await expect(toggle).toBeChecked();
 const saved=await admin.from('email_preferences').select(`${flag},${timestamp}`).eq('user_id',user.id).single();expect(saved.error).toBeNull();expect(saved.data?.[flag]).toBe(true);expect(Boolean(saved.data?.[timestamp])).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
