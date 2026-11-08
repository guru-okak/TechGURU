import type { Env } from '../env.ts'
import type { AuthUser, PublicUser, RegisterInput } from '../../shared/contracts/auth.ts'

const PUBLIC_COLUMNS = 'id,full_name,email,phone,role,address,avatar_url,created_at'
export interface AuditMetadata { ip: string; userAgent: string | null }
export function publicUser(user: PublicUser): PublicUser {
  return { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, role: user.role, address: user.address, avatar_url:user.avatar_url, created_at: user.created_at }
}
export class AuthRepository {
  private db: Env['DB']
  constructor(db: Env['DB']) { this.db = db }
  userByEmail(email: string): Promise<AuthUser | null> {
    return this.db.prepare(`SELECT ${PUBLIC_COLUMNS},password_hash,is_active,email_verified,google_sub FROM users WHERE email=?`).bind(email).first<AuthUser>()
  }
  async duplicate(email: string, phone: string): Promise<boolean> {
    return Boolean(await this.db.prepare('SELECT id FROM users WHERE email=? OR phone=? LIMIT 1').bind(email, phone).first())
  }
  async register(input: RegisterInput, hash: string, metadata: AuditMetadata): Promise<PublicUser> {
    const results = await this.db.batch<PublicUser>([
      this.db.prepare(`INSERT INTO users(full_name,full_name_fold,phone,email,role,password_hash,email_verified) VALUES (?,?,?,?,'client',?,0) RETURNING ${PUBLIC_COLUMNS}`)
        .bind(input.full_name, input.full_name.toLocaleLowerCase('ru-RU'), input.phone, input.email, hash),
      this.db.prepare("INSERT INTO audit_log(user_id,role,action,entity_type,entity_id,details,ip_address,user_agent) SELECT id,'client','register','user',id,'{}',?,? FROM users WHERE email=?")
        .bind(metadata.ip, metadata.userAgent, input.email),
    ])
    return results[0].results[0]
  }
  async blockedUntil(ip: string, cutoff: string): Promise<string | null> {
    const row = await this.db.prepare("SELECT created_at FROM audit_log WHERE action='login_blocked' AND ip_address=? AND created_at>? ORDER BY created_at DESC,id DESC LIMIT 1").bind(ip, cutoff).first<{ created_at: string }>()
    return row?.created_at ?? null
  }
  async failedLogin(metadata: AuditMetadata, emailHash: string, cutoff: string): Promise<void> {
    await this.db.batch([
      this.db.prepare("INSERT INTO audit_log(role,action,entity_type,details,ip_address,user_agent) VALUES ('system','login_failed','authentication',?,?,?)")
        .bind(JSON.stringify({ email_hash: emailHash }), metadata.ip, metadata.userAgent),
      this.db.prepare(`INSERT INTO audit_log(role,action,entity_type,details,ip_address,user_agent)
        SELECT 'system','login_blocked','authentication','{}',?,?
        WHERE (SELECT COUNT(*) FROM audit_log WHERE action='login_failed' AND ip_address=? AND created_at>?)>=5
        AND NOT EXISTS (SELECT 1 FROM audit_log WHERE action='login_blocked' AND ip_address=? AND created_at>?)`)
        .bind(metadata.ip, metadata.userAgent, metadata.ip, cutoff, metadata.ip, cutoff),
    ])
  }
  async createSession(user: PublicUser, refresh: { jti: string; hash: string }, expires: string, metadata: AuditMetadata): Promise<number> {
    const results = await this.db.batch<{ id: number }>([
      this.db.prepare('INSERT INTO sessions(user_id,refresh_token_hash,refresh_jti,expires_at) VALUES (?,?,?,?) RETURNING id')
        .bind(user.id, refresh.hash, refresh.jti, expires),
      this.db.prepare("INSERT INTO audit_log(user_id,role,action,entity_type,entity_id,details,ip_address,user_agent) SELECT ?,?,'login','session',id,'{}',?,? FROM sessions WHERE refresh_jti=?")
        .bind(user.id, user.role, metadata.ip, metadata.userAgent, refresh.jti),
    ])
    return results[0].results[0].id
  }
  activeUserForSession(sessionId: number, userId: number): Promise<PublicUser | null> {
    return this.db.prepare(`SELECT u.id,u.full_name,u.email,u.phone,u.role,u.address,u.avatar_url,u.created_at
      FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.id=? AND s.user_id=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.is_active=1 AND s.refresh_jti IS NOT NULL`)
      .bind(sessionId, userId, new Date().toISOString()).first<PublicUser>()
  }
  async userForRefresh(hash: string, jti: string): Promise<{ user: PublicUser; sessionId: number } | null> {
    const row = await this.db.prepare(`SELECT u.id,u.full_name,u.email,u.phone,u.role,u.address,u.avatar_url,u.created_at,s.id AS session_id
      FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.refresh_token_hash=? AND s.refresh_jti=? AND s.revoked_at IS NULL AND s.expires_at>? AND u.is_active=1`)
      .bind(hash, jti, new Date().toISOString()).first<PublicUser & { session_id: number }>()
    return row ? { user: publicUser(row), sessionId: row.session_id } : null
  }
  async rotate(sessionId: number, oldHash: string, oldJti: string, next: { hash: string; jti: string }, expires: string, metadata: AuditMetadata): Promise<boolean> {
    const results = await this.db.batch<{ id: number }>([
      this.db.prepare(`UPDATE sessions SET refresh_token_hash=?,refresh_jti=?,expires_at=?
        WHERE id=? AND refresh_token_hash=? AND refresh_jti=? AND revoked_at IS NULL AND expires_at>?
          AND EXISTS(SELECT 1 FROM users WHERE id=sessions.user_id AND is_active=1) RETURNING id`)
        .bind(next.hash, next.jti, expires, sessionId, oldHash, oldJti, new Date().toISOString()),
      this.db.prepare(`INSERT INTO audit_log(user_id,role,action,entity_type,entity_id,details,ip_address,user_agent)
        SELECT s.user_id,u.role,'refresh','session',s.id,'{}',?,? FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.refresh_jti=?`)
        .bind(metadata.ip, metadata.userAgent, next.jti),
    ])
    return results[0].results.length === 1
  }
  async deleteSession(sessionId: number, user: PublicUser, metadata: AuditMetadata): Promise<void> {
    await this.db.batch([
      this.db.prepare("INSERT INTO audit_log(user_id,role,action,entity_type,entity_id,details,ip_address,user_agent) SELECT ?,?,'logout','session',id,'{}',?,? FROM sessions WHERE id=? AND user_id=?")
        .bind(user.id, user.role, metadata.ip, metadata.userAgent, sessionId, user.id),
      this.db.prepare('DELETE FROM sessions WHERE id=? AND user_id=?').bind(sessionId, user.id),
    ])
  }
}
