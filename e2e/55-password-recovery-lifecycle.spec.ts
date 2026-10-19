import {test,expect} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import fs from 'node:fs';
import crypto from 'node:crypto';

test.use({storageState:{cookies:[],origins:[]},viewport:{width:320,height:568},screenshot:'off',trace:'off',video:'off'});
for(const suffix of ['&token_hash=invalid-recovery-token&type=recovery','&error=access_denied&error_code=otp_expired','#error=access_denied&error_code=otp_expired',''])test(`invalid recovery entry stays actionable: ${suffix||'missing token'}`,async({page})=>{
 await page.goto(`/auth?mode=reset${suffix}`);await expect(page.getByText(/This reset link has expired or could not be opened/)).toBeVisible();await expect(page.getByRole('button',{name:'Update password',exact:true})).toBeDisabled();await page.getByRole('link',{name:'Back to sign in to request a new link',exact:true}).click();await expect(page.getByRole('button',{name:/^sign in$/i})).toBeVisible();
});

test('a real recovery token works in a fresh mobile browser, changes only its test account, and cannot be reused',async({page,browser})=>{
 test.skip(process.env.RECOVERY_REAL_TOKEN_TEST!=='1','Explicit opt-in: creates and removes one fictional auth user; generates a token without sending email.');test.setTimeout(90000);
 const keys=JSON.parse(fs.readFileSync(process.env.RECOVERY_TEST_KEY_FILE!,'utf8'));const key=keys.find((row:{name:string})=>row.name==='service_role')?.api_key;expect(Boolean(key)).toBe(true);
 const admin=createClient(process.env.VITE_SUPABASE_URL!,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const anon=()=>createClient(process.env.VITE_SUPABASE_URL!,process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const email=`qa-recovery-${crypto.randomUUID()}@example.com`;const original=crypto.randomUUID();const changed=crypto.randomUUID();let id:string|undefined;let activeToken:string|undefined;
 try {
  const created=await admin.auth.admin.createUser({email,password:original,email_confirm:true});expect(created.error?.message??null).toBeNull();id=created.data.user!.id;
  const link=await admin.auth.admin.generateLink({type:'recovery',email});expect(link.error?.message??null).toBeNull();const hash=link.data.properties!.hashed_token;
  await page.goto(`/auth?mode=reset&token_hash=${encodeURIComponent(hash)}&type=recovery`);await expect(page.getByRole('button',{name:'Update password',exact:true})).toBeEnabled();expect(new URL(page.url()).searchParams.has('token_hash')).toBe(false);
  await page.getByLabel(/^Password/).fill(changed);await page.getByLabel(/^Confirm new password/).fill('mismatch');await page.getByRole('button',{name:'Update password',exact:true}).click();await expect(page.getByText('Passwords do not match',{exact:true})).toBeVisible();
  await page.getByLabel(/^Confirm new password/).fill(changed);await page.getByRole('button',{name:'Update password',exact:true}).click();await expect(page.getByText('Password updated',{exact:true})).toBeVisible();
  const oldLogin=anon();expect((await oldLogin.auth.signInWithPassword({email,password:original})).error?.code).toBe('invalid_credentials');
  const newLogin=anon();const signed=await newLogin.auth.signInWithPassword({email,password:changed});expect(signed.error?.message??null).toBeNull();expect(signed.data.user!.id).toBe(id);activeToken=signed.data.session!.access_token;await newLogin.auth.signOut({scope:'local'});
  const second=await browser.newContext({storageState:{cookies:[],origins:[]},viewport:{width:320,height:568}});try{const reused=await second.newPage();await reused.goto(new URL(`/auth?mode=reset&token_hash=${encodeURIComponent(hash)}&type=recovery`,page.url()).href);await expect(reused.getByText(/This reset link has expired or could not be opened/)).toBeVisible();await expect(reused.getByRole('button',{name:'Update password',exact:true})).toBeDisabled();}finally{await second.close();}
 } finally {if(activeToken)await admin.auth.admin.signOut(activeToken,'global');if(id)expect((await admin.auth.admin.deleteUser(id)).error?.message??null).toBeNull();}
});
