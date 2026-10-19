import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {webcrypto} from 'node:crypto';
const source=ts.transpileModule(fs.readFileSync('supabase/functions/send-transactional-email/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness(options={}){
 let handler;const calls=[],updates=[],logs=[],claims=[];const expires=new Date(Date.now()+86400000).toISOString();
 const rows={team_roles:{role:options.role??'head_coach'},association_roles:{role:'owner'},teams:{name:'Saved Team'},associations:{name:'Saved Association'},team_invites:options.noInvite?null:{id:'saved-invite',token:'saved-token',short_code:'TEAM123',expires_at:expires},association_invites:{id:'association-invite',token:'association-token',role:'viewer',expires_at:expires}};
 function query(table){const q={select(){return q;},eq(){return q;},in(){return q;},order(){return q;},limit(){return q;},update(value){updates.push({table,value});return q;},maybeSingle:async()=>({data:options.denied&&table.endsWith('_roles')?null:rows[table],error:options.readFailure?{message:'private database detail'}:null}),then(resolve,reject){return Promise.resolve({error:options.saveFailure?{message:'save unavailable'}:null}).then(resolve,reject);}};return q;}
 const client={auth:{getUser:async token=>{assert.equal(typeof token,'string');return {data:{user:options.invalidUser||token!=='valid-token'?null:{id:'actor',email:'coach@example.com'}},error:null};}},from:query,rpc:async(name,args)=>{assert.equal(name,'claim_email_delivery');claims.push(args);return {data:{status:options.claimStatus??'ready',id:'prior-id'},error:options.claimFailure?{message:'private db detail'}:null};}};
 vm.runInNewContext(source,{exports:{},require:name=>name.includes('supabase-js')?{createClient:()=>client}:{serve:fn=>handler=fn},Response,Request,URL,TextEncoder,crypto:webcrypto,AbortSignal,console:{log:value=>logs.push(value)},Deno:{env:{get:key=>({SUPABASE_URL:'https://qa.invalid',SUPABASE_ANON_KEY:'anon-key',SUPABASE_SERVICE_ROLE_KEY:'service-key',RESEND_API_KEY:options.unconfigured?undefined:'provider-key'})[key]}},fetch:async(url,init)=>{calls.push({url,init});if(options.timeout)throw new Error('private provider secret');return new Response(JSON.stringify(options.missingId?{}:{id:'message-id',private:'must never log'}),{status:options.providerStatus??200});}});
 return {calls,claims,updates,logs,request:async({headers={Authorization:'Bearer valid-token'},method='POST',body={type:'parent_invitation',to:'  Parent@Example.com ',data:{teamId:'team',inviteLink:'https://evil.example/phish',teamName:'Forged Team'}}}={})=>{const r=await handler(new Request('https://qa.invalid/email',{method,headers,...(method==='GET'?{}:{body:JSON.stringify(body)})}));return {status:r.status,body:await r.json()};}};
}
let checks=0;
async function check(options,status,request){const h=harness(options);const r=await h.request(request);assert.equal(r.status,status,JSON.stringify(r));checks++;return {h,r};}
for(const headers of [{},{Authorization:'Bearer arbitrary'}])await check({},401,{headers});
await check({invalidUser:true},401);await check({},405,{method:'GET'});await check({denied:true},403);await check({role:'parent'},403);await check({readFailure:true},503);await check({unconfigured:true},503);await check({noInvite:true},409);
await check({},403,{body:{type:'coach_welcome',to:'other@example.com',data:{teamId:'team'}}});
await check({},403,{body:{type:'weekly_coach_digest',to:'coach@example.com',data:{}}});
await check({},400,{body:{type:'unknown',to:'coach@example.com'}});
const first=await check({},200);const sent=JSON.parse(first.h.calls[0].init.body);assert.deepEqual(sent.to,['parent@example.com']);assert(sent.html.includes('https://www.hockeyapp.ca/join/saved-token'));assert(!sent.html.includes('evil.example'));assert(!sent.html.includes('Forged Team'));assert(sent.text.includes('https://www.hockeyapp.ca/join/saved-token'));assert(!sent.text.includes('<table'));assert(first.h.calls[0].init.signal);assert.match(first.h.calls[0].init.headers['Idempotency-Key'],/^hockey-[a-f0-9]{64}$/);assert.equal(first.h.updates.at(-1).value.status,'sent');
const repeated=await check({},200);assert.equal(repeated.h.calls[0].init.headers['Idempotency-Key'],first.h.calls[0].init.headers['Idempotency-Key']);
const duplicate=await check({claimStatus:'sent'},200);assert.equal(duplicate.h.calls.length,0);assert.equal(duplicate.r.body.already_sent,true);
for(const status of ['in_progress','rate_limited']){const {h}=await check({claimStatus:status},429);assert.equal(h.calls.length,0);}
await check({claimFailure:true},503);
for(const options of [{providerStatus:503},{providerStatus:429},{timeout:true},{missingId:true}]){const {h}=await check(options,503);assert.equal(h.updates.at(-1).value.status,'failed');assert(!h.logs.join('').includes('must never log'));}
await check({saveFailure:true},503);
const assoc=await check({},200,{body:{type:'association_invitation',to:'viewer@example.com',data:{associationId:'association',inviteLink:'https://evil.example'}}});assert(JSON.parse(assoc.h.calls[0].init.body).html.includes('/association/join/association-token'));
const service=await check({},200,{headers:{Authorization:'Bearer service-key'},body:{type:'weekly_coach_digest',to:'coach@example.com',data:{teamName:'Saved Team',players:[]}}});assert.equal(service.h.claims[0].p_actor,null);
console.log(`PASS: ${checks} transactional delivery authorization, saved invitation, plaintext, duplicate, timeout and failure scenarios; all provider sends mocked.`);
const weeklyRequest=count=>({headers:{Authorization:'Bearer service-key'},body:{type:'player_weekly_progress',to:'parent@example.com',data:{firstName:'MailKid',sessionsCount:count,deliveryKey:'parent:fixture:2026-10-12'}}});
const weeklyFirst=await check({},200,weeklyRequest(1));const weeklyChanged=await check({},200,weeklyRequest(2));assert.equal(weeklyFirst.h.calls[0].init.headers['Idempotency-Key'],weeklyChanged.h.calls[0].init.headers['Idempotency-Key']);
const expired=await check({claimStatus:'expired'},429,weeklyRequest(1));assert.equal(expired.h.calls.length,0);console.log('PASS: weekly delivery keys remain stable when counts change; expired retries cannot send duplicates.');
