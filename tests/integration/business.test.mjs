import test from 'node:test'
import assert from 'node:assert/strict'
import { reportDay } from '../../shared/domain/reportDates.ts'
import {createD1Fixture} from '../helpers/d1-fixture.mjs'

test('real D1: automatic assignment, repair, partial stock, procurement, pickup, rating and jobs',async()=>{
 const f=await createD1Fixture()
 try{
  const admin=await f.login('admin@techguru.example','AdminDemo2026!'),client=await f.login('ivan@techguru.example','ClientDemo2026!'),master=await f.login('dropoff@techguru.example','MasterDemo2026!')
  const call=async(session,path,body={},method='POST',status=200)=>{const r=await f.api(session,path,{method,body});assert.equal(r.status,status,JSON.stringify({path,...r.body}));return r.body.data}
  const date=new Date(Date.now()+86400000).toISOString().slice(0,10)
  const payload={service_id:5,service_mode:'dropoff',dropoff_point_id:1,description:'Я'.repeat(2000),preferred_datetime:date+'T07:00:00.000Z',preferred_slot:'10:00-12:00'}
  const r=await call(client,'/api/requests',payload,'POST',201)
  assert.equal(r.total_price_cents,150000)
  const confirmed=await call(admin,`/api/admin/requests/${r.id}/confirm`,{},'PATCH')
  assert.equal(confirmed.status,'assigned');assert.equal(confirmed.master_id,2)
  await call(master,`/api/business/requests/${r.id}/start`)
  const part=await call(master,`/api/business/requests/${r.id}/parts`,{part_id:5,quantity:30})
  assert.equal(part.reserved,12);assert.equal(part.missing,18)
  assert.equal(f.db.prepare('SELECT status FROM requests WHERE id=?').get(r.id).status,'waiting_parts')
  let order=f.db.prepare("SELECT * FROM purchase_orders WHERE status='draft' AND supplier_id=1").get()
  assert.ok(order)
  const firstCount=f.db.prepare('SELECT COUNT(*) n FROM purchase_order_items').get().n
  await call(admin,'/api/business/orders/drafts');assert.equal(f.db.prepare('SELECT COUNT(*) n FROM purchase_order_items').get().n,firstCount)
  for(let i=0;i<2;i++)await call(admin,`/api/business/orders/${order.id}/advance`)
  const race=await Promise.all([f.api(admin,`/api/business/orders/${order.id}/advance`,{method:'POST',body:{}}),f.api(admin,`/api/business/orders/${order.id}/advance`,{method:'POST',body:{}})])
  assert.deepEqual(race.map(r=>r.status).sort(),[200,409])
  await call(admin,`/api/business/orders/${order.id}/advance`,{},'POST',409)
  assert.equal(f.db.prepare('SELECT status FROM requests WHERE id=?').get(r.id).status,'in_progress')
  await call(admin,`/api/business/requests/${r.id}/issue`,{part_id:5})
  const rp=f.db.prepare('SELECT * FROM request_parts WHERE request_id=?').get(r.id)
  assert.equal(rp.issued_quantity,30);assert.equal(rp.reserved_quantity,0)
  await call(master,`/api/business/requests/${r.id}/complete`,{usage:{[rp.id]:2}})
  assert.equal(f.db.prepare('SELECT status,total_price_cents FROM requests WHERE id=?').get(r.id).status,'ready_for_pickup')
  assert.equal(f.db.prepare('SELECT total_price_cents FROM requests WHERE id=?').get(r.id).total_price_cents,250000)
  await call(master,`/api/business/requests/${r.id}/pickup`,{},'POST',403)
  const readyAt = new Date(Date.now() - 86400000)
  const startedAt = new Date(readyAt.getTime() - 2 * 3600000)
  f.db.prepare("UPDATE request_status_history SET created_at=? WHERE request_id=? AND to_status='ready_for_pickup'").run(readyAt.toISOString(), r.id)
  f.db.prepare('UPDATE requests SET started_at=? WHERE id=?').run(startedAt.toISOString(), r.id)
  await call(client,`/api/business/requests/${r.id}/pickup`)
  const authHeaders = { Cookie: [...admin.cookies].map(([name, value]) => name+'='+value).join('; ') }
  const repairReport = await fetch(f.base+'api/admin/reports/repair?days=7', {headers:authHeaders})
  assert.equal(repairReport.status, 200)
  assert.ok((await repairReport.text()).split(/\r?\n/).some(line => line.startsWith('"'+r.request_number+'"') && line.endsWith(';"2"')))
  const currentWorkspace = await f.api(admin, '/api/workspace')
  assert.equal(currentWorkspace.body.data.requests.find(row => row.id===r.id).repair_finished_at, readyAt.toISOString())
  const midnight = Date.parse(reportDay(0)+'T00:00:00+03:00')
  f.db.prepare('UPDATE requests SET created_at=? WHERE id=?').run(new Date(midnight-1).toISOString(), r.id)
  const dailyReport = await fetch(f.base+'api/admin/reports/requests?days=1', {headers:authHeaders})
  assert.equal(dailyReport.status, 200)
  assert.ok(!(await dailyReport.text()).includes(r.request_number))

  await call(client,`/api/business/requests/${r.id}/rating`,{rating:5,comment:'Спасибо'})
  await call(client,`/api/business/requests/${r.id}/rating`,{rating:4},'POST',409)
  await call(admin,'/api/admin/jobs')
  assert.equal(f.db.prepare('SELECT status FROM requests WHERE id=?').get(r.id).status,'completed')
  f.db.prepare('UPDATE requests SET completed_at=? WHERE id=?').run(new Date(Date.now()-4*86400000).toISOString(),r.id)
  await call(admin,'/api/admin/jobs');await call(admin,'/api/admin/jobs')
  assert.equal(f.db.prepare('SELECT status FROM requests WHERE id=?').get(r.id).status,'closed')
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM request_status_history WHERE request_id=? AND to_status='closed'").get(r.id).n,1)
  const snapshot=await f.api(client,'/api/workspace');assert.equal(snapshot.status,200);assert.ok(snapshot.body.data.requests.every(x=>x.user_id===3));assert.equal(snapshot.body.data.audit.length,0);assert.ok(!JSON.stringify(snapshot.body).includes('password_hash'))
  await call(client,'/api/requests',{...payload,preferred_datetime:date+'T20:00:00.000Z',preferred_slot:'23:00-01:00'},'POST',422)
  const missing=await call(client,'/api/requests',{...payload,preferred_datetime:date+'T18:00:00.000Z',preferred_slot:'21:00-23:00'},'POST',201)
  const candidateResponse=await f.api(admin,`/api/business/requests/${missing.id}/candidates?all=1`)
  assert.equal(candidateResponse.status,200)
  const candidates=candidateResponse.body.data
  assert.ok(candidates.find(candidate=>candidate.id===2).current_load>=1,'closed repair still counts toward the same scheduled day')
  const pending=await call(admin,`/api/admin/requests/${missing.id}/confirm`,{},'PATCH');assert.equal(pending.status,'confirmed');assert.equal(pending.needs_manual_review,1)
  const future=new Date(Date.now()+20*86400000).toISOString().slice(0,10)
  await call(admin,'/api/schedule',{master_id:2,starts_at:future+'T07:00:00.000Z',ends_at:future+'T15:00:00.000Z'})
  for(const hour of [7,9]){
   const task=await call(client,'/api/requests',{...payload,description:'Проверка свободного остатка смены',preferred_datetime:future+`T0${hour}:00:00.000Z`,preferred_slot:`${hour+3}:00-${hour+5}:00`},'POST',201)
   assert.equal((await call(admin,`/api/admin/requests/${task.id}/confirm`,{},'PATCH')).status,'assigned')
  }
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM master_schedule WHERE master_id=2 AND starts_at LIKE ? AND is_booked=1").get(future+'%').n,2)
  f.db.prepare('UPDATE masters SET is_dropoff=1,rating=4 WHERE id=1').run()
  f.db.prepare('UPDATE masters SET rating=5 WHERE id=2').run()
  f.db.prepare('INSERT INTO master_skills(master_id,service_id,skill_level) SELECT 1,id,required_skill_level FROM services WHERE id=5').run()
  await call(admin,'/api/schedule',{master_id:1,starts_at:future+'T11:00:00.000Z',ends_at:future+'T15:00:00.000Z'})
  const balanced=await call(client,'/api/requests',{...payload,preferred_datetime:future+'T11:00:00.000Z',preferred_slot:'14:00-16:00'},'POST',201)
  const rankedResponse=await f.api(admin,`/api/business/requests/${balanced.id}/candidates`)
  assert.equal(rankedResponse.status,200)
  const ranked=rankedResponse.body.data
  assert.deepEqual(ranked.map(candidate=>candidate.id),[1,2])
  assert.equal((await call(admin,`/api/admin/requests/${balanced.id}/confirm`,{},'PATCH')).master_id,1)
  const automatic=await call(client,'/api/requests?auto_confirm=1',{...payload,preferred_datetime:future+'T13:00:00.000Z',preferred_slot:'16:00-18:00'},'POST',201)
  assert.equal(automatic.status,'assigned')
  assert.deepEqual(f.db.prepare("SELECT changed_by_role FROM request_status_history WHERE request_id=? AND to_status IN ('confirmed','assigned') ORDER BY id").all(automatic.id).map(row=>row.changed_by_role),['system','system'])
  assert.equal(f.db.prepare("SELECT COUNT(*) n FROM notifications WHERE request_id=? AND type='manual_assignment_required'").get(automatic.id).n,0)
  const unmatched=await call(client,'/api/requests?auto_confirm=1',{...payload,preferred_datetime:future+'T18:00:00.000Z',preferred_slot:'21:00-23:00'},'POST',201)
  assert.equal(unmatched.status,'confirmed')
  assert.equal(unmatched.needs_manual_review,1)
  assert.ok(f.db.prepare("SELECT COUNT(*) n FROM notifications WHERE request_id=? AND type='manual_assignment_required'").get(unmatched.id).n>0)
  const movePath=`/api/business/requests/${balanced.id}/reschedule`
  const oldBooking=f.db.prepare('SELECT id FROM master_schedule WHERE request_id=?').get(balanced.id)
  await call(admin,movePath,{datetime:future+'T18:00:00.000Z',slot:'21:00-23:00'},'POST',409)
  assert.equal(f.db.prepare('SELECT id FROM master_schedule WHERE request_id=?').get(balanced.id).id,oldBooking.id)
  const nextVisit=new Date(Date.now()+21*86400000).toISOString().slice(0,10)
  await call(admin,'/api/schedule',{master_id:1,starts_at:nextVisit+'T07:00:00.000Z',ends_at:nextVisit+'T11:00:00.000Z'})
  const moved=await call(admin,movePath,{datetime:nextVisit+'T07:00:00.000Z',slot:'10:00-12:00'})
  assert.equal(moved.preferred_datetime,nextVisit+'T07:00:00.000Z')
  assert.equal(f.db.prepare('SELECT is_booked FROM master_schedule WHERE id=?').get(oldBooking.id).is_booked,0)
  const estimatePath=`/api/business/requests/${automatic.id}/estimate`
  const decidePath=estimatePath+'-decision'
  const estimate={items:[{name:'Дополнительная диагностика',quantity:1,unit_price_cents:200000}],parts_cents:50000,reason:'Уточнение после диагностики'}
  await call(admin,estimatePath,estimate)
  let quotation=(await f.api(client,`/api/requests/${automatic.id}`)).body.data
  const firstProposal=JSON.parse(quotation.estimate_proposal).id
  assert.equal(quotation.total_price_cents,automatic.total_price_cents)
  await call(admin,decidePath,{proposal_id:firstProposal,accepted:true},'POST',403)
  await call(client,decidePath,{proposal_id:firstProposal,accepted:false})
  assert.equal(f.db.prepare('SELECT total_price_cents FROM requests WHERE id=?').get(automatic.id).total_price_cents,automatic.total_price_cents)
  await call(admin,estimatePath,estimate)
  quotation=(await f.api(client,`/api/requests/${automatic.id}`)).body.data
  await call(client,decidePath,{proposal_id:firstProposal,accepted:true},'POST',409)
  await call(client,decidePath,{proposal_id:JSON.parse(quotation.estimate_proposal).id,accepted:true})
  assert.equal(f.db.prepare('SELECT total_price_cents FROM requests WHERE id=?').get(automatic.id).total_price_cents,250000)
  assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length,0)
  await f.restart();assert.equal((await f.api(client,'/api/workspace')).status,200)
 }finally{await f.dispose()}
})
