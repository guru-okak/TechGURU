import type { Env } from '../env.ts'
import type { PublicUser, Role } from '../../shared/contracts/auth.ts'
import { AuthRepository } from '../repositories/auth.ts'
import { HttpError } from './http.ts'
import { getCookie, COOKIE_NAMES } from '../security/cookies.ts'
import { verifyAccess } from '../security/tokens.ts'

export interface AuthContext { user: PublicUser; sessionId: number }
export async function requireAuth(request: Request, env: Env): Promise<AuthContext> {
  const token = getCookie(request, COOKIE_NAMES.access)
  if (!token) throw new HttpError(401, 'UNAUTHENTICATED', 'Требуется авторизация')
  const claims = await verifyAccess(env, token)
  const user = await new AuthRepository(env.DB).activeUserForSession(claims.sessionId, claims.userId)
  if (!user || user.role !== claims.role) throw new HttpError(401, 'UNAUTHENTICATED', 'Сессия недействительна')
  return { user, sessionId: claims.sessionId }
}
export function requireRole(roles: readonly Role[]) {
  return async (request: Request, env: Env): Promise<AuthContext> => {
    const context = await requireAuth(request, env)
    if (!roles.includes(context.user.role)) throw new HttpError(403, 'FORBIDDEN', 'Недостаточно прав')
    return context
  }
}
