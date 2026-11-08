import test from 'node:test'
import assert from 'node:assert/strict'
import {pendingEmailCookie,pendingEmailUser} from '../../server/security/pending-email.ts'
const env={APP_ENV:'production',JWT_SECRET:'test-key-with-at-least-thirty-two-characters'}
test('pending verification cookie is scoped, secure and identifies only its user',async()=>{
 const cookie=await pendingEmailCookie(env,42)
 for(const part of ['HttpOnly','Secure','SameSite=Strict','Path=/api/auth/email','Max-Age=1800'])assert.ok(cookie.includes(part))
 assert.equal(await pendingEmailUser(new Request('https://example.com',{headers:{Cookie:cookie.split(';')[0]}}),env),42)
 assert.equal(await pendingEmailUser(new Request('https://example.com',{headers:{Cookie:'pending_email=forged'}}),env),null)
 assert.equal(await pendingEmailUser(new Request('https://example.com'),env),null)
})
