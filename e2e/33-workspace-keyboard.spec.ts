import { expect, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';

test.use({ viewport: { width: 320, height: 568 } });
test('team, player, and saved program cards are real keyboard-operable links on a small phone', async ({ page }) => {
  const client=createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false}});
  expect((await client.auth.signInWithPassword({email:process.env.TEST_USER_EMAIL!,password:process.env.TEST_USER_PASSWORD!})).error).toBeNull();
  const name=`Disposable Keyboard QA ${Date.now()}`;
  const team=await client.rpc('create_team_with_owner',{p_name:name,p_age_division:'U13',p_level:'rep'});expect(team.error).toBeNull();
  const player=await client.rpc('create_managed_player',{p_first_name:'KeyboardAuditKid',p_birth_year:2014});expect(player.error).toBeNull();
  const teamId=team.data.team_id,playerId=player.data.player_id,planId=randomUUID();
  fs.appendFileSync('/tmp/hockey-qa-keyboard-fixtures.jsonl',JSON.stringify({teamId,playerId,planId})+'\n');
  const date=new Date().toISOString().slice(0,10);
  expect((await client.rpc('save_team_week_plan',{p_id:planId,p_team_id:teamId,p_name:'Keyboard program',p_start_date:date,p_tier:'rep',p_use_tier_scaling:false,p_days:[{date,title:'Rest',tasks:[]}],p_publish:false})).error).toBeNull();
  for(const [path,label,destination]of [['/teams',name,`/teams/${teamId}`],['/players','KeyboardAuditKid',`/players/${playerId}/home`],[`/teams/${teamId}/builder`,'Keyboard program',`/teams/${teamId}/builder/${planId}`]]){
    await page.goto(path);const link=page.getByRole('link',{name:new RegExp(label)}).first();await expect(link).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
    await link.focus();await expect(link).toBeFocused();await page.keyboard.press('Enter');await expect(page).toHaveURL(new RegExp(destination+'$'));
  }
  await client.auth.signOut({scope:'local'});
});
