import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pbkdf2Sync } from 'node:crypto'
import worker from '../../server/index.ts'
import { buildDemoSeed, demoAccounts } from '../../db/seeds/demo.mjs'

const migration = readdirSync(new URL('../../db/migrations/', import.meta.url)).filter((name) => name.endsWith('.sql')).sort().map((name) => readFileSync(new URL('../../db/migrations/' + name, import.meta.url), 'utf8')).join('\n')
const seed = await buildDemoSeed()
function database(t) {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys=ON;')
  db.exec(migration)
  db.exec(seed)
  t.after(() => db.close())
  return db
}
// Executes the same repository SQL against real SQLite; HTTP is the actual Worker fetch handler.
// A separate Wrangler smoke test checks the actual local D1 runtime.
function adapter(db) {
  return {
    prepare(sql) {
      let values = []
      return {
        bind(...args) { values = args; return this },
        async first() { return db.prepare(sql).get(...values) ?? null },
        async all() { return { results: db.prepare(sql).all(...values), success: true } },
      }
    },
  }
}
const envFor = (db, extra = {}) => ({ DB: adapter(db), APP_ENV: 'local', ENABLE_LOCAL_CHECKS: 'true', ...extra })
const request = (pathname, options) => new Request('http://127.0.0.1:8787' + pathname, options)

test('migration creates exactly 22 domain tables, canonical columns and valid relations', (t) => {
  const db = database(t)
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get().n, 22)
  const columns = db.prepare('PRAGMA table_info(requests)').all().map((r) => r.name)
  for (const name of ['preferred_datetime', 'preferred_slot', 'client_address', 'dropoff_point_id', 'description', 'photos']) assert.ok(columns.includes(name))
  for (const name of ['desired_datetime', 'address', 'service_point_id', 'issue_description']) assert.ok(!columns.includes(name))
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length, 0)
  assert.equal(db.prepare('PRAGMA quick_check').get().quick_check, 'ok')
})

test('seed is repeatable, contains required accounts, different master skills and preserves edits', (t) => {
  const db = database(t)
  db.exec("UPDATE stock SET quantity=42 WHERE id=1; UPDATE users SET full_name='Сохранённое изменение' WHERE email='anna@techguru.example';")
  db.exec(seed)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 5)
  assert.deepEqual(db.prepare('SELECT role,COUNT(*) AS n FROM users GROUP BY role ORDER BY role').all().map((r) => [r.role, r.n]), [['admin', 1], ['client', 2], ['master', 2]])
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM services').get().n, 22)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM requests').get().n, 2)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM parts').get().n, 5)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM stock').get().n, 15)
  assert.equal(db.prepare('SELECT quantity FROM stock WHERE id=1').get().quantity, 42)
  assert.equal(db.prepare("SELECT full_name FROM users WHERE email='anna@techguru.example'").get().full_name, 'Сохранённое изменение')
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM master_skills WHERE master_id=1').get().n, 3)
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM master_skills WHERE master_id=2').get().n, 2)
  assert.deepEqual(db.prepare('SELECT is_onsite,is_dropoff FROM masters ORDER BY id').all().map((r) => [r.is_onsite, r.is_dropoff]), [[1, 0], [0, 1]])
})

test('seed stores real salted PBKDF2 hashes rather than passwords or demo placeholders', (t) => {
  const db = database(t)
  const salts = new Set()
  for (const account of demoAccounts) {
    const hash = db.prepare('SELECT password_hash FROM users WHERE email=?').get(account.email).password_hash
    const [, algorithm, parameters, salt, digest] = hash.split('$')
    assert.equal(algorithm, 'pbkdf2-sha256')
    const iterations = Number(parameters.slice(2))
    assert.ok(iterations >= 100000)
    assert.equal(Buffer.from(salt, 'base64').length, 16)
    assert.equal(pbkdf2Sync(account.password, Buffer.from(salt, 'base64'), iterations, 32, 'sha256').toString('base64'), digest)
    salts.add(salt)
  }
  assert.equal(salts.size, 5)
})

test('database rejects broken FKs, channels, JSON, quantities and invalid enums', (t) => {
  const db = database(t)
  for (const sql of [
    'UPDATE requests SET user_id=99999 WHERE id=1',
    'UPDATE requests SET client_address=NULL WHERE id=1',
    'UPDATE requests SET dropoff_point_id=NULL WHERE id=2',
    "UPDATE requests SET photos='{}' WHERE id=1",
    "UPDATE requests SET status='invented' WHERE id=1",
    "UPDATE requests SET status='ready_for_pickup',master_id=1 WHERE id=1",
    'UPDATE stock SET quantity=-1 WHERE id=1',
    'UPDATE stock SET reserved_quantity=quantity+1 WHERE id=1',
    'UPDATE stock SET quantity=0.5 WHERE id=1',
    "INSERT INTO warehouses(name,type) VALUES ('Duplicate','central')",
  ]) assert.throws(() => db.exec(sql), undefined, sql)
})

