import { runRequestChecks } from '../tests/helpers/requests-d1.mjs'
import { runAuthChecks } from '../tests/helpers/auth-d1.mjs'
import assert from 'node:assert/strict'
import { createD1Fixture } from '../tests/helpers/d1-fixture.mjs'

const marker = `persistence-${crypto.randomUUID()}`
let runtime
try {
  runtime = await createD1Fixture()
  let base = runtime.base
  const health = await fetch(new URL('/api/health', base))
  assert.equal(health.status, 200, 'Apply migrations before smoke test')
  assert.equal((await health.json()).data.domainTables, 22)
  const created = await fetch(new URL('/api/dev/persistence', base), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: marker }),
  })
  assert.equal(created.status, 201)
  const id = (await created.json()).data.id
  await runtime.restart()
  base = runtime.base
  const saved = await fetch(new URL('/api/dev/persistence', base))
  const body = await saved.json()
  assert.ok(body.data.some((row) => row.id === id && row.message === marker), 'Record must survive runtime restart')
  const services = await fetch(new URL('/api/services', base))
  assert.equal(services.status, 200)
  const summary = await fetch(new URL('/api/dev/database', base))
  const data = (await summary.json()).data
  assert.equal(data.foreignKeyViolations.length, 0)
  await runtime.dispose()
  runtime = undefined
  const authChecks = await runAuthChecks()
  const requestChecks = await runRequestChecks()
  console.log(JSON.stringify({ ok: true, restarted: true, persistedRecordId: id, counts: data.counts, authChecks, requestChecks }, null, 2))
} finally { await runtime?.dispose() }



