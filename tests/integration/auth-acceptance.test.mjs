import test from 'node:test'
import assert from 'node:assert/strict'
import {createD1Fixture} from '../helpers/d1-fixture.mjs'
import {verifyPassword} from '../../server/security/passwords.ts'
test('auth acceptance: registration, duplicates, sessions, roles and logout',async()=>{
 const f=await createD1Fixture()
 try{
 const guest=f.jar();await f.api(guest,'/api/auth/csrf')
 const input={full_name:'Проверочный Клиент',phone:'+79995551122',email:'acceptance@example.com',password:'Acceptance2026!'}
 const call=(session,path,body)=>f.api(session,path,{method:'POST',body})
 const before=f.db.prepare('SELECT COUNT(*) n FROM users').get().n
 for(const patch of [{password:'short'},{email:'invalid'},{phone:'---       '},{full_name:' '},{role:'admin'}])assert.equal((await call(guest,'/api/auth/register',{...input,...patch})).status,422)
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM users').get().n,before)
 assert.equal((await call(guest,'/api/auth/register',input)).status,201)
 const user=f.db.prepare('SELECT * FROM users WHERE email=?').get(input.email)
 assert.equal(user.role,'client');assert.ok(await verifyPassword(input.password,user.password_hash))
 assert.equal((await call(guest,'/api/auth/register',input)).status,409)
 assert.equal((await call(guest,'/api/auth/login',{email:input.email,password:'WrongPassword2026!'})).status,401)
 assert.equal((await call(guest,'/api/auth/login',{email:'not-in-database@example.com',password:input.password})).status,401)
 assert.equal((await call(guest,'/api/auth/login',{email:input.email,password:input.password})).status,200)
 const sessions=f.db.prepare('SELECT COUNT(*) n FROM sessions').get().n
 assert.equal((await call(guest,'/api/auth/login',{email:input.email,password:input.password})).status,409)
 const refreshOnly=f.jar();refreshOnly.cookies=new Map(guest.cookies);refreshOnly.cookies.delete('access_token')
 assert.equal((await call(refreshOnly,'/api/auth/login',{email:input.email,password:input.password})).status,409)
 assert.equal((await call(guest,'/api/auth/register',{...input,email:'second@example.com',phone:'+79995551123'})).status,409)
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM sessions').get().n,sessions)
 await f.restart();assert.equal((await f.api(guest,'/api/auth/me')).body.data.user.id,user.id)
 assert.equal((await call(guest,'/api/auth/logout',{})).status,200)
 assert.equal((await f.api(guest,'/api/auth/me')).status,401)
 for(const [email,password,role] of [['anna@techguru.example','ClientDemo2026!','client'],['onsite@techguru.example','MasterDemo2026!','master'],['admin@techguru.example','AdminDemo2026!','admin']]){
 const session=await f.login(email,password);assert.equal((await f.api(session,'/api/auth/me')).body.data.user.role,role)
 }
 assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length,0)
 }finally{await f.dispose()}
})
