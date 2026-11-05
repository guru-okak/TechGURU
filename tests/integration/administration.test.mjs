import test from 'node:test'
import assert from 'node:assert/strict'
import {DatabaseSync} from 'node:sqlite'
import {createD1Fixture} from '../helpers/d1-fixture.mjs'
test('D1 administration: directories, accounts, schedule, reports, backup and role isolation',async()=>{
 const f=await createD1Fixture()
 try{
  const admin=await f.login('admin@techguru.example','AdminDemo2026!'),client=await f.login('anna@techguru.example','ClientDemo2026!')
  const call=async(path,body,method='POST',status=200)=>{const r=await f.api(admin,path,{method,body});assert.equal(r.status,status,JSON.stringify({path,...r.body}));return r.body.data}
  const service=await call('/api/admin/records/services',{name:'Тестовая услуга',equipment_category:'Ноутбуки',base_price_cents:12345,average_duration_minutes:60,required_skill_level:1,is_active:1})
  assert.equal(f.db.prepare('SELECT base_price_cents FROM services WHERE id=?').get(service.id).base_price_cents,12345)
  await call('/api/admin/records/services/'+service.id,{base_price_cents:45678},'PATCH')
  const supplier=await call('/api/admin/records/suppliers',{name:'Тестовый поставщик',is_active:1})
  const part=await call('/api/admin/records/parts',{name:'Тестовая деталь',sku:'TEST-PART',unit_price_cents:9950,supplier_id:supplier.id,min_stock:2,is_active:1})
  await call('/api/business/orders/drafts',{})
  const order=f.db.prepare("SELECT id FROM purchase_orders WHERE supplier_id=? AND status='draft'").get(supplier.id)
  await call(`/api/business/orders/${order.id}/items`,{items:[{part_id:part.id,quantity:6}]})
  await call(`/api/business/orders/${order.id}/items`,{items:[{part_id:1,quantity:6}]},'POST',422)
  assert.equal(f.db.prepare('SELECT quantity FROM purchase_order_items WHERE purchase_order_id=?').get(order.id).quantity,6)
  await call(`/api/business/orders/${order.id}/advance`,{})
  await call(`/api/business/orders/${order.id}/items`,{items:[{part_id:part.id,quantity:2}]},'POST',409)
  const master=await call('/api/admin/records/users',{full_name:'Тестовый мастер',email:'newmaster@example.com',phone:'+79990001234',role:'master',is_active:1,password:'StrongPassword2026!'})
  const profile=f.db.prepare('SELECT * FROM masters WHERE user_id=?').get(master.id)
  assert.ok(profile);assert.ok(f.db.prepare('SELECT id FROM warehouses WHERE master_id=?').get(profile.id))
  await call('/api/masters/'+profile.id,{is_onsite:1,is_dropoff:1,service_area:['Центральный'],skills:[{service_id:service.id,skill_level:2}]},'PATCH')
  const start=new Date(Date.now()+5*86400000).toISOString().slice(0,10)+'T07:00:00.000Z',end=start.replace('T07:','T09:')
  await call('/api/schedule',{master_id:profile.id,starts_at:start,ends_at:end})
  await call('/api/schedule',{master_id:profile.id,starts_at:start,ends_at:end},'POST',409)
  await call('/api/admin/records/users/'+master.id,{role:'admin'},'PATCH',409)
  await call('/api/admin/records/users/1',{is_active:0},'PATCH',409)
  assert.equal((await f.api(client,'/api/admin/jobs',{method:'POST',body:{}})).status,403)
  assert.equal((await f.api(client,'/api/workspace')).body.data.users.length,1)
  await call('/api/profile',{full_name:'Администратор проверки',email:'admin@techguru.example',phone:'+70000000001',address:null},'PATCH')
  const session=f.jar();session.cookies=new Map(admin.cookies)
  const headers={Cookie:[...session.cookies].map(([k,v])=>k+'='+v).join('; ')}
  for(const type of ['requests','revenue','top','repair','masters','stock','audit']){
   const response=await fetch(f.base+'api/admin/reports/'+type+'?days=30',{headers});assert.equal(response.status,200);assert.match(response.headers.get('Content-Type'),/text\/csv/);assert.ok((await response.text()).length>10)
  }
  const response=await fetch(f.base+'api/admin/backup',{headers});assert.equal(response.status,200)
  const restored=new DatabaseSync(':memory:')
  try{restored.exec(await response.text());assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(restored.prepare('PRAGMA foreign_key_check').all().length,0);assert.equal(restored.prepare('SELECT base_price_cents FROM services WHERE id=?').get(service.id).base_price_cents,45678)}finally{restored.close()}
  const tick=await fetch(f.base+'cdn-cgi/local/scheduled?cron=0%20*%20*%20*%20*');assert.equal(tick.status,200)
  const before=f.db.prepare('SELECT COUNT(*) n FROM notifications').get().n
  await fetch(f.base+'cdn-cgi/local/scheduled?cron=0%20*%20*%20*%20*')
  assert.equal(f.db.prepare('SELECT COUNT(*) n FROM notifications').get().n,before)
  const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10)
  const operatorRequest=await call('/api/admin/requests',{user_id:2,service_id:1,service_mode:'onsite',client_address:'Москва, ул. Центральная, 10',service_district:'Центральный',preferred_datetime:tomorrow+'T07:00:00.000Z',preferred_slot:'10:00-12:00',description:'Обращение по телефону',comment:'Вербальное согласие получено'},'POST',201)
  assert.equal(operatorRequest.comment,'Вербальное согласие получено')
  const password=await f.api(client,'/api/profile/password',{method:'POST',body:{current_password:'ClientDemo2026!',new_password:'ChangedPassword2026!'}})
  assert.equal(password.status,200);assert.equal((await f.api(client,'/api/auth/me')).status,401)
  const renewed=await f.login('anna@techguru.example','ChangedPassword2026!');assert.equal((await f.api(renewed,'/api/auth/me')).status,200)
  assert.equal(f.db.prepare('PRAGMA foreign_key_check').all().length,0)
 }finally{await f.dispose()}
})
