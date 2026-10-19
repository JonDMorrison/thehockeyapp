import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { chromium, firefox, webkit } from '@playwright/test';
import emailDesign from './email-module.cjs';
const output=process.env.EMAIL_PREVIEW_DIR || '/tmp/hockey-email-previews';fs.mkdirSync(output,{recursive:true});
let source=fs.readFileSync('supabase/functions/send-transactional-email/index.ts','utf8').split('// ── Main handler')[0];
source+='\nexports.builders = {buildCoachWelcome,buildStaffInvitation,buildParentInvitation,buildAssociationInvitation,buildWeeklyCoachDigest,buildPlayerWeeklyProgress};';
const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:()=>emailDesign});
const b=exports.builders;
const staffSubject=b.buildStaffInvitation({teamName:"Bob's & Bears",inviteLink:'https://www.hockeyapp.ca/team/adult/join/staff-token',expiresAt:'2026-11-02T12:00:00Z'});
assert.equal(staffSubject.subject,"Join Bob's & Bears’s coaching workspace");assert(staffSubject.html.includes('Bob&#39;s &amp; Bears'));assert(staffSubject.html.includes('2026'));assert(!staffSubject.html.includes('expires in 14 days'));

const cases={staff:b.buildStaffInvitation({teamName:'North Shore Hawks',inviteLink:'https://www.hockeyapp.ca/team/adult/join/fixture-staff-token'}).html,welcome:b.buildCoachWelcome({coachName:'Alex',teamName:'North Shore Hawks',teamCode:'HAWKS7'}).html,invitation:b.buildParentInvitation({coachName:'Coach Alex',playerName:'Sam',teamName:'North Shore Hawks',teamCode:'HAWKS7',inviteLink:'https://www.hockeyapp.ca/join/fixture-token'}).html,association:b.buildAssociationInvitation({associationName:'North Shore Hockey',role:'admin'}).html,coach:b.buildWeeklyCoachDigest({teamName:'North Shore Hawks',completedCount:2,rosterCount:3,players:[{name:'Sam',sessions:3},{name:'Mia',sessions:1},{name:'Ari',sessions:0}],unsubscribeUrl:'https://www.hockeyapp.ca/email/unsubscribe?token=fixture'}).html,player:b.buildPlayerWeeklyProgress({firstName:'Sam',playerId:'fixture',sessionsCount:3,shotsCount:240,targetShotsCount:100,unsubscribeUrl:'https://www.hockeyapp.ca/email/unsubscribe?token=fixture'}).html,zero:b.buildPlayerWeeklyProgress({firstName:'Sam',playerId:'fixture',sessionsCount:0,shotsCount:0}).html,recovery:fs.readFileSync('supabase/templates/recovery.html','utf8').replaceAll('{{ .SiteURL }}','https://www.hockeyapp.ca').replaceAll('{{ .TokenHash }}','test-token')};
for(const kind of ['send-admin-activity-email','send-admin-daily-digest']) {
 let handler, captured;
 const evt={id:'event',severity:'urgent',event_type:'email_delivery_failed',metadata:{detail:'Provider unavailable'},created_at:'2026-10-19T16:00:00Z',email:'test@example.com'};
 function query(table){const q={select(){return q;},eq(){return q;},is(){return q;},gte(){return q;},order(){return q;},update(){return q;},insert(){return q;},single:async()=>({data:evt,error:null}),maybeSingle:async()=>({data:null,error:null}),then(resolve,reject){return Promise.resolve({data:table==='admin_activity_log'?[evt]:[],error:null}).then(resolve,reject)}};return q;}
 const code=ts.transpileModule(fs.readFileSync(`supabase/functions/${kind}/index.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports:{},require:name=>name.includes('emailDesign')?emailDesign:name.includes('supabase-js')?{createClient:()=>({from:query})}:{serve:fn=>handler=fn},Request,Response,AbortSignal,crypto:globalThis.crypto,console:{log(){}},Deno:{env:{get:key=>({SUPABASE_SERVICE_ROLE_KEY:'service',SUPABASE_URL:'https://fixture.invalid',RESEND_API_KEY:'mock',ADMIN_EMAIL:'test@example.com'})[key]}},fetch:async(url,init)=>{captured=JSON.parse(init.body);return new Response(JSON.stringify({id:'mail'}));}});
 const response=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer service'},body:JSON.stringify({event_id:'event'})}));assert.equal(response.status,200);assert(captured.text);cases[kind]=captured.html;
}
for(const [name,html] of Object.entries(cases)) {
 assert.match(html,/<html lang="en" dir="ltr"/);assert.match(html,/<title>[^<]+<\/title>/);assert.equal((html.match(/<h1\b/g)||[]).length,1,name);assert(!/<script|<svg|data:image/i.test(html));assert(Buffer.byteLength(html)<95000,name);
 for(const image of html.matchAll(/<img\b[^>]*>/g))assert.match(image[0],/alt="[^"]*"/);
 assert(emailDesign.emailPlainText(html).includes('Hockey App')||emailDesign.emailPlainText(html).includes('HOCKEY APP'));
 fs.writeFileSync(path.join(output,name+'.html'),html);
}
assert(cases.invitation.includes('/join/fixture-token'));assert(cases.recovery.includes('mode=reset&amp;token_hash=test-token&amp;type=recovery'));assert(cases.player.includes('turn off this email'));assert(cases.zero.includes('No completed sessions or logged shots'));assert(!cases.zero.includes('Nice work showing up'));
let checks=0;
for(const engine of [chromium,firefox,webkit]) {
 const browser=await engine.launch();
 for(const width of [320,390,600])for(const [name,html] of Object.entries(cases)) {
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.route('https://www.hockeyapp.ca/images/email/**',route=>route.fulfill({path:path.join('public/images/email',route.request().url().split('/').at(-1)),contentType:'image/jpeg'}));
  await page.setContent(html,{waitUntil:'networkidle'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} overflow ${width}`);
  for(const a of await page.locator('a').all()){assert((await a.innerText()).trim());}
  if(width===390&&engine===chromium)await page.screenshot({path:path.join(output,name+'-mobile.png'),fullPage:true});
  if(width===600&&engine===chromium&&name==='player')await page.screenshot({path:path.join(output,name+'-desktop.png'),fullPage:true});
  // Simulate images blocked: all core actions and readable text remain available.
  await page.locator('img').evaluateAll(images=>images.forEach(image=>image.remove()));
  assert((await page.locator('h1').innerText()).length>5);
  await page.emulateMedia({colorScheme:'dark'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.close();checks++;
 }
 await browser.close();
}
console.log(`PASS: ${Object.keys(cases).length} email variants, ${checks} mobile/desktop renders across Chromium, Firefox and WebKit; images blocked, dark preference, links, security tokens, unsubscribe, plaintext, and clipping checks. Previews: ${output}`);
