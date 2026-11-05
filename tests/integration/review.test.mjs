import test from 'node:test'
import assert from 'node:assert/strict'
import {createD1Fixture} from '../helpers/d1-fixture.mjs'
test('review: local photos, own skills, full candidate list and categorized master reports',async()=>{
 const f=await createD1Fixture()
 try{
 const admin=await f.login('admin@techguru.example','AdminDemo2026!'),client=await f.login('ivan@techguru.example','ClientDemo2026!'),master=await f.login('dropoff@techguru.example','MasterDemo2026!')
 const call=async(session,path,body={},method='POST',status=200)=>{const r=await f.api(session,path,{method,body});assert.equal(r.status,status,JSON.stringify(r.body));return r.body.data}
 const photo='data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA=='
 const date=new Date(Date.now()+86400000).toISOString().slice(0,10)
 const r=await call(client,'/api/requests',{service_id:5,service_mode:'dropoff',dropoff_point_id:1,description:'Проверка фотографии устройства',photos:[photo],preferred_datetime:date+'T07:00:00.000Z',preferred_slot:'10:00-12:00'},'POST',201)
 assert.equal(r.photos[0],photo)
 await call(admin,`/api/admin/requests/${r.id}/confirm`,{},'PATCH')
 await call(master,`/api/business/requests/${r.id}/report`,{category:'system',message:'Проверка обращения об ошибке системы'})
 await call(client,`/api/business/requests/${r.id}/report`,{category:'system',message:'Недопустимое обращение'},'POST',403)
 const w=(await f.api(admin,'/api/workspace')).body.data
 assert.equal(w.reports.length,1);assert.equal(w.reports[0].category,'system');assert.ok(w.notifications.some(n=>n.type==='master_report'))
 await call(admin,`/api/business/reports/${w.reports[0].id}/resolve`)
 assert.equal(f.db.prepare('SELECT status FROM master_reports').get().status,'resolved')
 await call(master,'/api/masters/1',{skills:[]},'PATCH',404)
 await call(master,'/api/masters/2',{skills:[{service_id:5,skill_level:2},{service_id:1,skill_level:1}]},'PATCH')
 assert.equal(f.db.prepare('SELECT COUNT(*) n FROM master_skills WHERE master_id=2').get().n,2)
 const all=(await f.api(admin,`/api/business/requests/${r.id}/candidates?all=1`)).body.data
 assert.equal(all.length,2);assert.ok(all.every(m=>typeof m.eligible==='boolean'))
 assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length,0)
 }finally{await f.dispose()}
})
