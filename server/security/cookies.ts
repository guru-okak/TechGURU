import type { Env } from '../env.ts'
import { HttpError } from '../middleware/http.ts'
import { randomToken, ACCESS_TTL, REFRESH_TTL } from './tokens.ts'

export const COOKIE_NAMES = { access: 'access_token', refresh: 'refresh_token', csrf: 'csrf_token' } as const
export function getCookie(request: Request, name: string): string | undefined {
  const values = (request.headers.get('Cookie') ?? '').split(';').map((part) => part.trim()).filter((part) => part.startsWith(name + '='))
  if (values.length !== 1) return undefined
  return values[0].slice(name.length + 1)
}
function secure(request: Request, env: Env): string {
  // HTTP is allowed only for the explicit local loopback development runtime.
  const url = new URL(request.url)
  return env.APP_ENV === 'local' && url.protocol === 'http:' && ['127.0.0.1','localhost','[::1]'].includes(url.hostname) ? '' : '; Secure'
}
function cookie(request: Request, env: Env, name: string, value: string, maxAge: number, httpOnly: boolean, path: string): string {
  return `${name}=${value}; Path=${path}; Max-Age=${maxAge}; SameSite=Strict${httpOnly ? '; HttpOnly' : ''}${secure(request, env)}`
}
export function csrfResponseHeaders(request: Request, env: Env, value: string): Headers {
  const headers = new Headers()
  headers.append('Set-Cookie', cookie(request, env, COOKIE_NAMES.csrf, value, REFRESH_TTL, false, '/'))
  return headers
}
export function authHeaders(request: Request, env: Env, access: string, refresh: string): Headers {
  const headers = csrfResponseHeaders(request, env, randomToken())
  headers.append('Set-Cookie', cookie(request, env, COOKIE_NAMES.access, access, ACCESS_TTL, true, '/api'))
  headers.append('Set-Cookie', cookie(request, env, COOKIE_NAMES.refresh, refresh, REFRESH_TTL, true, '/api/auth'))
  return headers
}
export function clearAuthHeaders(request: Request, env: Env): Headers {
  const headers = new Headers()
  headers.append('Set-Cookie', cookie(request, env, COOKIE_NAMES.access, '', 0, true, '/api'))
  headers.append('Set-Cookie', cookie(request, env, COOKIE_NAMES.refresh, '', 0, true, '/api/auth'))
  headers.append('Set-Cookie', cookie(request, env, COOKIE_NAMES.csrf, '', 0, false, '/'))
  return headers
}
export function requireCsrf(request: Request): void {
  const origin = request.headers.get('Origin')
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'CSRF_INVALID', 'Недопустимый источник запроса')
  const value = getCookie(request, COOKIE_NAMES.csrf)
  const header = request.headers.get('X-CSRF-Token')
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value) || !header || value !== header) {
    throw new HttpError(403, 'CSRF_INVALID', 'Обновите CSRF-токен и повторите запрос')
  }
}
