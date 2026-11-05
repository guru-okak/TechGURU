import { requestsRoute } from './requests.ts'
import { businessRoute } from './business.ts'
import { authRoute } from './auth.ts'
import { geocodingRoute } from './geocoding.ts'
import type { Env } from '../env.ts'
import { HttpError, json, readJson } from '../middleware/http.ts'
import { FoundationRepository } from '../repositories/foundation.ts'
import { catalogQuerySchema, persistenceCheckSchema } from '../../shared/contracts/foundation.ts'

type Handler = (request: Request, url: URL, repository: FoundationRepository) => Promise<Response>
const routes: Record<string, Record<string, Handler>> = {
  '/api/health': {
    GET: async (_request, _url, repository) => {
      const state = await repository.health()
      return json({ data: { ...state, status: state.domainTables === 22 ? 'ok' : 'not_ready' } }, state.domainTables === 22 ? 200 : 503)
    },
  },
  '/api/services': {
    GET: async (_request, url, repository) => {
      const query = catalogQuerySchema.parse(Object.fromEntries(url.searchParams))
      return json({ data: await repository.services(query.limit, query.offset), pagination: query })
    },
  },
  '/api/service-points': {
    GET: async (_request, url, repository) => {
      const query = catalogQuerySchema.parse(Object.fromEntries(url.searchParams))
      return json({ data: await repository.servicePoints(query.limit, query.offset), pagination: query })
    },
  },
  '/api/dev/database': { GET: async (_request, _url, repository) => json({ data: await repository.databaseSummary() }) },
  '/api/dev/persistence': {
    GET: async (_request, _url, repository) => json({ data: await repository.persistenceChecks() }),
    POST: async (request, _url, repository) => {
      const payload = persistenceCheckSchema.parse(await readJson(request))
      return json({ data: { ...await repository.savePersistenceCheck(payload.message), message: payload.message } }, 201)
    },
  },
}
export async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  if (url.pathname === '/api/geocoding') return geocodingRoute(request,env)
  if (url.pathname.startsWith('/api/dev/')) {
    if (env.APP_ENV !== 'local' || env.ENABLE_LOCAL_CHECKS !== 'true' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
      throw new HttpError(404, 'NOT_FOUND', 'Маршрут не найден')
    }
    // Local diagnostic write endpoints cannot be invoked from arbitrary websites.
    const origin = request.headers.get('Origin')
    if (origin && origin !== url.origin) throw new HttpError(403, 'ORIGIN_FORBIDDEN', 'Недопустимый источник запроса')
  }
  const authResponse = await authRoute(request, env)
  if (authResponse) return authResponse
  const requestsResponse = await requestsRoute(request, env)
  if (requestsResponse) return requestsResponse
  const businessResponse = await businessRoute(request,env)
  if (businessResponse) return businessResponse
  const methods = routes[url.pathname]
  if (!methods) throw new HttpError(404, 'NOT_FOUND', 'Маршрут не найден')
  const handler = methods[request.method]
  if (!handler) throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Метод не поддерживается', { Allow: Object.keys(methods).join(', ') })
  return handler(request, url, new FoundationRepository(env.DB))
}



