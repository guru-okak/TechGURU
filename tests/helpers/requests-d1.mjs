import assert from 'node:assert/strict'
import { createD1Fixture } from './d1-fixture.mjs'

export async function runRequestChecks() {
  const fixture=await createD1Fixture()
  const checks=[]
  try {
    const { api }=fixture
    const anna=await fixture.login('anna@techguru.example','ClientDemo2026!')
    const ivan=await fixture.login('ivan@techguru.example','ClientDemo2026!')
    const admin=await fixture.login('admin@techguru.example','AdminDemo2026!')
    const master=await fixture.login('onsite@techguru.example','MasterDemo2026!')
    const tomorrow=new Date(); tomorrow.setUTCDate(tomorrow.getUTCDate()+1)
    const date=tomorrow.toISOString().slice(0,10)
    const payload=(mode='onsite',hour=10) => ({
      service_id:mode==='onsite'?1:5,service_mode:mode,description:'Тестовая неисправность',
      preferred_datetime:`${date}T${String(hour-3).padStart(2,'0')}:00:00.000Z`,preferred_slot:`${hour}:00-${hour+2}:00`,
      ...(mode==='onsite'?{client_address:'Москва, Центральная улица, 10',service_district:'Центральный'}:{dropoff_point_id:1}),
    })
    const create=async (input=payload(),session=anna) => {
      const result=await api(session,'/api/requests',{method:'POST',body:input})
      assert.equal(result.status,201,JSON.stringify(result.body))
      return result.body.data
    }
    const confirm=async(id) => {
      const result=await api(admin,`/api/admin/requests/${id}/confirm`,{method:'PATCH',body:{manual_assignment:true}})
      assert.equal(result.status,200,JSON.stringify(result.body))
      return result.body.data
    }
    const assign=(id,masterId=1) => api(admin,`/api/admin/requests/${id}/assign`,{method:'PATCH',body:{master_id:masterId}})
    const counts=() => Object.fromEntries(['requests','request_status_history','request_items','audit_log','notifications','notification_queue'].map((name)=>[name,fixture.db.prepare(`SELECT COUNT(*) AS n FROM ${name}`).get().n]))
    const events=(id) => fixture.db.prepare('SELECT from_status,to_status,event_type,comment FROM request_status_history WHERE request_id=? ORDER BY id').all(id).map((row)=>({...row}))

    assert.equal((await api(fixture.jar(),'/api/requests')).status,401)
    assert.equal((await api(fixture.jar(),'/api/requests',{method:'POST',body:payload()})).status,401)
    assert.equal((await api(anna,'/api/admin/requests')).status,403)
    assert.equal((await api(master,'/api/requests')).status,403)
    assert.equal((await api(anna,'/api/requests',{method:'POST',body:payload(),csrf:false})).status,403)
    checks.push('authentication, role protection and CSRF -> 401/403')

    for (const invalid of [
      {...payload(),client_address:undefined}, {...payload(),service_district:undefined},
      {...payload('dropoff'),dropoff_point_id:undefined}, {...payload('dropoff'),dropoff_point_id:9999},
      {...payload(),service_id:9999}, {...payload(),user_id:3}, {...payload(),status:'assigned'},
      {...payload(),preferred_slot:'10:00-11:00'}, {...payload(),preferred_slot:'13:00-15:00'},
      {...payload(),preferred_datetime:'2020-01-01T07:00:00.000Z'}, {...payload(),photos:['file:///private']},
    ]) assert.equal((await api(anna,'/api/requests',{method:'POST',body:invalid})).status,422,JSON.stringify(invalid))
    fixture.db.prepare('UPDATE services SET is_active=0 WHERE id=1').run()
    assert.equal((await api(anna,'/api/requests',{method:'POST',body:payload()})).status,422)
    fixture.db.prepare('UPDATE services SET is_active=1 WHERE id=1').run()
    checks.push('channels, active references, dates, two-hour slot and server-only fields validated')

    const created=await create()
    assert.match(created.request_number,/^TGR-\d{4}-\d{5}$/)
    assert.equal(created.status,'new');assert.equal(created.user_id,2);assert.equal(created.contact_phone,'+70000000002')
    assert.equal(created.total_price,1200)
    assert.equal(created.version,undefined);assert.equal(created.last_operation_id,undefined)
    assert.deepEqual(events(created.id).map((row)=>[row.from_status,row.to_status]),[[null,'new']])
    assert.equal(fixture.db.prepare('SELECT COUNT(*) AS n FROM audit_log WHERE entity_type=\'request\' AND entity_id=?').get(created.id).n,1)
    assert.equal(fixture.db.prepare('SELECT COUNT(*) AS n FROM notifications WHERE request_id=? AND user_id=2').get(created.id).n,1)
    const detail=await api(anna,`/api/requests/${created.id}`)
    assert.equal(detail.status,200);assert.equal(detail.body.data.items.length,1);assert.equal(detail.body.data.history.length,1)
    checks.push('onsite creation: number, phone snapshot, initial estimate/history/audit/notification')

    const parallel=await Promise.all(Array.from({length:4},()=>create(payload())))
    const numbers=[created,...parallel].map((row)=>row.request_number)
    assert.equal(new Set(numbers).size,numbers.length)
    assert.ok(fixture.db.prepare('SELECT request_number FROM requests WHERE id=1').get().request_number)
    assert.throws(()=>fixture.db.prepare("UPDATE requests SET request_number='TGR-2026-99998' WHERE id=?").run(created.id))
    checks.push('legacy rows numbered; concurrent creation has unique immutable numbers')

    const own=await api(anna,'/api/requests?status=new&limit=100')
    assert.equal(own.status,200);assert.ok(own.body.data.every((row)=>row.user_id===2&&row.status==='new'))
    assert.equal((await api(ivan,`/api/requests/${created.id}`)).status,404)
    const beforeForeign=counts()
    assert.equal((await api(ivan,`/api/requests/${created.id}/cancel`,{method:'PATCH'})).status,404)
    assert.deepEqual(counts(),beforeForeign)
    assert.equal((await api(admin,`/api/admin/requests/${created.id}`)).status,200)
    fixture.db.prepare("UPDATE users SET phone='+79990000099' WHERE id=2").run()
    assert.equal((await api(anna,`/api/requests/${created.id}`)).body.data.contact_phone,'+70000000002')
    fixture.db.prepare("UPDATE users SET phone='+70000000002' WHERE id=2").run()
    checks.push('owner-scoped list/detail/cancel; admin detail; immutable contact snapshot')

    const cancelled=await api(anna,`/api/requests/${created.id}/cancel`,{method:'PATCH',body:{cancel_reason:'Ремонт больше не требуется'}})
    assert.equal(cancelled.status,200);assert.equal(cancelled.body.data.status,'cancelled')
    assert.equal(cancelled.body.data.cancelled_by,'client');assert.equal(cancelled.body.data.cancel_reason,'Ремонт больше не требуется')
    const afterCancel=counts()
    assert.equal((await api(anna,`/api/requests/${created.id}/cancel`,{method:'PATCH'})).status,409)
    assert.equal((await api(admin,`/api/admin/requests/${created.id}/confirm`,{method:'PATCH',body:{manual_assignment:true}})).status,409)
    assert.deepEqual(counts(),afterCancel)
    checks.push('cancel new -> cancelled, reason/actor; repeated or invalid transitions -> 409 without events')

    const dropoff=await create(payload('dropoff'),ivan)
    assert.equal((await assign(dropoff.id,2)).status,409)
    const confirmed=await confirm(dropoff.id)
    assert.equal(confirmed.status,'confirmed');assert.equal(confirmed.needs_manual_review,1)
    assert.equal((await assign(dropoff.id,1)).status,409)
    const assigned=await assign(dropoff.id,2)
    assert.equal(assigned.status,200,JSON.stringify(assigned.body))
    assert.equal(assigned.body.data.status,'assigned');assert.equal(assigned.body.data.master_id,2)
    assert.equal(assigned.body.data.assigned_master_id,2);assert.ok(assigned.body.data.assigned_at)
    assert.equal(assigned.body.data.needs_manual_review,0)
    assert.equal(fixture.db.prepare('SELECT is_booked FROM master_schedule WHERE request_id=?').get(dropoff.id).is_booked,1)
    assert.equal((await api(ivan,`/api/requests/${dropoff.id}/cancel`,{method:'PATCH'})).status,409)
    assert.deepEqual(events(dropoff.id).map((row)=>[row.from_status,row.to_status]),[[null,'new'],['new','confirmed'],['confirmed','assigned']])
    assert.ok(fixture.db.prepare("SELECT id FROM notifications WHERE request_id=? AND user_id=5 AND type='master_assigned'").get(dropoff.id))
    checks.push('dropoff confirm/assign: guarded state machine, skill check, booking, history and both recipients')

    const reserved=parallel[3]
    await confirm(reserved.id)
    fixture.db.prepare("UPDATE stock SET reserved_quantity=2 WHERE warehouse_id=1 AND part_id=1").run()
    fixture.db.prepare("INSERT INTO request_parts(request_id,part_id,quantity,status,unit_price,reserved_quantity) VALUES (?,1,2,'reserved',1800,2)").run(reserved.id)
    const cancelConfirmed=await api(anna,`/api/requests/${reserved.id}/cancel`,{method:'PATCH'})
    assert.equal(cancelConfirmed.status,200,JSON.stringify(cancelConfirmed.body))
    assert.equal(cancelConfirmed.body.data.cancel_reason,'Отменено клиентом')
    assert.equal(fixture.db.prepare('SELECT reserved_quantity FROM stock WHERE warehouse_id=1 AND part_id=1').get().reserved_quantity,0)
    assert.equal(fixture.db.prepare('SELECT reserved_quantity FROM request_parts WHERE request_id=?').get(reserved.id).reserved_quantity,0)
    assert.deepEqual(events(reserved.id).map((row)=>row.to_status),['new','confirmed','cancelled'])
    checks.push('cancel confirmed -> cancelled releases central reservations and records the full transition chain')

    const candidate=parallel[0]
    await confirm(candidate.id)
    const rejectAssignment=async(sql,undo) => {
      fixture.db.exec(sql)
      const before=counts()
      assert.equal((await assign(candidate.id,1)).status,409)
      assert.deepEqual(counts(),before)
      fixture.db.exec(undo)
    }
    await rejectAssignment('UPDATE master_skills SET skill_level=1 WHERE master_id=1 AND service_id=1; UPDATE services SET required_skill_level=2 WHERE id=1','UPDATE services SET required_skill_level=1 WHERE id=1; UPDATE master_skills SET skill_level=3 WHERE master_id=1 AND service_id=1')
    await rejectAssignment('UPDATE masters SET is_available=0 WHERE id=1','UPDATE masters SET is_available=1 WHERE id=1')
    await rejectAssignment('UPDATE users SET is_active=0 WHERE id=4','UPDATE users SET is_active=1 WHERE id=4')
    await rejectAssignment('UPDATE masters SET is_onsite=0,is_dropoff=1 WHERE id=1','UPDATE masters SET is_onsite=1,is_dropoff=0 WHERE id=1')
    await rejectAssignment("UPDATE masters SET service_area='[\"Южный\"]' WHERE id=1","UPDATE masters SET service_area='[\"Центральный\",\"Северный\",\"Южный\"]' WHERE id=1")
    const schedule=fixture.db.prepare('SELECT id,ends_at FROM master_schedule WHERE master_id=1 ORDER BY starts_at LIMIT 1').get()
    await rejectAssignment(`UPDATE master_schedule SET ends_at='${date}T08:00:00.000Z' WHERE id=${schedule.id}`,`UPDATE master_schedule SET ends_at='${schedule.ends_at}' WHERE id=${schedule.id}`)
    const successful=await assign(candidate.id,1)
    assert.equal(successful.status,200,JSON.stringify(successful.body))
    checks.push('assignment checks skill level, active account, channel, district, availability and full duration/buffer')

    const later=await create(payload('onsite',13));await confirm(later.id)
    fixture.db.prepare('UPDATE masters SET max_daily_requests=1 WHERE id=1').run()
    assert.equal((await assign(later.id,1)).status,409)
    fixture.db.prepare('UPDATE masters SET max_daily_requests=4 WHERE id=1').run()
    const competitor=await create(payload('onsite',13));await confirm(competitor.id)
    const race=await Promise.all([assign(later.id,1),assign(competitor.id,1)])
    assert.deepEqual(race.map((result)=>result.status).sort(),[200,409])
    const winner=race.find((result)=>result.status===200).body.data
    const loserId=winner.id===later.id?competitor.id:later.id
    assert.equal(fixture.db.prepare('SELECT status FROM requests WHERE id=?').get(loserId).status,'confirmed')
    assert.equal(fixture.db.prepare('SELECT COUNT(*) AS n FROM master_schedule WHERE request_id IN (?,?)').get(later.id,competitor.id).n,1)
    assert.equal(events(loserId).length,2)
    checks.push('daily load limit and concurrent slot assignment: one winner, no orphan booking/events')

    // Provide another eligible onsite master, keeping the same 21-table model.
    fixture.db.exec("UPDATE masters SET is_onsite=1,service_area='[\"Центральный\"]' WHERE id=2; INSERT INTO master_skills(master_id,service_id,skill_level) VALUES (2,1,3)")
    const previousSlot=fixture.db.prepare('SELECT id FROM master_schedule WHERE request_id=?').get(winner.id).id
    const reassigned=await assign(winner.id,2)
    assert.equal(reassigned.status,200,JSON.stringify(reassigned.body))
    assert.equal(reassigned.body.data.master_id,2)
    assert.equal(fixture.db.prepare('SELECT is_booked FROM master_schedule WHERE id=?').get(previousSlot).is_booked,0)
    assert.equal(fixture.db.prepare('SELECT master_id FROM master_schedule WHERE request_id=?').get(winner.id).master_id,2)
    assert.equal(fixture.db.prepare('SELECT is_booked FROM master_schedule WHERE id=?').get(schedule.id).is_booked,1)
    checks.push('reassignment before repair switches master and frees old reservation atomically')

    const noAnswerRequest=parallel[1]
    const statusTime=fixture.db.prepare('SELECT status_changed_at FROM requests WHERE id=?').get(noAnswerRequest.id).status_changed_at
    for(let attempt=1;attempt<=4;attempt++) {
      const result=await api(admin,`/api/admin/requests/${noAnswerRequest.id}/no-answer`,{method:'POST',body:{comment:'Попытка связи'}})
      assert.equal(result.status,200,JSON.stringify(result.body));assert.equal(result.body.data.status,'new')
      assert.equal(result.body.data.no_answer_count,attempt)
      assert.equal(result.body.data.needs_manual_review,attempt>=3?1:0)
    }
    assert.equal(fixture.db.prepare('SELECT status_changed_at FROM requests WHERE id=?').get(noAnswerRequest.id).status_changed_at,statusTime)
    assert.equal(fixture.db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE request_id=? AND type='manual_review'").get(noAnswerRequest.id).n,1)
    assert.equal((await api(admin,`/api/admin/requests/${created.id}/no-answer`,{method:'POST'})).status,409)
    checks.push('no-answer preserves status/clock, flags 3 attempts in 48h and notifies admin once')

    const windowRequest=parallel[2]
    for(let i=0;i<2;i++) assert.equal((await api(admin,`/api/admin/requests/${windowRequest.id}/no-answer`,{method:'POST'})).status,200)
    fixture.db.prepare("UPDATE request_status_history SET created_at=? WHERE request_id=? AND event_type='no_answer'").run(new Date(Date.now()-49*3600000).toISOString(),windowRequest.id)
    const recent=await api(admin,`/api/admin/requests/${windowRequest.id}/no-answer`,{method:'POST'})
    assert.equal(recent.body.data.no_answer_count,1);assert.equal(recent.body.data.needs_manual_review,0)
    const simultaneous=await Promise.all([api(admin,`/api/admin/requests/${windowRequest.id}/no-answer`,{method:'POST'}),api(admin,`/api/admin/requests/${windowRequest.id}/no-answer`,{method:'POST'})])
    assert.deepEqual(simultaneous.map((row)=>row.status),[200,200])
    assert.deepEqual(simultaneous.map((row)=>row.body.data.no_answer_count).sort(),[2,3])
    checks.push('no-answer rolling 48-hour window ignores old attempts; concurrent attempts count exactly once each')

    const byName=await api(admin,'/api/admin/requests?search='+encodeURIComponent('анна')+'&limit=100')
    assert.equal(byName.status,200,JSON.stringify(byName.body));assert.ok(byName.body.data.length>0)
    assert.ok(byName.body.data.every((row)=>row.user_id===2))
    assert.equal((await api(admin,'/api/admin/requests?search='+encodeURIComponent('Очень длинное русское имя '.repeat(3)))).status,200)
    const byNumber=await api(admin,'/api/admin/requests?search='+encodeURIComponent(dropoff.request_number))
    assert.equal(byNumber.body.data.length,1);assert.equal(byNumber.body.data[0].id,dropoff.id)
    assert.equal((await api(admin,'/api/admin/requests?search=%25')).body.pagination.total,0)
    assert.equal((await api(admin,'/api/admin/requests?search=%5B')).body.pagination.total,0)
    assert.equal((await api(admin,'/api/admin/requests?search=*')).body.pagination.total,0)
    const byPhone=await api(admin,'/api/admin/requests?search='+encodeURIComponent('+70000000003'))
    assert.ok(byPhone.body.data.some((row)=>row.id===dropoff.id))
    const manual=await api(admin,'/api/admin/requests?needs_manual_review=1&status=new')
    assert.ok(manual.body.data.some((row)=>row.id===noAnswerRequest.id))
    assert.ok((await api(anna,'/api/requests?status=cancelled')).body.data.some((row)=>row.id===created.id))
    checks.push('admin number/name/phone search, literal wildcards, status/manual-review filters and pagination')

    const beforeFailure=counts()
    fixture.db.exec("CREATE TRIGGER test_fail_create_notice BEFORE INSERT ON notifications WHEN NEW.type='request_created' BEGIN SELECT RAISE(ABORT,'forced notification failure'); END")
    try {
      const result=await api(anna,'/api/requests',{method:'POST',body:payload()})
      assert.equal(result.status,500);assert.ok(!JSON.stringify(result.body).includes('forced notification'))
      assert.deepEqual(counts(),beforeFailure)
    } finally {fixture.db.exec('DROP TRIGGER test_fail_create_notice')}
    const rollbackRequest=await create(payload('onsite',16))
    const beforeConfirm=counts()
    fixture.db.exec(`CREATE TRIGGER test_fail_status_notice BEFORE INSERT ON notifications WHEN NEW.request_id=${rollbackRequest.id} AND NEW.type='status_changed' BEGIN SELECT RAISE(ABORT,'forced status notice failure'); END`)
    try {
      assert.equal((await api(admin,`/api/admin/requests/${rollbackRequest.id}/confirm`,{method:'PATCH',body:{manual_assignment:true}})).status,500)
      assert.equal(fixture.db.prepare('SELECT status FROM requests WHERE id=?').get(rollbackRequest.id).status,'new')
      assert.deepEqual(counts(),beforeConfirm)
    } finally {fixture.db.exec('DROP TRIGGER test_fail_status_notice')}
    checks.push('injected notification failures roll back request/estimate/history/audit/queue atomically')

    await confirm(rollbackRequest.id)
    const beforeAssignmentFailure=counts()
    fixture.db.exec(`CREATE TRIGGER test_fail_assign_notice BEFORE INSERT ON notifications WHEN NEW.request_id=${rollbackRequest.id} AND NEW.type='master_assigned' BEGIN SELECT RAISE(ABORT,'forced assignment notice failure'); END`)
    try {
      assert.equal((await assign(rollbackRequest.id,1)).status,500)
      assert.deepEqual(counts(),beforeAssignmentFailure)
      assert.equal(fixture.db.prepare('SELECT status FROM requests WHERE id=?').get(rollbackRequest.id).status,'confirmed')
      assert.equal(fixture.db.prepare('SELECT COUNT(*) AS n FROM master_schedule WHERE request_id=?').get(rollbackRequest.id).n,0)
    } finally {fixture.db.exec('DROP TRIGGER test_fail_assign_notice')}
    checks.push('assignment notification failure also rolls back master and schedule booking')
    const cancellationRace=await Promise.all([assign(rollbackRequest.id,1),api(anna,`/api/requests/${rollbackRequest.id}/cancel`,{method:'PATCH'})])
    assert.deepEqual(cancellationRace.map((row)=>row.status).sort(),[200,409])
    const final=fixture.db.prepare('SELECT status FROM requests WHERE id=?').get(rollbackRequest.id).status
    assert.equal(fixture.db.prepare('SELECT COUNT(*) AS n FROM master_schedule WHERE request_id=?').get(rollbackRequest.id).n,final==='assigned'?1:0)
    assert.deepEqual(events(rollbackRequest.id).map((row)=>row.to_status),['new','confirmed',final])
    checks.push('concurrent cancel/assign keeps a valid state/history and matching booking')

    await fixture.restart()
    const saved=await api(ivan,`/api/requests/${dropoff.id}`)
    assert.equal(saved.status,200);assert.equal(saved.body.data.request_number,dropoff.request_number)
    assert.equal(saved.body.data.status,'assigned');assert.equal(saved.body.data.history.length,3)
    assert.equal(fixture.db.prepare('PRAGMA foreign_key_check').all().length,0)
    checks.push('requests/history and authenticated access persist across restart; FK integrity clean')
    return checks
  } finally {await fixture.dispose()}
}


