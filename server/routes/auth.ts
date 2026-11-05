import type { Env } from '../env.ts'
import { loginSchema, registerSchema } from '../../shared/contracts/auth.ts'
import { HttpError, json, readJson } from '../middleware/http.ts'
import { requireAuth, requireRole } from '../middleware/auth.ts'
import { csrfResponseHeaders, getCookie, COOKIE_NAMES, requireCsrf } from '../security/cookies.ts'
import { randomToken } from '../security/tokens.ts'
import * as auth from '../services/auth.ts'

type Handler = (request: Request, env: Env) => Promise<Response>
const routes: Record<string, Record<string, Handler>> = {
  '/api/auth/csrf': { GET: async (request, env) => {
    const existing = getCookie(request, COOKIE_NAMES.csrf)
    const value = existing && /^[A-Za-z0-9_-]{43}$/.test(existing) ? existing : randomToken()
    return json({ data: { csrfToken: value } }, 200, csrfResponseHeaders(request, env, value))
  } },
  '/api/auth/register': { POST: async (request, env) => {
    requireCsrf(request)
    await auth.requireGuest(request,env)
    const input = registerSchema.parse(await readJson(request))
    return json({ data: { user: await auth.register(input, request, env) } }, 201)
  } },
  '/api/auth/login': { POST: async (request, env) => {
    requireCsrf(request)
    await auth.requireGuest(request,env)
    const result = await auth.login(loginSchema.parse(await readJson(request)), request, env)
    return json({ data: { user: result.user } }, 200, result.headers)
  } },
  '/api/auth/refresh': { POST: async (request, env) => {
    requireCsrf(request)
    const result = await auth.refresh(request, env)
    return json({ data: { user: result.user } }, 200, result.headers)
  } },
  '/api/auth/logout': { POST: async (request, env) => {
    requireCsrf(request)
    return json({ data: { loggedOut: true } }, 200, await auth.logout(request, env))
  } },
  '/api/auth/me': { GET: async (request, env) => json({ data: { user: (await requireAuth(request, env)).user } }) },
  // Minimal, real protected route for testing RBAC before admin business modules exist.
  '/api/admin/auth-check': { GET: async (request, env) => {
    const { user } = await requireRole(['admin'])(request, env)
    return json({ data: { authorized: true, role: user.role } })
  } },
}
export async function authRoute(request: Request, env: Env): Promise<Response | null> {
  const methods = routes[new URL(request.url).pathname]
  if (!methods) return null
  const handler = methods[request.method]
  if (!handler) throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Метод не поддерживается', { Allow: Object.keys(methods).join(', ') })
  return handler(request, env)
}
