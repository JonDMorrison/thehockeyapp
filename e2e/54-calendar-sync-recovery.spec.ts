import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import fs from 'node:fs';

test.use({viewport:{width:320,height:568},timezoneId:'UTC'});
for(const scope of ['team','solo'] as const)test(`${scope} calendar rejects a non-calendar feed without cancelling saved events and recovers UI reads`,async({page})=>{
 test.skip(scope==='team'&&!process.env.QA_SERVICE_KEYS_FILE,'Imported team events require opt-in service-owned fictional fixture setup.');
 test.setTimeout(120000);page.setDefaultTimeout(15000);
 const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});const signed=await client.auth.signInWithPassword({email:process.env.TEST_USER_EMAIL!,password:process.env.TEST_USER_PASSWORD!});expect(signed.error).toBeNull();const actor=signed.data.user!.id;
 let id:string;
 if(scope==='team'){const result=await client.rpc('create_team_with_owner',{p_name:`Disposable Calendar Sync ${Date.now()}`,p_age_division:'U13',p_level:'rep'});expect(result.error).toBeNull();id=result.data.team_id;fs.appendFileSync('/tmp/hockey-qa-calendar-sync-fixtures.jsonl',JSON.stringify({teamId:id})+'\n');}
 else{const result=await client.rpc('create_solo_player_with_plan',{p_first_name:'CalendarKid',p_birth_year:2014,p_training_focus:['shooting'],p_days_per_week:3});expect(result.error).toBeNull();id=result.data.player_id;fs.appendFileSync('/tmp/hockey-qa-calendar-sync-fixtures.jsonl',JSON.stringify({playerId:id})+'\n');}
 const sourceTable=scope==='team'?'team_schedule_sources':'solo_schedule_sources',eventTable=scope==='team'?'team_events':'solo_events',column=scope==='team'?'team_id':'player_id';
 expect((await client.from(sourceTable).insert({[column]:id,source_type:'teamsnap_ical',ical_url:'https://www.hockeyapp.ca/robots.txt',created_by_user_id:actor,auto_game_day:false,include_practices:true,sync_status:'success',last_synced_at:new Date().toISOString()})).error).toBeNull();
 let fixtureClient=client;
 if(scope==='team'){const keys=JSON.parse(fs.readFileSync(process.env.QA_SERVICE_KEYS_FILE!,'utf8'));const service=keys.find((item:{name:string})=>item.name==='service_role');expect(service?.api_key).toBeTruthy();const owned=await client.from('teams').select('name,created_by_user_id').eq('id',id).single();expect(owned.data?.created_by_user_id).toBe(actor);expect(owned.data?.name).toMatch(/^Disposable Calendar Sync /);fixtureClient=createClient(process.env.VITE_SUPABASE_URL!,service.api_key,{auth:{persistSession:false,autoRefreshToken:false}});}
 expect((await fixtureClient.from(eventTable).insert({[column]:id,source_type:'teamsnap_ical',external_event_id:'retained-calendar-event',event_type:'practice',title:'Keep this practice',start_time:new Date(Date.now()+86400000).toISOString(),is_cancelled:false})).error).toBeNull();
 await page.route(`**/rest/v1/${sourceTable}*`,route=>route.fulfill({status:503,json:{message:'QA calendar read outage'}}));await page.goto(scope==='team'?`/teams/${id}/settings`:`/solo/settings/${id}`);await expect(page.getByText('Couldn’t load your calendar',{exact:true})).toBeVisible({timeout:15000});await page.unroute(`**/rest/v1/${sourceTable}*`);await page.getByRole('button',{name:'Try again',exact:true}).click();
 const response=page.waitForResponse(r=>r.url().includes('/functions/v1/sync-schedule')&&r.request().method()==='POST');await page.getByRole('button',{name:'Sync schedule',exact:true}).click();expect((await response).status()).toBe(500);
 const saved=await client.from(eventTable).select('title,is_cancelled').eq(column,id);expect(saved.error).toBeNull();expect(saved.data).toEqual([{title:'Keep this practice',is_cancelled:false}]);const source=await client.from(sourceTable).select('sync_status,sync_error').eq(column,id).single();expect(source.error).toBeNull();expect(source.data!.sync_status).toBe('error');await expect(page.getByText(source.data!.sync_error!,{exact:true})).toBeVisible();
 if(process.env.CALENDAR_LIVE_HTTPS_FIXTURE_TEST==='1'){
  const ics='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:controlled-practice\r\nDTSTART:20261220T180000\r\nSUMMARY:QA Controlled Practice\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
  const url=`https://httpbingo.org/base64/${Buffer.from(ics).toString('base64url')}?content-type=text%2Fcalendar`;
  expect((await client.from(sourceTable).update({ical_url:url,timezone:'America/New_York'}).eq(column,id)).error).toBeNull();
  const loaded=page.waitForResponse(r=>r.url().includes('/functions/v1/sync-schedule')&&r.request().method()==='POST');await page.getByRole('button',{name:'Sync schedule',exact:true}).click();expect((await loaded).status()).toBe(200);
  const imported=await client.from(eventTable).select('external_event_id,start_time,is_cancelled').eq(column,id).order('external_event_id');expect(imported.error).toBeNull();expect(imported.data).toHaveLength(2);expect(imported.data![0].external_event_id).toBe('controlled-practice');expect(imported.data![0].is_cancelled).toBe(false);expect(new Date(imported.data![0].start_time).toISOString()).toBe('2026-12-20T23:00:00.000Z');expect(imported.data![1].is_cancelled).toBe(true);
  expect((await client.from(sourceTable).update({ical_url:'https://www.hockeyapp.ca/robots.txt'}).eq(column,id)).error).toBeNull();const failed=page.waitForResponse(r=>r.url().includes('/functions/v1/sync-schedule')&&r.request().method()==='POST');await page.getByRole('button',{name:'Sync schedule',exact:true}).click();expect((await failed).status()).toBe(500);expect((await client.from(eventTable).select('is_cancelled').eq(column,id).eq('external_event_id','controlled-practice').single()).data?.is_cancelled).toBe(false);
 }
 const denied=await client.functions.invoke('sync-schedule',{body:{action:'preview',ical_url:'https://127.0.0.1/private'}});expect(denied.error?.context.status).toBe(400);
 if(scope==='team'){
  await page.getByRole('button',{name:'Disconnect',exact:true}).click();await expect(page.getByText('No Schedule Connected',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Connect',exact:true}).click();await page.getByLabel('Calendar subscription link',{exact:true}).fill('https://www.hockeyapp.ca/robots.txt');
  const preview=page.getByRole('button',{name:'Preview',exact:true});for(let attempt=0;attempt<2;attempt++){const result=page.waitForResponse(r=>r.url().includes('/functions/v1/sync-schedule')&&r.request().method()==='POST');await preview.click();expect((await result).status()).toBe(400);await expect(preview).toBeEnabled();}await page.keyboard.press('Escape');
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await client.auth.signOut({scope:'local'});
});
