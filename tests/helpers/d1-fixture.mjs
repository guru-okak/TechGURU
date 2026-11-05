import { DatabaseSync } from 'node:sqlite'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { buildDemoSeed } from '../../db/seeds/demo.mjs'
import { startLocalApi } from '../../scripts/dev.mjs'

// Real HTTP + real workerd/D1; the native handle is only used for assertions and special fixtures.
export async function createD1Fixture() {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const parent = path.join(root,'.local')
  const state = path.join(parent,`requests-test-${crypto.randomUUID()}`)
  mkdirSync(state,{ recursive: true })
  let runtime
  let nativeDb
  let base
  function cli(args) {
    const result = spawnSync(process.execPath,[path.join(root,'node_modules/wrangler/bin/wrangler.js'),...args,'--config',path.join(root,'wrangler.jsonc')],{
      cwd: root, encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false', XDG_CONFIG_HOME: path.join(parent,'config') },
    })
    assert.equal(result.status,0,result.stderr || result.stdout)
  }
  async function start() {
    runtime = await startLocalApi({ port: 0, persistencePath: state })
    base = String(await runtime.ready)
    const directory = path.join(state,'v3','d1','miniflare-D1DatabaseObject')
    for (const file of readdirSync(directory).filter((name) => name.endsWith('.sqlite') && name!=='metadata.sqlite')) {
      const db = new DatabaseSync(path.join(directory,file),{ timeout: 5000 })
      if (db.prepare("SELECT name FROM sqlite_master WHERE name='requests'").get()) { nativeDb=db; return }
      db.close()
    }
    throw new Error('Fixture D1 database not found')
  }
  async function dispose() {
    nativeDb?.close(); nativeDb=undefined
    await runtime?.dispose(); runtime=undefined
    assert.equal(path.dirname(path.resolve(state)),path.resolve(parent))
    assert.ok(path.basename(state).startsWith('requests-test-'))
    rmSync(state,{ recursive: true, force: true })
  }
  try {
    cli(['d1','migrations','apply','DB','--local','--persist-to',state])
    const file = path.join(state,'seed.sql')
    writeFileSync(file,await buildDemoSeed())
    cli(['d1','execute','DB','--local','--persist-to',state,'--file',file])
    await start()

  } catch (error) { await dispose(); throw error }
  const jar = () => ({ cookies: new Map() })
  async function api(session,pathname,{ method='GET', body, csrf=true }={}) {
    const headers = { Cookie: [...session.cookies].map(([key,value]) => `${key}=${value}`).join('; ') }
    if (csrf && session.cookies.has('csrf_token')) headers['X-CSRF-Token']=session.cookies.get('csrf_token')
    if (body!==undefined) headers['Content-Type']='application/json'
    const response = await fetch(new URL(pathname,base),{ method,headers,...(body===undefined?{}:{body:JSON.stringify(body)}) })
    for (const line of response.headers.getSetCookie()) {
      const pair = line.split(';')[0]; const index=pair.indexOf('='); const name=pair.slice(0,index)
      if (/Max-Age=0(?:;|$)/i.test(line)) session.cookies.delete(name)
      else session.cookies.set(name,pair.slice(index+1))
    }
    return { status:response.status,body:await response.json(),headers:response.headers }
  }
  async function login(email,password) {
    const session=jar()
    assert.equal((await api(session,'/api/auth/csrf')).status,200)
    const result=await api(session,'/api/auth/login',{method:'POST',body:{email,password}})
    assert.equal(result.status,200,JSON.stringify(result.body))
    return session
  }
  return {
    get db() { return nativeDb }, get base() { return base }, jar, api, login, dispose,
    async restart() { nativeDb.close();nativeDb=undefined;await runtime.dispose();runtime=undefined;await start() },
  }
}

