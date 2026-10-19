import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test.use({storageState:{cookies:[],origins:[]},viewport:{width:390,height:844},screenshot:'off',trace:'off',video:'off'});
for(const timezoneId of ['America/Vancouver','Pacific/Honolulu','Pacific/Auckland'])test.describe(timezoneId,()=>{
 test.use({timezoneId});
 test('coach header preserves the saved calendar date rather than shifting to the previous day',async({page})=>{
  test.skip(!process.env.EMAIL_TEST_FIXTURE_FILE,'Explicit disposable fixture required.');test.setTimeout(45000);
  const f=JSON.parse(fs.readFileSync(process.env.EMAIL_TEST_FIXTURE_FILE!,'utf8'));const coach=f.users.find((u:{role:string})=>u.role==='coach');await page.goto('/auth?mode=signin');await page.getByLabel(/^Email/).fill(coach.email);await page.getByLabel(/^Password/).fill(coach.password);await page.getByRole('button',{name:/^sign in$/i}).click();await expect(page).not.toHaveURL(/\/auth/);
  await page.route('**/rest/v1/rpc/get_team_dashboard_snapshot',async route=>{const response=await route.fetch();const payload=await response.json();payload.today.date='2026-10-19';await route.fulfill({response,json:payload});});
  await page.goto(`/teams/${f.teamId}`);await expect(page.getByText('TODAY — MON, OCT 19',{exact:true})).toBeVisible();
 });
});
