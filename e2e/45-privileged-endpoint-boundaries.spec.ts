import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import fs from 'node:fs';

test('ordinary accounts and anonymous callers cannot trigger privileged operations',async({request})=>{
 const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
 const login=await client.auth.signInWithPassword({email:process.env.TEST_USER_EMAIL!,password:process.env.TEST_USER_PASSWORD!});expect(login.error).toBeNull();
 const base=process.env.VITE_SUPABASE_URL!+'/functions/v1/';
 for(const name of ['check-notifications','compute-team-adoption-milestones','generate-parent-weekly-summaries','send-admin-daily-digest','send-parent-weekly-email','weekly-digest-cron','player-weekly-progress-cron','grant-comp','revoke-comp','comp-user','send-admin-activity-email']){
  const response=await request.post(base+name,{headers:{Authorization:'Bearer '+login.data.session!.access_token,apikey:process.env.VITE_SUPABASE_PUBLISHABLE_KEY!},data:{}});
  expect([401,403],`${name} returned ${response.status()}: ${await response.text()}`).toContain(response.status());
 }
 for(const headers of [{},{'x-admin-alert-secret':'incorrect-dispatch-key'}])expect((await request.post(base+'send-admin-activity-email',{headers,data:{}})).status()).toBe(401);
 const path='/tmp/hockey-admin-alert.env';
 if(fs.existsSync(path)){
  const secret=fs.readFileSync(path,'utf8').trim().split('=')[1];
  const valid=await request.post(base+'send-admin-activity-email',{headers:{'x-admin-alert-secret':secret},data:{}});expect(valid.status()).toBe(400);expect(await valid.json()).toEqual({error:'event_id required'});
 }
 await client.auth.signOut({scope:'local'});
});
