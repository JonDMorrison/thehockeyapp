import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 }, timezoneId: 'UTC' });
test('an interrupted offline sync stays private and resumes only for its original family', async ({ page, context }) => {
  test.skip(process.env.OFFLINE_ACCOUNT_RELEASE_TEST !== '1', 'Opt in to two independent fictional families.');
  test.setTimeout(100000);
  const actors=[];
  for (const role of ['owner','outsider']) {
    const email=`qa-offline-${role}-${Date.now()}@example.com`, password=`QA-${randomUUID()}`;
    const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
    const result=await client.auth.signUp({email,password}); expect(result.error).toBeNull();
    actors.push({email,password,client,id:result.data.user!.id});
    fs.appendFileSync('/tmp/hockey-qa-offline-fixtures.jsonl',JSON.stringify({email,userId:result.data.user!.id})+'\n');
  }
  const [owner,outsider]=actors;
  const team=await owner.client.rpc('create_team_with_owner',{p_name:`Disposable Offline Account ${Date.now()}`,p_age_division:'U13',p_level:'rep'}); expect(team.error).toBeNull();
  const player=await owner.client.rpc('create_managed_player',{p_first_name:'PrivateOfflineKid',p_birth_year:2014}); expect(player.error).toBeNull();
  const teamId=team.data.team_id, playerId=player.data.player_id;
  fs.appendFileSync('/tmp/hockey-qa-offline-fixtures.jsonl',JSON.stringify({userId:owner.id,teamId,playerId})+'\n');
  expect((await owner.client.rpc('add_my_player_to_team',{p_team_id:teamId,p_player_id:playerId})).error).toBeNull();
  const card=await owner.client.rpc('replace_team_practice_card',{p_team_id:teamId,p_date:new Date().toISOString().slice(0,10),p_publish:true,p_tier:'rep',p_title:'Private offline workout',p_tasks:[{label:'Private offline drill',task_type:'mobility',target_type:'none',is_required:true,sort_order:0}]}); expect(card.error).toBeNull();
  async function signIn(actor: typeof owner, destination: string) {
    await page.goto(`/auth?mode=signin&redirect=${encodeURIComponent(destination)}`);
    await page.getByLabel(/^email/i).fill(actor.email); await page.getByLabel(/^password/i).fill(actor.password); await page.getByRole('button',{name:'Sign In',exact:true}).click();
    await expect(page).not.toHaveURL(/\/auth/);
  }
  await signIn(owner,`/players/${playerId}/today`);
  const task=page.getByRole('checkbox',{name:'Private offline drill'}); await expect(task).toBeVisible();
  await context.setOffline(true); await task.click(); await page.getByRole('button',{name:/complete session/i}).click();
  let requests=0; const subjects:string[]=[];
  await page.route('**/rest/v1/rpc/apply_offline_event',async route=>{
    requests++;
    subjects.push(JSON.parse(Buffer.from(route.request().headers().authorization.split('.')[1],'base64url').toString()).sub);
    await new Promise(resolve=>setTimeout(resolve,1500));
    await route.fulfill({status:503,json:{message:'Interrupted family sync'}}).catch(()=>{});
  });
  await context.setOffline(false); await expect.poll(()=>requests).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Account menu',exact:true}).click(); await page.getByRole('menuitem',{name:/log out|sign out/i}).click(); await expect(page).toHaveURL(/\/(?:auth)?$/);
  await signIn(outsider,'/settings');
  await expect(page.getByRole('heading',{name:'Account & Profile'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Retry sync'})).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('PrivateOfflineKid');
  expect(subjects.every(subject=>subject===owner.id)).toBe(true);
  expect((await owner.client.from('session_completions').select('id').eq('player_id',playerId)).data).toEqual([]);
  await page.getByRole('button',{name:'Account menu',exact:true}).click(); await page.getByRole('menuitem',{name:/log out|sign out/i}).click(); await expect(page).toHaveURL(/\/(?:auth)?$/);
  await page.unroute('**/rest/v1/rpc/apply_offline_event');
  await signIn(owner,`/players/${playerId}/today`);
  await expect.poll(async()=>(await owner.client.from('session_completions').select('status').eq('player_id',playerId).eq('practice_card_id',card.data.card_id)).data,{timeout:20000}).toEqual([{status:'complete'}]);
  await page.reload(); await expect(task).toBeChecked();
  await owner.client.auth.signOut({scope:'local'}); await outsider.client.auth.signOut({scope:'local'});
});
