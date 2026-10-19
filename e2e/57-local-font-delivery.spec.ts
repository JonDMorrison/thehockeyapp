import {test,expect} from '@playwright/test';
test.use({storageState:{cookies:[],origins:[]}});
for(const width of [320,1440])for(const path of ['/','/about','/demo','/auth?mode=signup'])test(`local fonts preserve public layout at ${width}px on ${path}`,async({page})=>{
 await page.setViewportSize({width,height:900});const external:string[]=[];page.on('request',request=>{if(/fonts\.(googleapis|gstatic)\.com/.test(request.url()))external.push(new URL(request.url()).hostname);});
 await page.goto(path);await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();
 const fonts=await page.evaluate(async()=>{await Promise.all([document.fonts.load('700 16px Inter','Développement, cœur, équipe'),document.fonts.load('800 24px "Inter Tight"','Développement, cœur, équipe')]);await document.fonts.ready;return [...document.fonts].filter(font=>font.status==='loaded').map(font=>font.family);});
 expect(fonts.some(name=>name.replace(/["']/g,'')==='Inter')).toBe(true);expect(fonts.some(name=>name.replace(/["']/g,'')==='Inter Tight')).toBe(true);expect(external).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
