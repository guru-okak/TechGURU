import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { buildDemoSeed } from '../db/seeds/demo.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const state = path.join(root, '.local', 'd1')
const config = path.join(root, 'wrangler.jsonc')
function wrangler(args, quiet = false) {
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'), ...args, '--config', config], {
    cwd: root, stdio: quiet ? 'pipe' : 'inherit', encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false', XDG_CONFIG_HOME: path.join(root, '.local', 'config') },
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    if (quiet) console.error(result.stderr || result.stdout)
    throw new Error('Wrangler failed with exit code ' + result.status)
  }
  return result.stdout
}
const action = process.argv[2]
if (action === 'migrate') {
  wrangler(['d1', 'migrations', 'apply', 'DB', '--local', '--persist-to', state])
} else if (action === 'seed') {
  mkdirSync(path.join(root, '.local'), { recursive: true })
  const file = path.join(root, '.local', `demo-seed-${crypto.randomUUID()}.sql`)
  writeFileSync(file, await buildDemoSeed(), 'utf8')
  try {
    wrangler(['d1', 'execute', 'DB', '--local', '--persist-to', state, '--file', file], true)
    console.log('Demo seed applied locally. Existing rows preserved. Run npm run db:check.')
  }
  finally { unlinkSync(file) }
} else if (action === 'check') {
  const sql = `SELECT
    (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name!='d1_migrations') AS domain_tables,
    (SELECT COUNT(*) FROM users) AS users,
    (SELECT COUNT(*) FROM users WHERE role='admin') AS admins,
    (SELECT COUNT(*) FROM users WHERE role='client') AS clients,
    (SELECT COUNT(*) FROM masters) AS masters,
    (SELECT COUNT(*) FROM services) AS services,
    (SELECT COUNT(*) FROM parts) AS parts,
    (SELECT COUNT(*) FROM requests) AS requests;
    PRAGMA foreign_key_check; PRAGMA quick_check;`
  const results = JSON.parse(wrangler(['d1', 'execute', 'DB', '--local', '--persist-to', state, '--command', sql, '--json'], true))
  for (const [metric,count] of Object.entries(results[0].results[0])) console.log(`${metric}: ${count}`)
  const violations = results[1].results
  const integrity = results[2].results[0]?.quick_check
  console.log(`foreign_key_violations: ${violations.length}`)
  console.log(`quick_check: ${integrity}`)
  if (violations.length || integrity !== 'ok') throw new Error('Database integrity check failed')
} else if (action === 'sql') {
  const sql = process.argv[3]
  if (!sql || process.argv.length !== 4) throw new Error('Usage: npm run db:sql -- "SELECT ..."')
  wrangler(['d1', 'execute', 'DB', '--local', '--persist-to', state, '--command', sql])
} else { throw new Error('Expected migrate, seed, check or sql') }



