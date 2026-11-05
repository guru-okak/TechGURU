import type { Env } from '../env.ts'

export class FoundationRepository {
  private db: Env['DB']
  constructor(db: Env['DB']) { this.db = db }
  async health() {
    const row = await this.db.prepare("SELECT COUNT(*) AS tables FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT IN ('d1_migrations')").first<{ tables: number }>()
    return { database: 'ok', domainTables: row?.tables ?? 0 }
  }
  async services(limit: number, offset: number) {
    const { results } = await this.db.prepare('SELECT id,name,equipment_category,base_price_cents/100.0 AS base_price,base_price_cents,average_duration_minutes,required_skill_level,is_active FROM services WHERE is_active=1 ORDER BY id LIMIT ? OFFSET ?').bind(limit, offset).all()
    return results
  }
  async servicePoints(limit: number, offset: number) {
    const { results } = await this.db.prepare('SELECT id,name,address,working_hours,is_active FROM service_points WHERE is_active=1 ORDER BY id LIMIT ? OFFSET ?').bind(limit, offset).all()
    return results
  }
  async databaseSummary() {
    const counts = await this.db.prepare(`SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM users WHERE role='admin') AS admins,
      (SELECT COUNT(*) FROM users WHERE role='client') AS clients,
      (SELECT COUNT(*) FROM masters) AS masters,
      (SELECT COUNT(*) FROM services) AS services,
      (SELECT COUNT(*) FROM parts) AS parts,
      (SELECT COUNT(*) FROM requests) AS requests,
      (SELECT COUNT(*) FROM stock) AS stock_positions`).first()
    const foreignKeys = await this.db.prepare('PRAGMA foreign_key_check').all()
    return { counts, foreignKeyViolations: foreignKeys.results }
  }
  async savePersistenceCheck(message: string) {
    return this.db.prepare("INSERT INTO audit_log(role,action,entity_type,details) VALUES ('system','local_persistence_check','development',?) RETURNING id,created_at")
      .bind(JSON.stringify({ message })).first()
  }
  async persistenceChecks() {
    const { results } = await this.db.prepare("SELECT id,details,created_at FROM audit_log WHERE action='local_persistence_check' AND entity_type='development' ORDER BY id DESC LIMIT 20").all<{ id: number; details: string; created_at: string }>()
    return results.map(({ details, ...row }) => ({ ...row, message: JSON.parse(details).message }))
  }
}


