import {test,expect} from '@playwright/test';
import fs from 'node:fs';
test.use({storageState:{cookies:[],origins:[]},viewport:{width:320,height:568},screenshot:'off',trace:'off',video:'off'});
test('family email failures remain retryable and legacy skipped responses never claim success',async({page})=>{
 test.skip(!process.env.EMAIL_TEST_FIXTURE_FILE,'Explicit opt-in: uses the disposable launch email fixture; requests are intercepted.');test.setTimeout(90000);page.setDefaultTimeout(15000);
 const fixture=JSON.parse(fs.readFileSync(process.env.EMAIL_TEST_FIXTURE_FILE!,'utf8'));const coach=fixture.users.find((u:{role:string})=>u.role==='coach');
 await page.goto('/auth?mode=signin');await page.getByLabel(/^Email/).fill(coach.email);await page.getByLabel(/^Password/).fill(coach.password);await page.getByRole('button',{name:/^sign in$/i}).click();await expect(page).not.toHaveURL(/\/auth/);
 await page.goto(`/teams/${fixture.teamId}/roster`);await page.getByRole('button',{name:'Add Player',exact:true}).click();await page.getByRole('tab',{name:'Invite Families',exact:true}).click();const address=page.getByLabel(/^Parent or guardian email/);await address.fill('not-sent@example.com');const send=page.getByRole('button',{name:'Send email invite',exact:true});
 for(const response of [{status:503,json:{error:'Email delivery is temporarily unavailable. You can still copy the invitation link.'}},{status:200,json:{skipped:true}}]){
  await page.route('**/functions/v1/send-transactional-email',route=>route.fulfill(response));await send.click();await expect(page.getByText('Could not send invite',{exact:true})).toBeVisible();await expect(page.getByText('Invite sent',{exact:true})).toHaveCount(0);await expect(address).toHaveValue('not-sent@example.com');await expect(send).toBeEnabled();await page.unroute('**/functions/v1/send-transactional-email');
 }
 await page.route('**/functions/v1/send-transactional-email',route=>route.fulfill({status:200,json:{success:true,id:'mock-provider-message'}}));await send.click();await expect(page.getByText('Invite sent',{exact:true})).toBeVisible();await expect(address).toHaveValue('');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
