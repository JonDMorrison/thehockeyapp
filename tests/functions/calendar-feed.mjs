import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function compile(path,dependencies={},extra={}){const exports={};const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(js,{exports,require:name=>dependencies[name],Response,Request,URL,Date,AbortSignal,TextDecoder,console:{log(){},error(){}},...extra});return exports;}
const dispatch=compile('supabase/functions/_shared/calendarDispatch.ts');const feed=compile('supabase/functions/_shared/calendarFeed.ts');const dates=compile('supabase/functions/_shared/calendarDate.ts');let checks=0;
const valid='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:new-event\r\nDTSTART:20261220T180000Z\r\nSUMMARY:Team practice\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
for(const url of ['https://fc.example.com/feed.ics','https://fd.example.com/feed.ics','webcal://calendar.example.com/feed.ics']){assert.equal(feed.isValidICalUrl(url),true);checks++;}
for(const url of ['http://example.com/feed','https://localhost/x','https://10.0.0.1/x','https://0.0.0.0/x','https://[::1]/x','https://[::ffff:127.0.0.1]/x','https://[fd00::1]/x','https://u:secret@example.com/x','https://example.com:444/x']){assert.equal(feed.isValidICalUrl(url),false);checks++;}
assert.equal(await feed.fetchICal('https://example.com/feed',async()=>new Response(valid)),valid);checks++;
for(const text of ['<html>Temporarily unavailable</html>','',valid.replace('END:VCALENDAR','')]){await assert.rejects(feed.fetchICal('https://example.com/feed',async()=>new Response(text)));checks++;}
let cancelled=false;
const stream=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(1024*1024));controller.enqueue(new Uint8Array(1024*1024+1));},cancel(){cancelled=true;}});
await assert.rejects(feed.fetchICal('https://example.com/feed',async()=>new Response(stream)),/too large/);assert(cancelled);checks++;
await assert.rejects(feed.fetchICal('https://example.com/feed',async()=>{throw new Error('private URL https://example.com/secret-token');}),/Could not download/);checks++;
function handler({content=valid,fail='',authorized=true,timezone='America/New_York'}={}){
 let serve,fetches=0;const writes=[];
 const db={auth:{getUser:async token=>({data:{user:token==='user-token'?{id:'actor'}:null}})},rpc:async()=>({data:true,error:null}),from(table){let operation='read',payload,list=false;const query={select(){return query;},order(){return query;},limit(){list=true;return query;},eq(){return query;},in(){return query;},update(value){operation='update';payload=value;return query;},upsert(value){operation='upsert';payload=value;return query;},single(){return query;},maybeSingle(){return query;},then(resolve,reject){
 const events=table==='team_events'||table==='solo_events';const source=table==='team_schedule_sources'||table==='solo_schedule_sources';
 let error=null,data=null;
 if(operation==='read'){if(table==='team_roles'||table==='players')data=authorized?{id:'player',role:'head_coach'}:null;else if(source)data=list?[table==='team_schedule_sources'?{team_id:'team'}:{player_id:'player'}]:{id:'source',ical_url:'https://calendar.example.com/feed.ics',auto_game_day:false,timezone};else if(events){data=[{external_event_id:'old-event'}];if(fail==='read')error={message:'read failed'};}}
 else{writes.push({table,operation,payload});if((fail==='upsert'&&operation==='upsert')||(fail==='cancel'&&events&&operation==='update')||(fail==='status'&&source&&payload.sync_status==='success'))error={message:'write failed'};}
 return Promise.resolve({data,error}).then(resolve,reject);
 }};return query;}};
 compile(process.env.CALENDAR_HANDLER_SOURCE || 'supabase/functions/sync-schedule/index.ts',{'../_shared/calendarFeed.ts':feed,'../_shared/calendarDispatch.ts':dispatch,'../_shared/calendarDate.ts':dates,'https://esm.sh/@supabase/supabase-js@2.39.3':{createClient:()=>db}},{Deno:{env:{get:name=>name==='SUPABASE_SERVICE_ROLE_KEY'?'service-only':name==='HOCKEY_CALENDAR_SYNC_SECRET'?'calendar-private':'qa'},serve:fn=>{serve=fn;}},fetch:async()=>{fetches++;return new Response(JSON.stringify({success:true}),{status:200});}});
 return {writes,get fetches(){return fetches;},async request(action,authorization='Bearer user-token',headers={}){const response=await serve(new Request('https://qa.invalid',{method:'POST',headers:{Authorization:authorization,...headers},body:JSON.stringify({action,team_id:'team',player_id:'player',timezone})}));return {status:response.status,body:await response.json()};}};
}
// The shared helper's default fetch belongs to its own VM; explicitly bind each handler's provider.
const originalFetch=feed.fetchICal;
for(const mode of ['sync','sync_solo'])for(const failure of ['', 'html','incomplete','read','upsert','cancel','status','unauthorized']){
 const content=failure==='html'?'<html>provider error</html>':failure==='incomplete'?valid.replace('UID:new-event\r\n',''):valid;
 feed.fetchICal=(url)=>originalFetch(url,async()=>new Response(content));
 const h=handler({content,fail:failure,authorized:failure!=='unauthorized'});const result=await h.request(mode);
 if(!failure){assert.equal(result.status,200);assert.equal(result.body.synced_events,1);assert.equal(result.body.removed_events,1);}
 else{assert.equal(result.body.success,false,'Failed calendar input or writes were reported successful');assert(result.status>=400);if(['html','incomplete','read','upsert','unauthorized'].includes(failure))assert(!h.writes.some(w=>(w.table==='team_events'||w.table==='solo_events')&&w.operation==='update'),'Failed input/write must not cancel existing events');assert(!h.writes.some(w=>w.payload.sync_status==='success')||failure==='status');}
 checks++;
}
feed.fetchICal=originalFetch;
for(const mode of ['sync','sync_solo']){
 const h=handler({timezone:'America/New_York'});feed.fetchICal=async()=>valid.replace('T180000Z','T180000');const result=await h.request(mode);assert.equal(result.status,200);assert.equal(h.writes.find(w=>w.operation==='upsert').payload[0].start_time,'2026-12-20T23:00:00.000Z');checks++;
}
for(const authorization of ['', 'Bearer invalid']){const h=handler();assert.equal((await h.request('sync',authorization)).status,401);assert.equal(h.writes.length,0);checks++;}
feed.fetchICal=originalFetch;
const cron=handler();const dispatched=await cron.request('sync_all','Bearer public-anon',{'x-hockey-calendar-secret':'calendar-private'});assert.equal(dispatched.status,200);assert.equal(dispatched.body.total,2);assert.equal(dispatched.body.synced,2);checks++;
assert.equal((await handler().request('sync_all')).status,403);checks++;
assert.equal((await handler().request('sync_all','Bearer public-anon',{'x-hockey-calendar-secret':'wrong'})).status,401);checks++;
assert.equal((await handler().request('sync','Bearer public-anon',{'x-hockey-calendar-secret':'calendar-private'})).status,403);checks++;
for(const [value,zone,expected] of [
 ['20250715T180000','America/Phoenix','2025-07-16T01:00:00.000Z'],
 ['20250715T180000','PDT','2025-07-16T01:00:00.000Z'],
 ['20250115T180000','America/Toronto','2025-01-15T23:00:00.000Z'],
 ['20250715T180000','Europe/Berlin','2025-07-15T16:00:00.000Z'],
 ['20250309T013000','America/Vancouver','2025-03-09T09:30:00.000Z'],
 ['20250309T033000','America/Vancouver','2025-03-09T10:30:00.000Z'],
 ['20250309T023000','America/Vancouver','2025-03-09T10:30:00.000Z'],
 ['20251102T013000','America/Vancouver','2025-11-02T08:30:00.000Z'],
 ['20250715T180000Z',undefined,'2025-07-15T18:00:00.000Z']
]){assert.equal(dates.parseICalDate(value,zone).toISOString(),expected);checks++;}
for(const value of ['20250230T180000','20250715T250000','not-a-date']){assert.throws(()=>dates.parseICalDate(value,'America/Vancouver'));checks++;}
assert.throws(()=>dates.parseICalDate('20250715T180000','Unknown/Timezone'));checks++;
let active=0,maxActive=0,dispatchCalls=0;
const manyClient={from:table=>{const q={select(){return q;},eq(){return q;},order(){return q;},limit(value){assert.equal(value,12);return q;},then(resolve,reject){return Promise.resolve({data:Array.from({length:12},(_,i)=>table==='team_schedule_sources'?{team_id:`team-${i}`}:{player_id:`player-${i}`}),error:null}).then(resolve,reject);}};return q;}};
const batch=await dispatch.dispatchCalendarSources(manyClient,'https://qa.invalid','test-service',async(url,init)=>{assert.equal(init.headers.Authorization,'Bearer test-service');const number=dispatchCalls++;active++;maxActive=Math.max(maxActive,active);await Promise.resolve();await Promise.resolve();active--;return new Response(JSON.stringify({success:true}),{status:number%5===0?500:200});});assert.equal(maxActive,4);assert.deepEqual(JSON.parse(JSON.stringify(batch)),{success:false,synced:19,failed:5,total:24});checks++;
const failedClient={from(){const q={select(){return q;},eq(){return q;},order(){return q;},limit(){return q;},then(resolve,reject){return Promise.resolve({error:{message:'read failed'}}).then(resolve,reject);}};return q;}};await assert.rejects(dispatch.dispatchCalendarSources(failedClient,'https://qa.invalid','test-service',async()=>{throw new Error('must not fetch');}));checks++;
const falseSuccess=await dispatch.dispatchCalendarSources(manyClient,'https://qa.invalid','test-service',async()=>new Response(JSON.stringify({success:false}),{status:200}));assert.equal(falseSuccess.failed,24);assert.equal(falseSuccess.success,false);checks++;
console.log(`PASS: ${checks} calendar URL, streaming, content validation, role and team/solo save-failure scenarios.`);
