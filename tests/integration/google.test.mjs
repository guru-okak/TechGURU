import test from 'node:test'
import assert from 'node:assert/strict'
import {googleRoute} from '../../server/routes/google.ts'
const base='https://techguru.techguru-w.workers.dev'
const env={APP_ENV:'production',JWT_SECRET:'test-secret-at-least-thirty-two-characters-long',GOOGLE_CLIENT_ID:'test.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:'test-only',DB:{prepare(){throw Error('Unexpected database access')}}}
test('Google OAuth start binds state, nonce and PKCE to a secure browser cookie',async()=>{
 const r=await googleRoute(new Request(base+'/api/auth/google/start'),env)
 assert.equal(r.status,302)
 const u=new URL(r.headers.get('Location'))
 assert.equal(u.origin,'https://accounts.google.com')
 assert.equal(u.searchParams.get('redirect_uri'),base+'/api/auth/google/callback')
 assert.equal(u.searchParams.get('scope'),'openid email profile')
 for(const key of ['state','nonce','code_challenge'])assert.match(u.searchParams.get(key),/^[A-Za-z0-9_-]{43}$/)
 assert.equal(u.searchParams.get('code_challenge_method'),'S256')
 const cookie=r.headers.get('Set-Cookie');for(const value of ['HttpOnly','Secure','SameSite=Lax','Max-Age=600'])assert.ok(cookie.includes(value))
})
test('Google callback rejects missing or forged browser flow without accepting identity',async()=>{
 for(const cookie of ['', 'google_flow=forged']){
 const r=await googleRoute(new Request(base+'/api/auth/google/callback?code=fake&state=fake',{headers:{Cookie:cookie}}),env)
 assert.equal(r.status,302);assert.equal(r.headers.get('Location'),'/login?google_error=1')
 assert.ok(r.headers.get('Set-Cookie').includes('Max-Age=0'))
 assert.ok(!r.headers.get('Set-Cookie').includes('access_token='))
 }
})
test('Google onboarding cannot be opened with a forged identity cookie',async()=>{
 await assert.rejects(()=>googleRoute(new Request(base+'/api/auth/google/profile',{headers:{Cookie:'google_profile=forged'}}),env),e=>e.code==='GOOGLE_EXPIRED')
})
