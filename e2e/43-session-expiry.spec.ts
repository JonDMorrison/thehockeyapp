import { expect,test } from '@playwright/test';

test.use({viewport:{width:390,height:844}});
test('an expired session with a rejected refresh token returns to sign in without showing cached private data',async({page})=>{
  await page.goto('/teams');await expect(page.getByRole('heading',{name:'My Teams',exact:true})).toBeVisible();
  await page.evaluate(()=>{
    const key=Object.keys(localStorage).find(key=>/^sb-.*-auth-token$/.test(key));
    if(!key)throw new Error('Expected authenticated browser session');
    const session=JSON.parse(localStorage.getItem(key)!);session.expires_at=1;session.expires_in=0;session.refresh_token='qa-invalid-expired-refresh-token';localStorage.setItem(key,JSON.stringify(session));
  });
  await page.reload();await expect(page).toHaveURL(/\/auth/, {timeout:20000});
  await expect(page.getByLabel(/^email/i)).toBeVisible();await expect(page.getByLabel(/^password/i)).toBeVisible();
  await expect(page.getByRole('heading',{name:'My Teams',exact:true})).toHaveCount(0);
  await page.goto('/teams');await expect(page).toHaveURL(/\/auth/);await expect(page.getByRole('heading',{name:'My Teams',exact:true})).toHaveCount(0);
});
