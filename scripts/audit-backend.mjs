// Read current behavior on an isolated D1 fixture; never touches .local/d1.
import { createD1Fixture } from '../tests/helpers/d1-fixture.mjs'
import { writeFileSync } from 'node:fs'

const fixture = await createD1Fixture()
try {
  const client = await fixture.login('anna@techguru.example', 'ClientDemo2026!')
  const admin = await fixture.login('admin@techguru.example', 'AdminDemo2026!')
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const payload = {
    service_id: 1, service_mode: 'onsite', client_address: 'Москва, Центральная улица, 10',
    service_district: 'Центральный', description: 'Не работает холодильник',
    preferred_datetime: `${date}T07:00:00.000Z`, preferred_slot: '10:00-12:00',
  }
  const longPayload = { ...payload, description: 'Я'.repeat(2000) }
  const long = await fixture.api(client, '/api/requests', { method: 'POST', body: longPayload })
  const created = await fixture.api(client, '/api/requests', { method: 'POST', body: payload })
  if (created.status !== 201) throw new Error('Audit fixture request creation failed')
  // Remove only this disposable fixture's unbooked availability.
  fixture.db.exec('DELETE FROM master_schedule WHERE is_booked=0')
  const confirm = await fixture.api(admin, `/api/admin/requests/${created.body.data.id}/confirm`, { method: 'PATCH' })
  const unchanged = fixture.db.prepare('SELECT status,needs_manual_review FROM requests WHERE id=?').get(created.body.data.id)
  const routes = {}
  for (const route of ['/api/profile', '/api/notifications', '/api/masters', '/api/stock', '/api/purchase-orders', '/api/admin/users', '/api/admin/reports/requests']) {
    routes[route] = (await fixture.api(admin, route)).status
  }
  const result = {
    date: '2026-11-02', isolatedDatabase: true,
    longCyrillicDescription: { characters: 2000, bytes: Buffer.byteLength(JSON.stringify(longPayload)), status: long.status, code: long.body.error?.code },
    confirmationWithoutAvailability: { status: confirm.status, code: confirm.body.error?.code, stored: unchanged },
    missingRouteResponses: routes,
  }
  writeFileSync(new URL('../docs/Аудит_сервера_дополнительные_проверки_2026-11-02.json', import.meta.url), JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result, null, 2))
} finally { await fixture.dispose() }
