import test from 'node:test'
import assert from 'node:assert/strict'
import {counted} from '../../src/api/pluralRu.js'
test('Russian endings cover teens, 21, 22, zero and large counts',()=>{for(const [n,w] of [[0,'услуг'],[1,'услуга'],[2,'услуги'],[5,'услуг'],[11,'услуг'],[14,'услуг'],[21,'услуга'],[22,'услуги'],[25,'услуг'],[111,'услуг'],[122,'услуги']])assert.equal(counted(n,'услуга','услуги','услуг'),`${n} ${w}`)})
