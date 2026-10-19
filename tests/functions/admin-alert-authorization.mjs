import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {webcrypto} from 'node:crypto';
function harness({configured=true,emailed=false,providerStatus=200,markError=false}={}){
 let handler,reads=0,writes=0,calls=[];
 const event={id:'event-id',severity:'urgent',event_type:'qa_event',metadata:{detail:'<script>bad</script>'},created_at:'2026-10-19T00:00:00Z',emailed_at:emailed?'2026-10-19T00:00:00Z':null};
 const query={select(){reads++;return query;},eq(){return query;},is(){return query;},single:async()=>({data:event,error:null}),update(){writes++;return query;},then(resolve,reject){return Promise.resolve({error:markError?{message:'database update unavailable'}:null}).then(resolve,reject);}};
 const js=ts.transpileModule(fs.readFileSync('supabase/functions/send-admin-activity-email/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{exports:{},require:name=>name.includes('supabase-js')?{createClient:()=>({from:()=>query})}:{serve:fn=>{handler=fn;}},Response,Request,crypto:webcrypto,AbortSignal,console:{log(){}},Deno:{env:{get:key=>({SUPABASE_SERVICE_ROLE_KEY:'service-key',HOCKEY_ADMIN_ALERT_SECRET:'private-alert-key',SUPABASE_URL:'https://qa.invalid',RESEND_API_KEY:configured?'qa-email-key':undefined,ADMIN_EMAIL:configured?'qa@example.com':undefined})[key]}},fetch:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({id:'message-id'}),{status:providerStatus});}});
 return {calls,get reads(){return reads;},get writes(){return writes;},request:async(headers={},body={event_id:'event-id'})=>{const response=await handler(new Request('https://qa.invalid/alert',{method:'POST',headers,body:JSON.stringify(body)}));return {status:response.status,body:await response.json()};}};
}
let checks=0;
for(const headers of [{},{Authorization:'Bearer public-key'},{Authorization:'Bearer normal-user'},{'x-admin-alert-secret':'wrong'}]){const h=harness();assert.equal((await h.request(headers)).status,401);assert.equal(h.reads,0);assert.equal(h.writes,0);assert.equal(h.calls.length,0);checks++;}
for(const headers of [{Authorization:'Bearer service-key'},{'x-admin-alert-secret':'private-alert-key'}]){const h=harness();const result=await h.request(headers);assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(h.calls.length,1);assert.equal(h.writes,1);assert.equal(h.calls[0].options.headers['Idempotency-Key'],'admin-activity-event-id');assert(!JSON.parse(h.calls[0].options.body).html.includes('<script>'));checks++;}
const missing=harness({configured:false});assert.equal((await missing.request({'x-admin-alert-secret':'private-alert-key'})).status,503);assert.equal(missing.calls.length,0);assert.equal(missing.writes,0);checks++;
const duplicate=harness({emailed:true});assert.equal((await duplicate.request({'x-admin-alert-secret':'private-alert-key'})).body.already_sent,true);assert.equal(duplicate.calls.length,0);checks++;
const outage=harness({providerStatus:503});assert.equal((await outage.request({'x-admin-alert-secret':'private-alert-key'})).status,500);assert.equal(outage.writes,0);checks++;
const partial=harness({markError:true});assert.equal((await partial.request({'x-admin-alert-secret':'private-alert-key'})).status,500);assert.equal(partial.calls[0].options.headers['Idempotency-Key'],'admin-activity-event-id');checks++;
console.log(`PASS: ${checks} privileged alert authorization, duplicate prevention and failure scenarios; all email delivery mocked.`);
