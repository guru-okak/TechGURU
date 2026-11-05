import { DatabaseSync } from 'node:sqlite'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { SignJWT, decodeJwt } from 'jose'
import { buildDemoSeed } from '../../db/seeds/demo.mjs'
import { verifyPassword } from '../../server/security/passwords.ts'
import { tokenHash } from '../../server/security/tokens.ts'
import { startLocalApi } from '../../scripts/dev.mjs'

export async function runAuthChecks() {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const testRoot = path.join(root, '.local')
  mkdirSync(testRoot, { recursive: true })
  const state = path.join(testRoot, `auth-test-${crypto.randomUUID()}`)
  mkdirSync(state)
  const checks = []
  let runtime
  let nativeDb
  // Inspect the actual D1 SQLite file without Miniflare 5 beta's broken Node RPC proxy.
  // All authentication operations still go over HTTP to the real workerd/D1 handler.
  function inspectDatabase() {
    const directory = path.join(state, 'v3', 'd1', 'miniflare-D1DatabaseObject')
    for (const file of readdirSync(directory).filter((file) => file.endsWith('.sqlite') && file !== 'metadata.sqlite')) {
      const connection = new DatabaseSync(path.join(directory, file))
      if (connection.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get()) {
        nativeDb = connection
        return { prepare(sql) {
          let args = []
          return {
            bind(...values) { args = values; return this },
            async first() { return connection.prepare(sql).get(...args) ?? null },
            async all() { return { results: connection.prepare(sql).all(...args) } },
            async run() { return connection.prepare(sql).run(...args) },
          }
        } }
      }
      connection.close()
    }
    throw new Error('D1 data file not found')
  }
  function cli(args) {
    const result = spawnSync(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'), ...args, '--config', path.join(root, 'wrangler.jsonc')], {
      cwd: root, encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false', XDG_CONFIG_HOME: path.join(testRoot, 'config') },
    })
    assert.equal(result.status, 0, result.stderr || result.stdout)
  }
  try {
    cli(['d1','migrations','apply','DB','--local','--persist-to',state])
    const seedFile = path.join(state, 'seed.sql')
    writeFileSync(seedFile, await buildDemoSeed())
    cli(['d1','execute','DB','--local','--persist-to',state,'--file',seedFile])
    runtime = await startLocalApi({ port: 0, persistencePath: state })
    let base = String(await runtime.ready)
    let db = inspectDatabase()
    const jar = () => ({ cookies: new Map() })
    const client = jar()
    const anonymous = jar()
    const headersFrom = (session, includeCsrf = true) => {
      const headers = { Cookie: [...session.cookies].map(([key,value]) => `${key}=${value}`).join('; ') }
      if (includeCsrf && session.cookies.has('csrf_token')) headers['X-CSRF-Token'] = session.cookies.get('csrf_token')
      return headers
    }
    async function call(session, pathname, { method = 'GET', body, csrf = true, headers = {} } = {}) {
      const response = await fetch(new URL(pathname, base), {
        method,
        headers: { ...headersFrom(session, csrf), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      })
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(';')[0]
        const separator = pair.indexOf('=')
        const name = pair.slice(0, separator)
        if (/Max-Age=0(?:;|$)/i.test(cookie)) session.cookies.delete(name)
        else session.cookies.set(name, pair.slice(separator + 1))
      }
      return { status: response.status, body: await response.json(), headers: response.headers }
    }
    const csrf = async (session) => {
      const result = await call(session, '/api/auth/csrf')
      assert.equal(result.status, 200)
      assert.equal(result.body.data.csrfToken, session.cookies.get('csrf_token'))
    }
    const signIn = async (session, email, password) => {
      await csrf(session)
      const result = await call(session, '/api/auth/login', { method: 'POST', body: { email, password } })
      assert.equal(result.status, 200, JSON.stringify(result.body))
      return result
    }
    const clone = (session) => ({ cookies: new Map(session.cookies) })
    const registration = { email: '  NEW.CLIENT@techguru.example ', password: 'NewClient2026!', full_name: 'Тестовый Клиент', phone: '+7 (999) 000-00-01' }

    assert.equal((await call(anonymous, '/api/auth/me')).status, 401)
    assert.equal((await call(anonymous, '/api/admin/auth-check')).status, 401)
    checks.push('anonymous me/admin -> 401')

    await csrf(client)
    const denied = await call(client, '/api/auth/register', { method: 'POST', csrf: false, body: registration })
    assert.equal(denied.status, 403)
    assert.equal((await call(client, '/api/auth/login', { method: 'POST', body: { email: 'anna@techguru.example', password: 'ClientDemo2026!' }, headers: { Origin: 'https://evil.example' } })).status, 403)
    checks.push('missing CSRF / cross-origin -> 403')

    const registered = await call(client, '/api/auth/register', { method: 'POST', body: registration })
    assert.equal(registered.status, 201, JSON.stringify(registered.body))
    assert.equal(registered.body.data.user.email, 'new.client@techguru.example')
    assert.equal(registered.body.data.user.phone, '+79990000001')
    assert.equal(registered.body.data.user.role, 'client')
    assert.ok(!JSON.stringify(registered.body).includes('password_hash'))
    const row = await db.prepare('SELECT * FROM users WHERE email=?').bind('new.client@techguru.example').first()
    assert.ok(await verifyPassword(registration.password, row.password_hash))
    assert.equal(row.role, 'client')
    checks.push('register -> 201, normalized client and real PBKDF2 hash')

    assert.equal((await call(client, '/api/auth/register', { method: 'POST', body: registration })).status, 409)
    assert.equal((await call(client, '/api/auth/register', { method: 'POST', body: { ...registration, email: 'another@techguru.example' } })).status, 409)
    assert.equal((await call(client, '/api/auth/register', { method: 'POST', body: { ...registration, role: 'admin' } })).status, 422)
    assert.equal((await call(client, '/api/auth/register', { method: 'POST', body: { ...registration, password: 'x' } })).status, 422)
    checks.push('duplicate email/phone -> 409; invalid input / role injection -> 422')

    assert.equal((await call(client, '/api/auth/login', { method: 'POST', body: { email: 'new.client@techguru.example', password: 'incorrect' } })).status, 401)
    const loggedIn = await signIn(client, 'NEW.CLIENT@techguru.example', registration.password)
    const setCookies = loggedIn.headers.getSetCookie()
    assert.ok(setCookies.find((value) => value.startsWith('access_token=')).includes('HttpOnly'))
    assert.ok(setCookies.find((value) => value.startsWith('refresh_token=')).includes('HttpOnly'))
    assert.ok(setCookies.find((value) => value.startsWith('access_token=')).includes('Max-Age=900'))
    assert.ok(setCookies.find((value) => value.startsWith('refresh_token=')).includes('Max-Age=604800'))
    const claims = decodeJwt(client.cookies.get('access_token'))
    assert.equal(claims.exp - claims.iat, 900)
    const session = await db.prepare('SELECT * FROM sessions WHERE id=?').bind(Number(claims.sid)).first()
    assert.equal(session.user_id, row.id)
    const sessionTtl = Date.parse(session.expires_at) - Date.parse(session.created_at)
    assert.ok(sessionTtl > 604799000 && sessionTtl < 604801000)
    assert.equal(session.refresh_jti, client.cookies.get('refresh_token').split('.')[0])
    assert.equal(session.refresh_token_hash, await tokenHash(client.cookies.get('refresh_token')))
    assert.ok(!JSON.stringify(loggedIn.body).includes('token'))
    assert.equal((await call(client, '/api/auth/me')).body.data.user.id, row.id)
    assert.equal((await call(client, '/api/admin/auth-check')).status, 403)
    checks.push('login -> 200; HttpOnly cookies, JWT 15m, hashed refresh/JTI 7d; client admin -> 403')

    const admin = jar()
    await signIn(admin, 'admin@techguru.example', 'AdminDemo2026!')
    assert.equal((await call(admin, '/api/admin/auth-check')).status, 200)
    const master = jar()
    await signIn(master, 'onsite@techguru.example', 'MasterDemo2026!')
    assert.equal((await call(master, '/api/auth/me')).body.data.user.role, 'master')
    assert.equal((await call(master, '/api/admin/auth-check')).status, 403)
    checks.push('admin allowed -> 200; master admin -> 403')

    const forged = clone(client)
    forged.cookies.set('access_token', client.cookies.get('access_token').slice(0, -8) + 'AAAAAAAA')
    assert.equal((await call(forged, '/api/auth/me')).status, 401)
    const secret = JSON.parse(readFileSync(path.join(state, 'auth-secret.json'), 'utf8')).JWT_SECRET
    const now = Math.floor(Date.now() / 1000)
    const expired = await new SignJWT({ sid: claims.sid, role: 'client' }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(String(row.id)).setJti(crypto.randomUUID()).setIssuer('techguru-api').setAudience('techguru-web')
      .setIssuedAt(now - 1000).setExpirationTime(now - 100).sign(new TextEncoder().encode(secret))
    const expiredJar = clone(client)
    expiredJar.cookies.set('access_token', expired)
    assert.equal((await call(expiredJar, '/api/auth/me')).status, 401)
    checks.push('forged and expired access -> 401')

    await db.prepare('UPDATE users SET is_active=0 WHERE id=?').bind(row.id).run()
    assert.equal((await call(client, '/api/auth/me')).status, 401)
    assert.equal((await call(clone(client), '/api/auth/refresh', { method: 'POST' })).status, 401)
    await db.prepare('UPDATE users SET is_active=1 WHERE id=?').bind(row.id).run()
    checks.push('disabled user rejected for access and refresh -> 401')

    const oldRefresh = clone(client)
    assert.equal((await call(client, '/api/auth/refresh', { method: 'POST' })).status, 200)
    assert.notEqual(client.cookies.get('refresh_token'), oldRefresh.cookies.get('refresh_token'))
    assert.equal((await call(oldRefresh, '/api/auth/refresh', { method: 'POST' })).status, 401)
    const race = await Promise.all([call(clone(client), '/api/auth/refresh', { method: 'POST' }), call(clone(client), '/api/auth/refresh', { method: 'POST' })])
    assert.deepEqual(race.map((result) => result.status).sort(), [200, 401])
    // Start a fresh independent session after explicitly ending the previous session.
    await call(client, '/api/auth/logout', {method:'POST',body:{}})
    await signIn(client, 'new.client@techguru.example', registration.password)
    checks.push('refresh rotates; replay -> 401; concurrent refresh has exactly one winner')

    nativeDb.close()
    nativeDb = undefined
    await runtime.dispose()
    runtime = undefined
    runtime = await startLocalApi({ port: 0, persistencePath: state })
    base = String(await runtime.ready)
    db = inspectDatabase()
    assert.equal((await call(client, '/api/auth/me')).status, 200)
    assert.equal((await call(client, '/api/auth/refresh', { method: 'POST' })).status, 200)
    checks.push('secret/session persist across runtime restart')

    const beforeLogout = clone(client)
    const logoutId = Number(decodeJwt(client.cookies.get('access_token')).sid)
    const loggedOut = await call(client, '/api/auth/logout', { method: 'POST' })
    assert.equal(loggedOut.status, 200)
    assert.equal(client.cookies.size, 0)
    assert.equal(await db.prepare('SELECT id FROM sessions WHERE id=?').bind(logoutId).first(), null)
    assert.equal((await call(client, '/api/auth/me')).status, 401)
    assert.equal((await call(beforeLogout, '/api/auth/me')).status, 401)
    assert.equal((await call(beforeLogout, '/api/auth/refresh', { method: 'POST' })).status, 401)
    checks.push('logout deletes session, clears cookies, prevents access/refresh replay')

    await signIn(client, 'new.client@techguru.example', registration.password)
    client.cookies.delete('access_token')
    const refreshOnly = clone(client)
    assert.equal((await call(client, '/api/auth/logout', { method: 'POST' })).status, 200)
    assert.equal((await call(refreshOnly, '/api/auth/refresh', { method: 'POST' })).status, 401)
    checks.push('logout works when access has expired / only refresh remains')

    // One failed password was recorded above: clear ONLY this isolated fixture's failures to test threshold exactly.
    await db.prepare("DELETE FROM audit_log WHERE action IN ('login_failed','login_blocked')").run()
    await csrf(anonymous)
    for (let i = 0; i < 5; i++) {
      assert.equal((await call(anonymous, '/api/auth/login', { method: 'POST', body: { email: 'nobody@techguru.example', password: 'wrong-password' } })).status, 401)
    }
    const blocked = await call(anonymous, '/api/auth/login', { method: 'POST', body: { email: 'admin@techguru.example', password: 'AdminDemo2026!' } })
    assert.equal(blocked.status, 429)
    assert.ok(Number(blocked.headers.get('Retry-After')) > 0)
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE action='login_blocked'").first()).n, 1)
    checks.push('5 failed logins block IP for 15m -> 429, Retry-After')
    nativeDb.close()
    nativeDb = undefined
    await runtime.dispose()
    runtime = undefined
    runtime = await startLocalApi({ port: 0, persistencePath: state })
    base = String(await runtime.ready)
    db = inspectDatabase()
    assert.equal((await call(anonymous, '/api/auth/login', { method: 'POST', body: { email: 'admin@techguru.example', password: 'AdminDemo2026!' } })).status, 429)
    const elapsed = new Date(Date.now() - 16 * 60000).toISOString()
    await db.prepare("UPDATE audit_log SET created_at=? WHERE action IN ('login_failed','login_blocked')").bind(elapsed).run()
    assert.equal((await call(anonymous, '/api/auth/login', { method: 'POST', body: { email: 'admin@techguru.example', password: 'AdminDemo2026!' } })).status, 200)
    checks.push('IP block survives restart and expires after 15m')

    const expiredSessionId = Number(decodeJwt(anonymous.cookies.get('access_token')).sid)
    await db.prepare('UPDATE sessions SET created_at=?,expires_at=? WHERE id=?')
      .bind(new Date(Date.now() - 8 * 86400000).toISOString(), new Date(Date.now() - 1000).toISOString(), expiredSessionId).run()
    assert.equal((await call(anonymous, '/api/auth/me')).status, 401)
    assert.equal((await call(anonymous, '/api/auth/refresh', { method: 'POST' })).status, 401)
    checks.push('expired server session rejects access and refresh -> 401')

    const audits = await db.prepare("SELECT DISTINCT action FROM audit_log WHERE action IN ('register','login','refresh','logout')").all()
    assert.equal(audits.results.length, 4)
    assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length, 0)
    checks.push('auth audit and FK integrity')
    return checks
  } finally {
    nativeDb?.close()
    await runtime?.dispose()
    assert.equal(path.dirname(path.resolve(state)), path.resolve(testRoot))
    assert.ok(path.basename(state).startsWith('auth-test-'))
    rmSync(state, { recursive: true, force: true })
  }
}



