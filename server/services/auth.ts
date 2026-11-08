import {pendingEmailCookie} from '../security/pending-email.ts'
import type { Env } from '../env.ts'
import type { RegisterInput } from '../../shared/contracts/auth.ts'
import { AuthRepository, publicUser } from '../repositories/auth.ts'
import type { AuditMetadata } from '../repositories/auth.ts'
import { HttpError } from '../middleware/http.ts'
import { requireAuth } from '../middleware/auth.ts'
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } from '../security/passwords.ts'
import { authHeaders, clearAuthHeaders, getCookie, COOKIE_NAMES } from '../security/cookies.ts'
import { createAccess, createRefresh, refreshJti, tokenHash, signingKey, REFRESH_TTL } from '../security/tokens.ts'

export function auditMetadata(request: Request, env: Env): AuditMetadata {
  return {
    ip: env.APP_ENV === 'local' ? '127.0.0.1' : (request.headers.get('CF-Connecting-IP') ?? 'unknown'),
    userAgent: request.headers.get('User-Agent')?.slice(0, 500) ?? null,
  }
}
function unauthenticated(): HttpError { return new HttpError(401, 'UNAUTHENTICATED', 'Неверный email, пароль или недействительная сессия') }
function cutoff(): string { return new Date(Date.now() - 5 * 60 * 1000).toISOString() }
function expiry(): string { return new Date(Date.now() + REFRESH_TTL * 1000).toISOString() }
export async function requireGuest(request:Request,env:Env){
 let active=false
 try{await requireAuth(request,env);active=true}catch(error){if(!(error instanceof HttpError)||error.status!==401)throw error}
 if(!active){const token=getCookie(request,COOKIE_NAMES.refresh);const jti=token?refreshJti(token):null;if(token&&jti)active=!!await new AuthRepository(env.DB).userForRefresh(await tokenHash(token),jti)}
 if(active)throw new HttpError(409,'ALREADY_AUTHENTICATED','Вы уже вошли в аккаунт. Сначала выйдите из него.')
}
export async function register(input: RegisterInput, request: Request, env: Env) {
  const repository = new AuthRepository(env.DB)
  if (await repository.duplicate(input.email, input.phone)) throw new HttpError(409, 'ACCOUNT_EXISTS', 'Email или телефон уже зарегистрирован')
  const hash = await hashPassword(input.password)
  try { return publicUser(await repository.register(input, hash, auditMetadata(request, env))) }
  catch (error) {
    const details = error instanceof Error ? error.message + ' ' + String(error.cause) : ''
    if (/UNIQUE constraint failed: users\.(email|phone)/.test(details)) throw new HttpError(409, 'ACCOUNT_EXISTS', 'Email или телефон уже зарегистрирован')
    throw error
  }
}
export async function login(input: { email: string; password: string }, request: Request, env: Env) {
  signingKey(env) // Fail before creating state when a deployment secret is missing.
  const repository = new AuthRepository(env.DB)
  const metadata = auditMetadata(request, env)
  const blocked = await repository.blockedUntil(metadata.ip, cutoff())
  if (blocked) {
    const retry = Math.max(1, Math.ceil((Date.parse(blocked) + 300000 - Date.now()) / 1000))
    throw new HttpError(429, 'LOGIN_RATE_LIMITED', 'Слишком много попыток входа. Повторите через 5 минут', { 'Retry-After': String(retry) })
  }
  const user = await repository.userByEmail(input.email)
  const valid = await verifyPassword(input.password, user?.password_hash ?? DUMMY_PASSWORD_HASH)
  if (!valid || !user || !user.is_active) {
    await repository.failedLogin(metadata, await tokenHash(input.email), cutoff())
    throw unauthenticated()
  }
  if(!user.email_verified)throw new HttpError(403,'EMAIL_UNVERIFIED','Подтвердите электронную почту',{'Set-Cookie':await pendingEmailCookie(env,user.id)})
  const refresh = await createRefresh()
  const sessionId = await repository.createSession(user, refresh, expiry(), metadata)
  const access = await createAccess(env, user.id, user.role, sessionId)
  return { user: publicUser(user), headers: authHeaders(request, env, access, refresh.token) }
}
export async function refresh(request: Request, env: Env) {
  signingKey(env)
  const token = getCookie(request, COOKIE_NAMES.refresh)
  const jti = token ? refreshJti(token) : null
  if (!token || !jti) throw unauthenticated()
  const repository = new AuthRepository(env.DB)
  const hash = await tokenHash(token)
  const context = await repository.userForRefresh(hash, jti)
  if (!context) throw unauthenticated()
  const next = await createRefresh()
  // Conditional update in one D1 batch makes a refresh token single-use even under concurrency.
  if (!await repository.rotate(context.sessionId, hash, jti, next, expiry(), auditMetadata(request, env))) throw unauthenticated()
  const access = await createAccess(env, context.user.id, context.user.role, context.sessionId)
  return { user: context.user, headers: authHeaders(request, env, access, next.token) }
}
export async function logout(request: Request, env: Env) {
  const repository = new AuthRepository(env.DB)
  let context
  try { context = await requireAuth(request, env) }
  catch (error) { if (!(error instanceof HttpError) || error.status !== 401) throw error }
  if (!context) {
    const token = getCookie(request, COOKIE_NAMES.refresh)
    const jti = token ? refreshJti(token) : null
    if (token && jti) context = await repository.userForRefresh(await tokenHash(token), jti) ?? undefined
  }
  if (context) await repository.deleteSession(context.sessionId, context.user, auditMetadata(request, env))
  return clearAuthHeaders(request, env)
}
