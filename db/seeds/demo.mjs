import { hashPassword } from '../../server/security/passwords.ts'

export const demoAccounts = [
  { name: 'Администратор TechGURU', phone: '+70000000001', email: 'admin@techguru.example', role: 'admin', address: null, password: 'AdminDemo2026!' },
  { name: 'Анна Смирнова', phone: '+70000000002', email: 'anna@techguru.example', role: 'client', address: 'Москва, ул. Центральная, 10', password: 'ClientDemo2026!' },
  { name: 'Иван Соколов', phone: '+70000000003', email: 'ivan@techguru.example', role: 'client', address: 'Москва, ул. Северная, 5', password: 'ClientDemo2026!' },
  { name: 'Сергей Иванов', phone: '+70000000004', email: 'onsite@techguru.example', role: 'master', address: null, password: 'MasterDemo2026!' },
  { name: 'Пётр Петров', phone: '+70000000005', email: 'dropoff@techguru.example', role: 'master', address: null, password: 'MasterDemo2026!' },
]
const q = (value) => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`
const userId = (email) => `(SELECT id FROM users WHERE email=${q(email)})`
const serviceId = (name) => `(SELECT id FROM services WHERE name=${q(name)} ORDER BY id LIMIT 1)`
const masterId = (email) => `(SELECT id FROM masters WHERE user_id=${userId(email)})`
const partId = (sku) => `(SELECT id FROM parts WHERE sku=${q(sku)})`
const requestId = (marker) => `(SELECT id FROM requests WHERE comment=${q(marker)} ORDER BY id LIMIT 1)`

export async function buildDemoSeed() {
  const sql = ['-- Generated local demo seed. No DROP, DELETE or REPLACE.']
  for (const account of demoAccounts) {
    const hash = await hashPassword(account.password)
    sql.push(`INSERT INTO users(full_name,full_name_fold,phone,email,role,address,password_hash) VALUES (${q(account.name)},${q(account.name.toLocaleLowerCase('ru-RU'))},${q(account.phone)},${q(account.email)},${q(account.role)},${q(account.address)},${q(hash)}) ON CONFLICT(email) DO NOTHING;`)
  }
  const services = [
    ['Диагностика холодильника', 'Холодильники', 1200, 60, 1],
    ['Ремонт стиральной машины', 'Стиральные машины', 2500, 120, 2],
    ['Ремонт варочной панели', 'Плиты и варочные панели', 3000, 120, 2],
    ['Замена экрана смартфона', 'Мобильные телефоны', 2000, 90, 2],
    ['Чистка ноутбука', 'Ноутбуки', 1500, 60, 1],
  ]
  services.push(...[["Диагностика смартфона", "Смартфоны", "500", "30", "1"], ["Замена аккумулятора смартфона", "Смартфоны", "1500", "40", "1"], ["Замена клавиатуры ноутбука", "Ноутбуки и ПК", "2400", "90", "2"], ["Установка Windows и ПО", "Ноутбуки и ПК", "1000", "60", "1"], ["Ремонт планшета (замена экрана)", "Планшеты", "3500", "120", "2"], ["Диагностика телевизора", "Телевизоры", "700", "40", "1"], ["Замена подсветки телевизора", "Телевизоры", "4500", "180", "3"], ["Ремонт холодильника", "Бытовая техника", "2800", "150", "3"], ["Ремонт принтера", "Оргтехника", "1800", "90", "2"], ["Ремонт монитора", "Ноутбуки и ПК", "2500", "120", "2"], ["Ремонт наушников", "Аудио", "900", "60", "1"], ["Ремонт умных часов", "Гаджеты", "1900", "90", "2"], ["Ремонт игровых приставок", "Гаджеты", "2200", "120", "2"], ["Ремонт фотоаппаратов", "Гаджеты", "2800", "150", "3"], ["Ремонт посудомоечных машин", "Бытовая техника", "2400", "120", "2"], ["Ремонт пылесосов", "Бытовая техника", "1600", "90", "1"], ["Ремонт микроволновых печей", "Бытовая техника", "1700", "90", "2"]])
  for (const [name, category, price, duration, level] of services) {
    sql.push(`INSERT INTO services(name,equipment_category,base_price,base_price_cents,average_duration_minutes,required_skill_level) SELECT ${q(name)},${q(category)},${price},${price*100},${duration},${level} WHERE NOT EXISTS(SELECT 1 FROM services WHERE name=${q(name)});`)
  }
  sql.push("INSERT INTO service_points(name,address) SELECT 'Центральный сервисный центр','Москва, ул. Сервисная, 1' WHERE NOT EXISTS(SELECT 1 FROM service_points WHERE name='Центральный сервисный центр');")
  sql.push("INSERT INTO service_points(name,address,working_hours) SELECT 'Северная сервисная точка','Москва, ул. Полярная, 4','Пн–Сб, 10:00–20:00' WHERE NOT EXISTS(SELECT 1 FROM service_points WHERE name='Северная сервисная точка');")
  sql.push(`INSERT INTO masters(user_id,experience_years,service_area,max_daily_requests,is_onsite,is_dropoff) VALUES (${userId('onsite@techguru.example')},7,'["Центральный","Северный","Южный"]',4,1,0) ON CONFLICT(user_id) DO NOTHING;`)
  sql.push(`INSERT INTO masters(user_id,experience_years,service_area,max_daily_requests,is_onsite,is_dropoff) VALUES (${userId('dropoff@techguru.example')},5,'[]',5,0,1) ON CONFLICT(user_id) DO NOTHING;`)
  for (const [index, service] of services.slice(0,5).entries()) {
    const email = index < 3 ? 'onsite@techguru.example' : 'dropoff@techguru.example'
    sql.push(`INSERT INTO master_skills(master_id,service_id,skill_level) VALUES (${masterId(email)},${serviceId(service[0])},${index < 3 ? 3 : 2}) ON CONFLICT(master_id,service_id) DO NOTHING;`)
  }
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const date = tomorrow.toISOString().slice(0, 10)
  // Separate bookable windows; include full repair duration and travel buffer.
  for(let offset=0;offset<14;offset++){
   const day=new Date(date+'T12:00:00.000Z');day.setUTCDate(day.getUTCDate()+offset);const stamp=day.toISOString().slice(0,10)
   for(const email of ['onsite@techguru.example','dropoff@techguru.example'])for(const minute of [420,600,780]){
    const iso=m=>`${stamp}T${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:00.000Z`
    sql.push(`INSERT INTO master_schedule(master_id,starts_at,ends_at) SELECT ${masterId(email)},${q(iso(minute))},${q(iso(minute+150))} WHERE NOT EXISTS(SELECT 1 FROM master_schedule WHERE master_id=${masterId(email)} AND starts_at<${q(iso(minute+150))} AND ends_at>${q(iso(minute))}) ON CONFLICT(master_id,starts_at) DO NOTHING;`)
   }
  }
  sql.push("INSERT INTO suppliers(name,phone,email) SELECT 'ДемоКомплект','+70000000010','parts@techguru.example' WHERE NOT EXISTS(SELECT 1 FROM suppliers WHERE name='ДемоКомплект');")
  sql.push("INSERT INTO warehouses(name,type) SELECT 'Центральный склад','central' WHERE NOT EXISTS(SELECT 1 FROM warehouses WHERE type='central');")
  for (const email of ['onsite@techguru.example', 'dropoff@techguru.example']) {
    sql.push(`INSERT INTO warehouses(name,type,master_id) VALUES (${q('Мобильный склад ' + email)},'master',${masterId(email)}) ON CONFLICT(master_id) DO NOTHING;`)
  }
  const parts = [
    ['Термостат холодильника', 'DEMO-THERMO', 1800, 3, 8],
    ['Насос стиральной машины', 'DEMO-PUMP', 2400, 2, 5],
    ['Модуль варочной панели', 'DEMO-HOB', 4500, 2, 1],
    ['Экран смартфона', 'DEMO-SCREEN', 6000, 2, 4],
    ['Термопаста', 'DEMO-PASTE', 500, 5, 12],
  ]
  for (const [name, sku, price, min, quantity] of parts) {
    sql.push(`INSERT INTO parts(name,sku,unit_price,unit_price_cents,supplier_id,min_stock) VALUES (${q(name)},${q(sku)},${price},${price*100},(SELECT id FROM suppliers WHERE name='ДемоКомплект' ORDER BY id LIMIT 1),${min}) ON CONFLICT(sku) DO NOTHING;`)
    sql.push(`INSERT INTO stock(warehouse_id,part_id,quantity) VALUES ((SELECT id FROM warehouses WHERE type='central'),${partId(sku)},${quantity}) ON CONFLICT(warehouse_id,part_id) DO NOTHING;`)
    for (const email of ['onsite@techguru.example', 'dropoff@techguru.example']) {
      sql.push(`INSERT INTO stock(warehouse_id,part_id,quantity) VALUES ((SELECT id FROM warehouses WHERE master_id=${masterId(email)}),${partId(sku)},0) ON CONFLICT(warehouse_id,part_id) DO NOTHING;`)
    }
  }
  const examples = [
    { marker: 'demo:v1:onsite', email: 'anna@techguru.example', service: services[0][0], mode: 'onsite', address: 'Москва, ул. Центральная, 10', district: 'Центральный', point: 'NULL', phone: '+70000000002', description: 'Холодильник плохо охлаждает' },
    { marker: 'demo:v1:dropoff', email: 'ivan@techguru.example', service: services[4][0], mode: 'dropoff', address: null, district: null, point: "(SELECT id FROM service_points WHERE name='Центральный сервисный центр' ORDER BY id LIMIT 1)", phone: '+70000000003', description: 'Ноутбук перегревается' },
  ]
  for (const r of examples) {
    sql.push(`INSERT INTO requests(user_id,service_id,service_mode,client_address,service_district,dropoff_point_id,preferred_datetime,preferred_slot,description,contact_phone,comment) SELECT ${userId(r.email)},${serviceId(r.service)},${q(r.mode)},${q(r.address)},${q(r.district)},${r.point},${q(date + 'T07:00:00.000Z')},'10:00-12:00',${q(r.description)},${q(r.phone)},${q(r.marker)} WHERE NOT EXISTS(SELECT 1 FROM requests WHERE comment=${q(r.marker)});`)
    sql.push(`INSERT INTO request_status_history(request_id,to_status,changed_by_role,comment) SELECT ${requestId(r.marker)},'new','system','Демонстрационная заявка' WHERE NOT EXISTS(SELECT 1 FROM request_status_history WHERE request_id=${requestId(r.marker)});`)
    sql.push(`INSERT INTO notifications(user_id,request_id,type,message,event_key) VALUES (${userId(r.email)},${requestId(r.marker)},'request_created','Демонстрационная заявка создана',${q(r.marker + ':created')}) ON CONFLICT(event_key) DO NOTHING;`)
    sql.push(`INSERT INTO notification_queue(user_id,request_id,channel,recipient,subject,message,event_key) VALUES (${userId(r.email)},${requestId(r.marker)},'email',${q(r.email)},'Заявка создана','Демонстрация очереди без отправки',${q(r.marker + ':email')}) ON CONFLICT(event_key) DO NOTHING;`)
  }
  return sql.join('\n') + '\n'
}
