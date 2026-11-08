import test from 'node:test'
import assert from 'node:assert/strict'
import {BusinessRepository} from '../../server/repositories/business.ts'
function repo(role='admin'){return new BusinessRepository({APP_ENV:'local',DB:{prepare(){throw Error('Unexpected database access')}}},{id:1,role},new Request('http://localhost'))}
test('user deletion forbids self-deletion before database mutations',async()=>{await assert.rejects(()=>repo().deleteUser(1),e=>e.status===403)})
test('user deletion is unavailable to clients and masters',async()=>{for(const role of ['client','master'])await assert.rejects(()=>repo(role).deleteUser(2),e=>e.status===403)})
