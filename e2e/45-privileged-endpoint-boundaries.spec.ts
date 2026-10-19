import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import fs from 'node:fs';

test('ordinary accounts and anonymous callers cannot trigger privileged operations',async()=>{
 test.setTimeout(90000);
 const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
 const login=await client.auth.signInWithPassword({email:process.env.TEST_USER_EMAIL!,password:process.env.TEST_USER_PASSWORD!});expect(login.error).toBeNull();
 const base=process.env.VITE_SUPABASE_URL!+'/functions/v1/';
 // Native fetch keeps authorization headers out of Playwright's failed-request diagnostics.
 const post=async(url:string,options:{headers?:Record<string,string>;data:unknown})=>{
  try{const result=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...options.headers},body:JSON.stringify(options.data),signal:AbortSignal.timeout(15000)});return {status:()=>result.status,text:()=>result.text(),json:()=>result.json()};}
  catch{throw new Error(`Privileged endpoint did not respond: ${new URL(url).pathname}`);}
 };

 for(const name of ['check-notifications','compute-team-adoption-milestones','generate-parent-weekly-summaries','send-admin-daily-digest','send-parent-weekly-email','weekly-digest-cron','player-weekly-progress-cron','grant-comp','revoke-comp','comp-user','send-admin-activity-email']){
  const response=await post(base+name,{headers:{Authorization:'Bearer '+login.data.session!.access_token,apikey:process.env.VITE_SUPABASE_PUBLISHABLE_KEY!},data:{}});
  expect([401,403],`${name} returned ${response.status()}: ${await response.text()}`).toContain(response.status());
 }
 for(const headers of [{},{'x-admin-alert-secret':'incorrect-dispatch-key'}])expect((await post(base+'send-admin-activity-email',{headers,data:{}})).status()).toBe(401);
 const path='/tmp/hockey-admin-alert.env';
 if(fs.existsSync(path)){
  const secret=fs.readFileSync(path,'utf8').trim().split('=')[1];
  const valid=await post(base+'send-admin-activity-email',{headers:{'x-admin-alert-secret':secret},data:{}});expect(valid.status()).toBe(400);expect(await valid.json()).toEqual({error:'event_id required'});
 }
 const deniedDispatch=await client.rpc('dispatch_calendar_sync' as never);expect(deniedDispatch.error).toBeTruthy();
 for(const extraHeaders of [{},{'x-hockey-calendar-secret':'incorrect-dispatch-key'}]){
  const response=await post(base+'sync-schedule',{headers:{Authorization:'Bearer '+login.data.session!.access_token,apikey:process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,...extraHeaders},data:{action:'sync_all'}});expect(response.status()).toBe(403);
 }
 const calendarSecretPath='/tmp/hockey-calendar-sync.env';
 if(fs.existsSync(calendarSecretPath)){
  const secret=fs.readFileSync(calendarSecretPath,'utf8').trim().split('=')[1];
  const forbiddenAction=await post(base+'sync-schedule',{headers:{Authorization:'Bearer '+login.data.session!.access_token,apikey:process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,'x-hockey-calendar-secret':secret},data:{action:'preview',ical_url:'https://www.hockeyapp.ca/robots.txt'}});expect(forbiddenAction.status()).toBe(403);
 }
 await client.auth.signOut({scope:'local'});
});
