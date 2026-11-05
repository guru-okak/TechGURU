import test from 'node:test'
import assert from 'node:assert/strict'
import {createD1Fixture} from '../helpers/d1-fixture.mjs'
test('screen loads retain role isolation and omit unrelated datasets',async()=>{
 const f=await createD1Fixture()
 try{
  const admin=await f.login('admin@techguru.example','AdminDemo2026!'),client=await f.login('ivan@techguru.example','ClientDemo2026!')
  const audit=(await f.api(admin,'/api/workspace?screen=audit')).body.data
  assert.equal(audit.partial,true);assert.ok(Array.isArray(audit.audit));assert.equal(audit.requests,undefined);assert.equal(audit.parts,undefined)
  const catalog=(await f.api(client,'/api/workspace?screen=catalog')).body.data
  assert.ok(catalog.services.length);assert.ok(catalog.points.length);assert.equal(catalog.users,undefined);assert.equal(catalog.audit,undefined)
  const forbidden=(await f.api(client,'/api/workspace?screen=audit')).body.data
  assert.deepEqual(forbidden.audit,[]);assert.ok(forbidden.notifications.every(n=>n.user_id===catalog.user.id))
  assert.equal((await f.api(admin,'/api/workspace?screen=unknown')).status,422)
  const full=(await f.api(admin,'/api/workspace')).body.data
  assert.ok(full.requests.length);assert.ok(Array.isArray(full.items));assert.equal(full.partial,undefined)
 }finally{await f.dispose()}
})
