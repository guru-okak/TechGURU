import { SignJWT, jwtVerify } from 'jose'
import type { Env } from '../env.ts'
import type { Role } from '../../shared/contracts/auth.ts'
import { HttpError } from '../middleware/http.ts'

export const ACCESS_TTL = 15 * 60
export const REFRESH_TTL = 7 * 24 * 60 * 60
const ISSUER = 'techguru-api'
const AUDIENCE = 'techguru-web'
export function signingKey(env: Env): Uint8Array {
  const key = new TextEncoder().encode(env.JWT_SECRET ?? '')
  if (key.byteLength < 32) throw new HttpError(503, 'AUTH_NOT_CONFIGURED', 'Авторизация не настроена')
  return key
}
export function randomToken(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}
export async function tokenHash(value: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
export async function createRefresh() {
  const jti = crypto.randomUUID()
  const token = `${jti}.${randomToken()}`
  return { jti, token, hash: await tokenHash(token) }
}
export function refreshJti(token: string): string | null {
  return /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.[A-Za-z0-9_-]{43}$/.exec(token)?.[1] ?? null
}
export async function createAccess(env: Env, userId: number, role: Role, sessionId: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ role, sid: String(sessionId) }).setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(userId)).setIssuer(ISSUER).setAudience(AUDIENCE)
    .setJti(crypto.randomUUID()).setIssuedAt(now).setExpirationTime(now + ACCESS_TTL).sign(signingKey(env))
}
export async function verifyAccess(env: Env, token: string) {
  const key = signingKey(env)
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE, typ: 'JWT', requiredClaims: ['sub','sid','role','jti','iat','exp'], maxTokenAge: `${ACCESS_TTL}s` })
    if (!/^[1-9]\d*$/.test(payload.sub ?? '') || typeof payload.sid !== 'string' || !/^[1-9]\d*$/.test(payload.sid)
      || !['client','master','admin'].includes(String(payload.role)) || typeof payload.exp !== 'number' || typeof payload.iat !== 'number'
      || payload.exp - payload.iat !== ACCESS_TTL || !Number.isSafeInteger(Number(payload.sub)) || !Number.isSafeInteger(Number(payload.sid))) throw new Error('Invalid claims')
    return { userId: Number(payload.sub), sessionId: Number(payload.sid), role: payload.role as Role }
  } catch { throw new HttpError(401, 'UNAUTHENTICATED', 'Требуется авторизация') }
}

