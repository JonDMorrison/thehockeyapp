import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

test.use({ storageState: { cookies: [], origins: [] }, viewport: { width: 390, height: 844 } });
test('association owner connects a team and invites a reporting viewer without granting player access', async ({ page, browser }) => {
  test.skip(process.env.ASSOCIATION_RELEASE_TEST !== '1', 'Opt in to fictional association/staff accounts.');test.setTimeout(100000);page.setDefaultTimeout(15000);
  const actors=[];
  for(const role of ['owner','viewer','outsider']){
    const email=`qa-association-${role}-${Date.now()}@example.com`,password=`QA-${randomUUID()}`;
    const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
    const result=await client.auth.signUp({email,password});expect(result.error).toBeNull();actors.push({client,email,password,id:result.data.user!.id});
    fs.appendFileSync('/tmp/hockey-qa-association-fixtures.jsonl',JSON.stringify({email,userId:result.data.user!.id})+'\n');
  }
  const [owner,viewer,outsider]=actors;
  const teamName=`Disposable Association Team ${Date.now()}`;
  const team=await owner.client.rpc('create_team_with_owner',{p_name:teamName,p_age_division:'U13',p_level:'rep'});expect(team.error).toBeNull();
  const player=await owner.client.rpc('create_managed_player',{p_first_name:'AssociationPrivateKid',p_birth_year:2014,p_hockey_love:'Private player story'});expect(player.error).toBeNull();
  const teamId=team.data.team_id,playerId=player.data.player_id;expect((await owner.client.rpc('add_my_player_to_team',{p_team_id:teamId,p_player_id:playerId})).error).toBeNull();
  fs.appendFileSync('/tmp/hockey-qa-association-fixtures.jsonl',JSON.stringify({teamId,playerId,userId:owner.id})+'\n');
  await page.goto('/auth?mode=signin&redirect=%2Fassociations%2Fnew');await page.getByLabel(/^email/i).fill(owner.email);await page.getByLabel(/^password/i).fill(owner.password);await page.getByRole('button',{name:'Sign In',exact:true}).click();
  const name=`Disposable Association QA ${Date.now()}`;await page.getByLabel(/^Association name/).fill(name);await page.getByLabel('Season',{exact:true}).fill('2026–27');await page.getByRole('button',{name:/create association/i,exact:true}).click();await expect(page).toHaveURL(/\/associations\/[a-f0-9-]+$/);
  const associationId=page.url().split('/').pop()!;fs.appendFileSync('/tmp/hockey-qa-association-fixtures.jsonl',JSON.stringify({associationId,userId:owner.id})+'\n');
  await page.getByRole('button',{name:new RegExp(teamName)}).click();await expect(page.getByText('Team connected',{exact:true})).toBeVisible();
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/functions/v1/send-transactional-email',route=>route.fulfill({status:503,json:{message:'Simulated email service outage'}}));
  await page.getByLabel('Invite by email',{exact:true}).fill(viewer.email);await page.getByRole('button',{name:'Send secure invite',exact:true}).click();await expect(page.getByText('Invitation created',{exact:true})).toBeVisible();
  const invite=await owner.client.from('association_invites').select('id,token').eq('association_id',associationId).eq('invited_email',viewer.email).single();expect(invite.error).toBeNull();
  const token=invite.data!.token;
  const secureLink=page.getByLabel('Secure invitation link',{exact:true});await expect(secureLink).toHaveValue(new RegExp(`/association/join/${token}$`));
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Clipboard denied for QA');}}}));
  await page.getByRole('button',{name:'Copy invitation link',exact:true}).click();await expect(page.getByText('Couldn’t copy the link',{exact:true})).toBeVisible();
  await expect(secureLink).toBeVisible();
  const wrong=await outsider.client.rpc('redeem_association_invite',{p_token:token});expect(wrong.error||wrong.data?.success===false).toBeTruthy();
  const context=await browser.newContext({storageState:{cookies:[],origins:[]},viewport:{width:390,height:844},baseURL:process.env.TEST_BASE_URL||'http://localhost:8080'});const guest=await context.newPage();
  await guest.goto(`/association/join/${token}`);await guest.getByRole('button',{name:'Sign in to accept',exact:true}).click();await guest.getByLabel(/^email/i).fill(viewer.email);await guest.getByLabel(/^password/i).fill(viewer.password);await guest.getByRole('button',{name:'Sign In',exact:true}).click();await guest.getByRole('button',{name:'Accept association access',exact:true}).click();await expect(guest).toHaveURL(new RegExp(`/associations/${associationId}$`));
  await expect(guest.getByRole('heading',{name})).toBeVisible();await expect(guest.getByRole('button',{name:'Send secure invite'})).toHaveCount(0);await expect(guest.getByRole('heading',{name:'Connect teams'})).toHaveCount(0);
  const snapshot=await viewer.client.rpc('get_association_dashboard',{p_association_id:associationId,p_days:7});expect(snapshot.error).toBeNull();expect(snapshot.data.totals.players_count).toBe(1);expect(snapshot.data.totals.teams_count).toBe(1);
  expect(JSON.stringify(snapshot.data)).not.toContain('Private player story');expect((await viewer.client.from('players').select('id').eq('id',playerId)).data).toEqual([]);
  for(const result of [await viewer.client.rpc('remove_team_from_association',{p_association_id:associationId,p_team_id:teamId}),await viewer.client.rpc('create_association_invite',{p_association_id:associationId,p_email:outsider.email,p_role:'admin'})])expect(result.error||result.data?.success===false).toBeTruthy();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);expect(await guest.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);expect(errors).toEqual([]);
  await page.route('**/rest/v1/rpc/get_association_dashboard',route=>route.fulfill({status:503,json:{message:'Simulated association read outage'}}));await page.reload();await expect(page.getByRole('heading',{name:'Couldn’t load this association',exact:true})).toBeVisible({timeout:20000});
  await page.unroute('**/rest/v1/rpc/get_association_dashboard');await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.getByRole('heading',{name})).toBeVisible();
  await context.close();for(const actor of actors)await actor.client.auth.signOut({scope:'local'});
});