test('ratings require the owner, matching master, completed/closed state and uniqueness', (t) => {
  const db = database(t)
  const insert = db.prepare('INSERT INTO ratings(request_id,user_id,master_id,rating) VALUES (1,?,?,5)')
  assert.throws(() => insert.run(2, 1))
  db.exec("UPDATE requests SET master_id=1,status='confirmed' WHERE id=1; UPDATE requests SET status='assigned' WHERE id=1; UPDATE requests SET status='in_progress' WHERE id=1; UPDATE requests SET status='completed' WHERE id=1")
  assert.throws(() => insert.run(3, 1))
  assert.throws(() => insert.run(2, 2))
  insert.run(2, 1)
  assert.throws(() => insert.run(2, 1))
  db.exec("UPDATE requests SET master_id=2,status='confirmed' WHERE id=2; UPDATE requests SET status='assigned' WHERE id=2; UPDATE requests SET status='in_progress' WHERE id=2; UPDATE requests SET status='ready_for_pickup' WHERE id=2; UPDATE requests SET status='completed',completed_at='2020-01-01T00:00:00.000Z' WHERE id=2; UPDATE requests SET status='closed' WHERE id=2")
  db.exec('INSERT INTO ratings(request_id,user_id,master_id,rating) VALUES (2,3,2,4)')
})

test('partial reservation and mixed use/return quantities retain their invariants', (t) => {
  const db = database(t)
  db.exec("INSERT INTO request_parts(request_id,part_id,quantity,status,unit_price,reserved_quantity) VALUES (1,1,5,'reserved',1800,3)")
  assert.throws(() => db.exec('UPDATE request_parts SET issued_quantity=3 WHERE id=1'))
  db.exec("UPDATE request_parts SET reserved_quantity=0,issued_quantity=3,status='issued' WHERE id=1")
  db.exec("UPDATE request_parts SET used_quantity=2,returned_quantity=1,status='used' WHERE id=1")
  assert.throws(() => db.exec('UPDATE request_parts SET returned_quantity=2 WHERE id=1'))
})

test('file-backed database keeps changes after close and reopen', () => {
  const folder = mkdtempSync(path.join(tmpdir(), 'techguru-persistence-'))
  const filename = path.join(folder, 'test.sqlite')
  let db
  try {
    db = new DatabaseSync(filename)
    db.exec(migration)
    db.exec(seed)
    db.exec("INSERT INTO audit_log(role,action,entity_type,details) VALUES ('system','local_persistence_check','development','{\"message\":\"restart-check\"}')")
    db.close()
    db = new DatabaseSync(filename)
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n, 5)
    assert.equal(db.prepare("SELECT json_extract(details,'$.message') AS message FROM audit_log").get().message, 'restart-check')
  } finally {
    db?.close()
    assert.equal(path.dirname(path.resolve(folder)), path.resolve(tmpdir()))
    assert.ok(path.basename(folder).startsWith('techguru-persistence-'))
    rmSync(folder, { recursive: true, force: true })
  }
})

test('Worker reads catalog and health through repositories, no private user fields', async (t) => {
  const db = database(t)
  const env = envFor(db)
  const health = await worker.fetch(request('/api/health'), env)
  assert.equal(health.status, 200)
  assert.equal((await health.json()).data.domainTables, 22)
  assert.ok(health.headers.get('X-Request-Id'))
  const catalog = await worker.fetch(request('/api/services?limit=2&offset=1'), env)
  const body = await catalog.json()
  assert.equal(body.data.length, 2)
  assert.equal(body.data[0].id, 2)
  assert.ok(!JSON.stringify(body).includes('password_hash'))
  const points = await worker.fetch(request('/api/service-points'), env)
  assert.equal((await points.json()).data.length, 2)
  const summary = await worker.fetch(request('/api/dev/database'), env)
  assert.equal((await summary.json()).data.counts.users, 5)
})

test('Worker validates inputs and consistently returns 400/404/405/413/415/422', async (t) => {
  const db = database(t)
  const env = envFor(db)
  const cases = [
    [request('/api/missing'), 404],
    [request('/api/services', { method: 'POST' }), 405],
    [request('/api/services?limit=-1'), 422],
    [request('/api/dev/persistence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }), 400],
    [request('/api/dev/persistence', { method: 'POST', body: '{}' }), 415],
    [request('/api/dev/persistence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '' }) }), 422],
    [request('/api/dev/persistence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'x'.repeat(40000) }) }), 413],
  ]
  for (const [req, status] of cases) {
    const response = await worker.fetch(req, env)
    assert.equal(response.status, status)
    const body = await response.json()
    assert.ok(body.error.code)
    assert.ok(body.requestId)
    if (status === 405) assert.equal(response.headers.get('Allow'), 'GET')
  }
})

test('local persistence route writes to the DB and is unavailable outside local checks', async (t) => {
  const db = database(t)
  const env = envFor(db)
  const post = () => request('/api/dev/persistence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Сохранилось' }) })
  assert.equal((await worker.fetch(post(), env)).status, 201)
  const rows = await worker.fetch(request('/api/dev/persistence'), env)
  assert.equal((await rows.json()).data[0].message, 'Сохранилось')
  assert.equal((await worker.fetch(post(), envFor(db, { APP_ENV: 'production' }))).status, 404)
  assert.equal((await worker.fetch(post(), envFor(db, { ENABLE_LOCAL_CHECKS: 'false' }))).status, 404)
  assert.equal((await worker.fetch(new Request('https://example.com/api/dev/database'), env)).status, 404)
  const crossOrigin = post()
  crossOrigin.headers.set('Origin', 'https://example.com')
  assert.equal((await worker.fetch(crossOrigin, env)).status, 403)
})

test('unexpected database error returns generic JSON without SQL or secrets', async () => {
  const faultyDB = { prepare() { throw new Error('SELECT password_hash secret SQL details') } }
  const response = await worker.fetch(request('/api/health'), { DB: faultyDB, APP_ENV: 'local' })
  assert.equal(response.status, 500)
  const text = await response.text()
  assert.ok(!text.includes('password_hash'))
  assert.ok(!text.includes('SELECT'))
})





