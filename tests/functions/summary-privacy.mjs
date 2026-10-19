import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {webcrypto} from 'node:crypto';

const own='00000000-0000-4000-8000-000000000001',kid='00000000-0000-4000-8000-000000000002',other='00000000-0000-4000-8000-000000000003';
function fixture(){return {
 players:[{id:kid,first_name:'SecretChildName',owner_user_id:own}],
 player_guardians:[{player_id:kid,user_id:own}],
 player_consents:[{player_id:kid,guardian_user_id:own,relationship_confirmed:true,ai_personalization_allowed:false,withdrawn_at:null}],
 practice_cards:[{id:'owncard',created_by_user_id:own,program_source:'parent',date:'2026-10-12'},{id:'foreigncard',created_by_user_id:other,program_source:'parent',date:'2026-10-12'},{id:'oldcard',created_by_user_id:own,program_source:'parent',date:'2026-10-05'}],
 session_completions:[{id:'a',player_id:kid,practice_card_id:'owncard',program_source:'parent',status:'complete',completed_at:'2026-10-12T10:00:00Z'},{id:'b',player_id:kid,practice_card_id:'oldcard',program_source:'parent',status:'complete',completed_at:'2026-10-05T10:00:00Z'}],
 task_completions:[{player_id:kid,completed:true,shots_logged:75,practice_tasks:{practice_card_id:'owncard',task_type:'shooting'}}],
 personal_practice_cards:[],personal_task_completions:[],personal_session_completions:[],personal_training_plans:[],parent_week_summaries:[],parent_weekly_summaries:[],parent_weekly_summary_metrics:[],team_roles:[{team_id:'team',user_id:own,role:'head_coach'}],team_memberships:[{team_id:'team',player_id:kid,status:'active',players:{id:kid,first_name:'SecretChildName'}}],
};}
function database(tables){return {auth:{getClaims:async()=>({data:{claims:{sub:own}}}),getUser:async()=>({data:{user:{id:own}}})},rpc:async(name)=>({data:name==='has_full_access'?true:name==='get_parents_eligible_for_weekly_summary'?[{user_id:own}]:[]}),from(table){let filters=[],options={},mode='read',payload;const value=(r,k)=>k.split('.').reduce((a,b)=>a?.[b],r);const q={select(_fields,opts={}){options=opts;return q;},eq(k,v){filters.push(r=>value(r,k)===v);return q;},is(k,v){filters.push(r=>value(r,k)===v);return q;},in(k,v){filters.push(r=>v.includes(value(r,k)));return q;},gte(k,v){filters.push(r=>value(r,k)>=v);return q;},lte(k,v){filters.push(r=>value(r,k)<=v);return q;},lt(k,v){filters.push(r=>value(r,k)<v);return q;},not(k,_op,v){filters.push(r=>value(r,k)!==v);return q;},upsert(p){mode='write';payload=p;return q;},insert(p){mode='write';payload=p;return q;},update(p){mode='update';payload=p;return q;},single(){return q.then(r=>({...r,data:r.data?.[0]??null}));},maybeSingle(){return q.single();},then(resolve,reject){try{tables[table]??=[];let rows=tables[table].filter(r=>filters.every(f=>f(r)));if(mode==='write'){tables[table].push(payload);rows=[payload];}if(mode==='update')rows.forEach(r=>Object.assign(r,payload));return Promise.resolve({data:options.head?null:structuredClone(rows),count:rows.length,error:null}).then(resolve,reject);}catch(e){return Promise.reject(e).then(resolve,reject);}}};return q;}};}
function loadFunction(name,tables,{key='test-key',providerFails=false}={}){
 let handler,calls=[];const db=database(tables);
 const context={console:{log(){},error(){}},Response,Request,Date,Set,Map,JSON,crypto:webcrypto,AbortSignal,Deno:{env:{get:n=>n==='LOVABLE_API_KEY'?key:n==='SUPABASE_SERVICE_ROLE_KEY'?'service':n==='SUPABASE_URL'?'https://qa.invalid':'anon'}},fetch:async(url,opts)=>{calls.push({url,body:JSON.parse(opts.body)});return new Response(JSON.stringify(providerFails?{error:'unavailable'}:{choices:[{message:{content:'A calm weekly reflection.'}}]}),{status:providerFails?503:200});}};
 function compile(path,dependencies={}){const exports={};const js=ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;vm.runInNewContext(js,{...context,exports,require:n=>{if(n in dependencies)return dependencies[n];if(n.includes('std@'))return {serve:fn=>{handler=fn;}};if(n.includes('supabase-js'))return {createClient:()=>db};throw new Error('Unexpected import '+n);}});return exports;}
 const privacy=compile('supabase/functions/_shared/summaryPrivacy.ts');compile(`supabase/functions/${name}/index.ts`,{'../_shared/summaryPrivacy.ts':privacy});
 return {calls,db,privacy,request:async (body,authorization='qa-token')=>{const response=await handler(new Request('https://qa.invalid/function',{method:'POST',headers:{Authorization:`Bearer ${authorization}`,'Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()};}};
}
let checks=0;
for(const consent of [false,true]){
 const tables=fixture();tables.player_consents[0].ai_personalization_allowed=consent;const fn=loadFunction('generate-parent-summary-ai',tables);
 const response=await fn.request({player_id:kid,week_start:'2026-10-12'});assert.equal(response.status,200);assert.equal(fn.calls.length,consent?1:0);
 const summary=tables.parent_week_summaries[0];assert.equal(summary.stats.workouts_scheduled,1);assert.equal(summary.stats.workouts_completed,1);assert.equal(summary.stats.total_shots_logged,75);
 assert(!JSON.stringify(fn.calls).includes('SecretChildName'));checks++;
}
for(const state of ['withdrawn','removed-guardian','unconfirmed','missing-consent']){
 const tables=fixture();tables.player_consents[0].ai_personalization_allowed=true;
 if(state==='withdrawn')tables.player_consents[0].withdrawn_at='2026-10-12T00:00:00Z';if(state==='removed-guardian')tables.player_guardians=[];if(state==='unconfirmed')tables.player_consents[0].relationship_confirmed=false;if(state==='missing-consent')tables.player_consents=[];
 const fn=loadFunction('generate-parent-summary-ai',tables);assert.equal((await fn.request({player_id:kid,week_start:'2026-10-12'})).status,200);assert.equal(fn.calls.length,0);checks++;
}
for(const date of ['2026-02-30','garbage','2026-13-01']){const fn=loadFunction('generate-parent-summary-ai',fixture());assert.equal((await fn.request({player_id:kid,week_start:date})).status,400);assert.equal(fn.calls.length,0);checks++;}
for(const opts of [{key:''},{providerFails:true}]){const tables=fixture();tables.player_consents[0].ai_personalization_allowed=true;const fn=loadFunction('generate-parent-summary-ai',tables,opts);assert.equal((await fn.request({player_id:kid,week_start:'2026-10-12'})).status,200);assert.match(tables.parent_week_summaries[0].summary_text,/1 of 1 home workouts/);checks++;}
for(const consent of [false,true]){
 const tables=fixture();tables.player_consents[0].ai_personalization_allowed=consent;
 tables.practice_cards.push({id:'teamcard',team_id:'team',program_source:'team',date:'2026-10-12',published_at:'2026-10-12T00:00:00Z'});
 const fn=loadFunction('generate-summaries-ai',tables);const response=await fn.request({team_id:'team',week_start:'2026-10-12'});assert.equal(response.status,200);assert.equal(fn.calls.length,consent?2:0);assert(!JSON.stringify(fn.calls).includes('SecretChildName'));checks++;
}
for(const consent of [false,true]){
 const tables=fixture();tables.player_consents[0].ai_personalization_allowed=consent;const fn=loadFunction('generate-parent-weekly-summaries',tables);
 assert.equal((await fn.request({week_start:'2026-10-12'})).status,401);assert.equal(fn.calls.length,0);
 const response=await fn.request({week_start:'2026-10-12'},'service');assert.equal(response.status,200);assert.equal(response.body.processed,1);assert.equal(fn.calls.length,consent?1:0);
 assert.equal(tables.parent_weekly_summaries[0].total_workouts,1);assert.equal(tables.parent_weekly_summaries[0].total_shots,75);assert.equal(tables.parent_weekly_summaries[0].longest_streak,1);checks++;
}
console.log(`PASS: ${checks} real summary-handler privacy, date, scope and provider-fallback scenarios.`);
