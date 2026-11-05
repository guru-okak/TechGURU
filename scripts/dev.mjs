import { rolldown } from 'rolldown'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {backupLocal} from './backup.mjs'

export async function startLocalApi({ port = 8787, persistencePath } = {}) {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const state = persistencePath ?? path.join(root, '.local', 'd1')
  mkdirSync(state, { recursive: true })
  const secretFile = path.join(state, 'auth-secret.json')
  if (!existsSync(secretFile)) {
    try { writeFileSync(secretFile, JSON.stringify({ JWT_SECRET: randomBytes(48).toString('base64url') }), { encoding: 'utf8', flag: 'wx', mode: 0o600 }) }
    catch (error) { if (error.code !== 'EEXIST') throw error }
  }
  const secrets = JSON.parse(readFileSync(secretFile, 'utf8'))
  if (typeof secrets.JWT_SECRET !== 'string' || secrets.JWT_SECRET.length < 32) throw new Error('Invalid local auth secret')
  const config = JSON.parse(readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8').replace(/^\uFEFF/, ''))
  const bundle = await rolldown({ input: path.join(root, config.main), platform: 'browser' })
  let code
  try { code = (await bundle.generate({ format: 'esm', codeSplitting: false })).output[0].code }
  finally { await bundle.close() }
  const options = convertV4MiniflareOptions({
    name: config.name,
    modules: true,
    script: code,
    compatibilityDate: config.compatibility_date,
    host: '127.0.0.1',
    port,
    cf: false,
    unsafeTriggerHandlers: true,
    bindings: { ...config.vars, JWT_SECRET: secrets.JWT_SECRET, YANDEX_GEOCODER_API_KEY: process.env.YANDEX_GEOCODER_API_KEY ?? '' },
    d1Databases: Object.fromEntries(config.d1_databases.map((db) => [db.binding, db.database_id])),
    resourcePersistencePath: path.join(state, 'v3'),
    telemetry: { enabled: false },
  })
  const runtime = new Miniflare(options)
  try { await runtime.ready }
  catch (error) { await runtime.dispose(); throw error }
  return runtime
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const envFile = fileURLToPath(new URL('../.env', import.meta.url))
  if (existsSync(envFile)) process.loadEnvFile(envFile)
  const port = Number(process.env.API_PORT ?? 8787)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('API_PORT must be between 1 and 65535')
  const runtime = await startLocalApi({ port })
  await backupLocal()
  let jobRunning=false
  async function tick(){if(jobRunning)return;jobRunning=true;try{const r=await runtime.dispatchFetch('http://127.0.0.1/cdn-cgi/local/scheduled?cron=0%20*%20*%20*%20*');if(!r.ok)throw Error('Scheduled job failed');await backupLocal()}catch{console.error('Local scheduled checks failed; retry on the next tick.')}finally{jobRunning=false}}
  await tick()
  const timer=setInterval(tick,3600000)
  console.log(`TechGURU API: ${await runtime.ready}`)
  console.log('Local D1: .local/d1 (persistent). Ctrl+C to stop. Restart after server code changes.')
  let stopping = false
  const stop = async () => {
    if (stopping) return
    stopping = true
    clearInterval(timer)
    await runtime.dispose()
    process.exitCode = 0
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
}



