import {test,expect} from '@playwright/test';

test.use({storageState:{cookies:[],origins:[]},javaScriptEnabled:false,viewport:{width:390,height:844}});
for(const route of ['/about','/features','/demo','/contact','/privacy','/terms']){
 test(`the ${route} document has its own readable content without JavaScript`,async({page})=>{
  test.skip(!process.env.TEST_BASE_URL, 'Requires a built HTML deployment, not the source development server.');
  // Vite preview serves artifacts directly; Vercel maps the public paths through vercel.json.
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(process.env.TEST_BASE_URL || '');
  const response=await page.goto(local ? `${route}/index.html` : route);expect(response?.ok()).toBe(true);
  const heading=page.getByRole('heading',{level:1});await expect(heading).toHaveCount(1);await expect(heading).not.toContainText('Off-ice training delivers on-ice results.');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`https://www.hockeyapp.ca${route}`);
  if(route==='/about')await expect(page.locator('main')).toContainText('Jon Morrison');
  if(route==='/demo')await expect(page.locator('main')).toContainText(/shooting/i);
  if(route==='/privacy'){await expect(heading).toHaveText('Privacy Policy');await expect(page.locator('main')).toContainText('Access, Correction, Deletion, and Retention');await expect(page.locator('main').getByRole('link',{name:'Submit a privacy request',exact:true})).toHaveAttribute('href','/contact');}
  if(route==='/terms'){await expect(heading).toHaveText('Terms of Service');await expect(page.locator('main')).toContainText('Limitation of Liability');}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 });
}
test('private sign-in HTML provides appropriate content and excludes sample team statistics',async({page})=>{
 test.skip(!process.env.TEST_BASE_URL, 'Requires a built HTML deployment.');
 const response=await page.goto('/_private/auth.html');expect(response?.ok()).toBe(true);await expect(page.getByRole('heading',{level:1})).toHaveText('Sign in or create an account');await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, nofollow');await expect(page.getByText('Team Dashboard',{exact:true})).toHaveCount(0);await expect(page.getByRole('link',{name:'Sign in',exact:true})).toHaveAttribute('href','/auth');
});
