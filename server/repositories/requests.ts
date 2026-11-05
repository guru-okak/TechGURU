import type { Env } from '../env.ts'
import type { PublicUser } from '../../shared/contracts/auth.ts'
import type { CreateRequestInput, RequestListQuery } from '../../shared/contracts/requests.ts'
import { DAILY_LOAD_STATUSES, type RequestStatus } from '../../shared/domain/requests.ts'
import type { AuditMetadata } from './auth.ts'

export interface RequestRow {
  id: number; request_number: string; user_id: number; service_id: number; master_id: number | null
  service_mode: 'onsite' | 'dropoff'; client_address: string | null; service_district: string | null; dropoff_point_id: number | null
  preferred_datetime: string; preferred_slot: string; description: string; comment: string | null
  contact_phone: string; contact_person: string | null; photos: string; status: RequestStatus
  needs_manual_review: number; is_urgent: number; total_price: number
  created_at: string; updated_at: string; status_changed_at: string; started_at: string | null; completed_at: string | null
  cancel_reason: string | null; cancelled_by: string | null; assigned_at: string | null
  total_price_cents: number; version: number; last_operation_id: string | null
  estimate_proposal: string | null; approved_parts_cents: number | null
  client_name: string; client_phone: string; service_name: string; master_name: string | null
}
const JOINED_REQUEST = `SELECT r.*,u.full_name AS client_name,u.phone AS client_phone,s.name AS service_name,mu.full_name AS master_name
  FROM requests r JOIN users u ON u.id=r.user_id JOIN services s ON s.id=r.service_id
  LEFT JOIN masters m ON m.id=r.master_id LEFT JOIN users mu ON mu.id=m.user_id`
export function requestDto(row: RequestRow) {
  return {
    id: row.id, request_number: row.request_number, user_id: row.user_id, service_id: row.service_id,
    master_id: row.master_id, assigned_master_id: row.master_id, assigned_at: row.assigned_at,
    service_mode: row.service_mode, client_address: row.client_address, service_district: row.service_district,
    dropoff_point_id: row.dropoff_point_id, preferred_datetime: row.preferred_datetime, preferred_slot: row.preferred_slot,
    description: row.description, comment: row.comment, contact_phone: row.contact_phone, contact_person: row.contact_person,
    photos: JSON.parse(row.photos), status: row.status, needs_manual_review: row.needs_manual_review,
    is_urgent: row.is_urgent, total_price: row.total_price_cents/100, total_price_cents: row.total_price_cents, created_at: row.created_at, updated_at: row.updated_at,
    estimate_proposal: row.estimate_proposal, approved_parts_cents: row.approved_parts_cents,
    status_changed_at: row.status_changed_at, started_at: row.started_at, completed_at: row.completed_at,
    cancel_reason: row.cancel_reason, cancelled_by: row.cancelled_by,
    client_name: row.client_name, client_phone: row.client_phone, service_name: row.service_name, master_name: row.master_name,
  }
}
const WINDOW_END = `strftime('%Y-%m-%dT%H:%M:%fZ',r.preferred_datetime,'+'||(s.average_duration_minutes+CASE WHEN r.service_mode='onsite' THEN 30 ELSE 0 END)||' minutes')`
export const DAILY_LOAD_SQL = `(${DAILY_LOAD_STATUSES.map(status=>`'${status}'`).join(',')})`
// Reused at read time and inside the conditional assignment write.
const ELIGIBLE_SLOT = `SELECT ms.id FROM requests r JOIN services s ON s.id=r.service_id
  JOIN masters m ON m.id=? JOIN users mu ON mu.id=m.user_id
  JOIN master_skills sk ON sk.master_id=m.id AND sk.service_id=s.id
  JOIN master_schedule ms ON ms.master_id=m.id
  WHERE r.id=? AND s.is_active=1 AND mu.is_active=1 AND mu.role='master' AND m.is_available=1
    AND sk.skill_level>=s.required_skill_level
    AND ((r.service_mode='onsite' AND m.is_onsite=1 AND EXISTS(SELECT 1 FROM json_each(m.service_area) WHERE value=r.service_district))
      OR (r.service_mode='dropoff' AND m.is_dropoff=1))
    AND ms.is_booked=0 AND ms.starts_at<=r.preferred_datetime AND ms.ends_at>=${WINDOW_END}
    AND NOT EXISTS(SELECT 1 FROM master_schedule busy WHERE busy.master_id=m.id AND busy.is_booked=1 AND busy.request_id!=r.id
      AND busy.starts_at<${WINDOW_END} AND busy.ends_at>r.preferred_datetime)
    AND (SELECT COUNT(*) FROM requests load WHERE load.master_id=m.id AND load.id!=r.id AND load.status IN ${DAILY_LOAD_SQL}
      AND date(load.preferred_datetime,'+3 hours')=date(r.preferred_datetime,'+3 hours'))<m.max_daily_requests`
export class RequestRepository {
  private db: Env['DB']
  constructor(db: Env['DB']) { this.db = db }
  get(id: number, ownerId?: number): Promise<RequestRow | null> {
    return this.db.prepare(`${JOINED_REQUEST} WHERE r.id=?${ownerId === undefined ? '' : ' AND r.user_id=?'}`)
      .bind(...(ownerId === undefined ? [id] : [id,ownerId])).first<RequestRow>()
  }
  service(id: number) {
    return this.db.prepare('SELECT id,is_active,base_price,average_duration_minutes FROM services WHERE id=?').bind(id)
      .first<{ id: number; is_active: number; base_price: number; average_duration_minutes: number }>()
  }
  point(id: number) { return this.db.prepare('SELECT id FROM service_points WHERE id=? AND is_active=1').bind(id).first() }
  master(id: number) { return this.db.prepare('SELECT id FROM masters WHERE id=?').bind(id).first() }
  eligibleSlot(requestId: number, masterId: number, visit?: { datetime: string; slot: string }) {
    const query = visit ? ELIGIBLE_SLOT.replaceAll('r.preferred_datetime','?3') : ELIGIBLE_SLOT
    return this.db.prepare(`${query} ORDER BY ms.starts_at,ms.id LIMIT 1`).bind(masterId,requestId,...(visit?[visit.datetime]:[])).first<{ id: number }>()
  }
  confirmSlot(requestId: number) {
    return this.db.prepare(`SELECT ms.id FROM requests r JOIN services s ON s.id=r.service_id
      JOIN masters m ON (r.service_mode='onsite' AND m.is_onsite=1) OR (r.service_mode='dropoff' AND m.is_dropoff=1)
      JOIN users mu ON mu.id=m.user_id JOIN master_schedule ms ON ms.master_id=m.id
      WHERE r.id=? AND m.is_available=1 AND mu.is_active=1 AND mu.role='master' AND ms.is_booked=0
      AND ms.starts_at<=r.preferred_datetime AND ms.ends_at>=${WINDOW_END}
      AND NOT EXISTS(SELECT 1 FROM master_schedule busy WHERE busy.master_id=m.id AND busy.is_booked=1 AND busy.request_id!=r.id AND busy.starts_at<${WINDOW_END} AND busy.ends_at>r.preferred_datetime) LIMIT 1`).bind(requestId).first<{ id: number }>()
  }
  async list(query: RequestListQuery, ownerId?: number) {
    const where: string[] = []
    const values: (string | number)[] = []
    if (ownerId !== undefined) { where.push('r.user_id=?'); values.push(ownerId) }
    if (query.status) { where.push('r.status=?'); values.push(query.status) }
    if (query.needs_manual_review !== undefined) { where.push('r.needs_manual_review=?'); values.push(query.needs_manual_review) }
    if (query.search) {
      const needle=query.search.toLocaleLowerCase('ru-RU')
      where.push('(instr(lower(r.request_number),?)>0 OR instr(u.full_name_fold,?)>0 OR instr(r.contact_phone,?)>0 OR instr(u.phone,?)>0)')
      values.push(needle,needle,query.search,query.search)
    }
    const filter = where.length ? ' WHERE '+where.join(' AND ') : ''
    const results = await this.db.batch([
      this.db.prepare(`${JOINED_REQUEST}${filter} ORDER BY r.created_at DESC,r.id DESC LIMIT ? OFFSET ?`).bind(...values,query.limit,query.offset),
      this.db.prepare(`SELECT COUNT(*) AS total FROM requests r JOIN users u ON u.id=r.user_id${filter}`).bind(...values),
    ])
    return { data: (results[0].results as unknown as RequestRow[]).map(requestDto), pagination: { limit: query.limit, offset: query.offset, total: Number((results[1].results[0] as { total: number }).total) } }
  }
  async detail(row: RequestRow) {
    const results = await this.db.batch([
      this.db.prepare(`${JOINED_REQUEST} WHERE r.id=?`).bind(row.id),
      this.db.prepare('SELECT id,from_status,to_status,event_type,changed_by_user_id,changed_by_role,comment,created_at FROM request_status_history WHERE request_id=? ORDER BY created_at,id').bind(row.id),
      this.db.prepare('SELECT id,name,quantity,unit_price FROM request_items WHERE request_id=? ORDER BY id').bind(row.id),
      this.db.prepare('SELECT rp.id,rp.part_id,p.name,rp.quantity,rp.status,rp.unit_price,rp.used_quantity,rp.returned_quantity FROM request_parts rp JOIN parts p ON p.id=rp.part_id WHERE rp.request_id=? ORDER BY rp.id').bind(row.id),
    ])
    const current = results[0].results[0] as unknown as RequestRow | undefined
    return current ? { ...requestDto(current), history: results[1].results, items: results[2].results, parts: results[3].results } : null
  }
  private audit(operation: string, actor: PublicUser | null, metadata: AuditMetadata, action: string, details: object) {
    return this.db.prepare(`INSERT INTO audit_log(user_id,role,action,entity_type,entity_id,details,ip_address,user_agent,event_key)
      SELECT ?,?,?,'request',r.id,?,?,?,? FROM requests r WHERE r.last_operation_id=?`)
      .bind(actor?.id??null,actor?.role??'system',action,JSON.stringify(details),metadata.ip,metadata.userAgent,operation+':audit',operation)
  }
  private history(operation: string, actor: PublicUser | null, from: RequestStatus | null, comment: string, event = 'status_change') {
    return this.db.prepare(`INSERT INTO request_status_history(request_id,from_status,to_status,changed_by_user_id,changed_by_role,comment,event_type)
      SELECT r.id,?,r.status,?,?,?,? FROM requests r WHERE r.last_operation_id=?`)
      .bind(from,actor?.id??null,actor?.role??'system',comment,event,operation)
  }
  private clientNotification(operation: string, type: string, message: string) {
    return this.db.prepare(`INSERT INTO notifications(user_id,request_id,type,message,event_key)
      SELECT r.user_id,r.id,?,?||' ('||r.request_number||')',? FROM requests r WHERE r.last_operation_id=?`)
      .bind(type,message,operation+':client',operation)
  }
  private email(operation: string, message: string) {
    return this.db.prepare(`INSERT INTO notification_queue(user_id,request_id,channel,recipient,subject,message,event_key)
      SELECT r.user_id,r.id,'email',u.email,'TechGURU: '||r.request_number,?,? FROM requests r JOIN users u ON u.id=r.user_id
      WHERE r.last_operation_id=? AND u.email IS NOT NULL`)
      .bind(message,operation+':email',operation)
  }
  private changedRow(operation: string) { return this.db.prepare(`${JOINED_REQUEST} WHERE r.last_operation_id=?`).bind(operation) }
  async create(input: CreateRequestInput, actor: PublicUser, metadata: AuditMetadata, ownerId = actor.id, adminComment: string | null = null): Promise<RequestRow | null> {
    const operation = crypto.randomUUID()
    const statements = [
      this.db.prepare(`INSERT INTO requests(user_id,service_id,service_mode,client_address,service_district,dropoff_point_id,
          preferred_datetime,preferred_slot,description,contact_phone,contact_person,photos,total_price,total_price_cents,last_operation_id,comment)
        SELECT u.id,s.id,?,?,?,?,?,?,?,u.phone,?,?,s.base_price_cents/100,s.base_price_cents,?,?
        FROM users u JOIN services s ON s.id=? WHERE u.id=? AND u.is_active=1 AND u.role='client' AND s.is_active=1
        AND (? IS NULL OR EXISTS(SELECT 1 FROM service_points WHERE id=? AND is_active=1))`)
        .bind(input.service_mode,input.client_address ?? null,input.service_district ?? null,input.dropoff_point_id ?? null,
          input.preferred_datetime,input.preferred_slot,input.description,input.contact_person ?? null,JSON.stringify(input.photos),operation,adminComment,
          input.service_id,ownerId,input.dropoff_point_id ?? null,input.dropoff_point_id ?? null),
      this.db.prepare(`INSERT INTO request_items(request_id,name,quantity,unit_price,unit_price_cents) SELECT r.id,s.name,1,s.base_price_cents/100,s.base_price_cents
        FROM requests r JOIN services s ON s.id=r.service_id WHERE r.last_operation_id=?`).bind(operation),
      this.history(operation,actor,null,'Заявка создана'),
      this.audit(operation,actor,metadata,'request_created',{ to_status: 'new' }),
      this.clientNotification(operation,'request_created','Заявка создана'),
      this.email(operation,'Заявка создана'),
      this.changedRow(operation),
    ]
    const results = await this.db.batch(statements)
    return (results[results.length-1].results[0] as unknown as RequestRow) ?? null
  }
  async cancel(row: RequestRow, actor: PublicUser, metadata: AuditMetadata, reason: string): Promise<RequestRow | null> {
    const operation = crypto.randomUUID()
    const results = await this.db.batch([
      this.db.prepare(`UPDATE requests SET status='cancelled',cancel_reason=?,cancelled_by='client',needs_manual_review=0,
        version=version+1,last_operation_id=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),status_changed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id=? AND user_id=? AND version=? AND status IN ('new','confirmed')
        AND NOT EXISTS(SELECT 1 FROM request_parts WHERE request_id=requests.id AND issued_quantity>0)`)
        .bind(reason,operation,row.id,actor.id,row.version),
      this.db.prepare(`UPDATE stock SET reserved_quantity=reserved_quantity-(SELECT COALESCE(SUM(rp.reserved_quantity),0) FROM request_parts rp WHERE rp.request_id=? AND rp.part_id=stock.part_id)
        WHERE warehouse_id=(SELECT id FROM warehouses WHERE type='central') AND EXISTS(SELECT 1 FROM requests WHERE id=? AND last_operation_id=?)
        AND EXISTS(SELECT 1 FROM request_parts WHERE request_id=? AND part_id=stock.part_id AND reserved_quantity>0)`)
        .bind(row.id,row.id,operation,row.id),
      this.db.prepare(`UPDATE request_parts SET reserved_quantity=0,status='planned',changed_by_user_id=?,changed_by_role='system',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE request_id=? AND reserved_quantity>0 AND EXISTS(SELECT 1 FROM requests WHERE id=? AND last_operation_id=?)`)
        .bind(null,row.id,row.id,operation),
      this.db.prepare('UPDATE master_schedule SET is_booked=0,request_id=NULL WHERE request_id=? AND EXISTS(SELECT 1 FROM requests WHERE id=? AND last_operation_id=?)').bind(row.id,row.id,operation),
      this.history(operation,actor,row.status,reason),
      this.audit(operation,actor,metadata,'request_cancelled',{ from_status: row.status, to_status: 'cancelled', cancel_reason: reason }),
      this.clientNotification(operation,'status_changed','Заявка отменена'),
      this.email(operation,'Заявка отменена'),
      this.changedRow(operation),
    ])
    return (results[results.length-1].results[0] as unknown as RequestRow) ?? null
  }
  async confirm(row: RequestRow, actor: PublicUser | null, metadata: AuditMetadata, manual = true): Promise<RequestRow | null> {
    const operation = crypto.randomUUID()
    const results = await this.db.batch([
      this.db.prepare(`UPDATE requests SET status='confirmed',needs_manual_review=1,version=version+1,last_operation_id=?,
        approved_parts_cents=CASE WHEN ?=1 THEN approved_parts_cents ELSE COALESCE(approved_parts_cents,0) END,
        updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),status_changed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id=? AND version=? AND status='new' AND EXISTS(SELECT 1 FROM services WHERE id=requests.service_id AND is_active=1)
        AND preferred_datetime>?`)
        .bind(operation,manual?1:0,row.id,row.version,new Date().toISOString()),
      this.history(operation,actor,'new','Заявка подтверждена'),
      this.audit(operation,actor,metadata,'request_confirmed',{ from_status: 'new', to_status: 'confirmed' }),
      this.clientNotification(operation,'status_changed','Заявка подтверждена'),
      this.email(operation,'Заявка подтверждена'),
      this.db.prepare(`INSERT INTO notifications(user_id,request_id,type,message,event_key) SELECT u.id,r.id,'manual_assignment_required','Требуется назначение мастера: '||r.request_number,?||':admin:'||u.id
        FROM requests r JOIN users u ON u.role='admin' AND u.is_active=1 WHERE r.last_operation_id=? AND ?=1`).bind(operation,operation,manual?1:0),
      this.changedRow(operation),
    ])
    return (results[results.length-1].results[0] as unknown as RequestRow) ?? null
  }
  async assign(row: RequestRow, masterId: number, slotId: number, actor: PublicUser | null, metadata: AuditMetadata, automatic=false, visit?: { datetime: string; slot: string }): Promise<RequestRow | null> {
    const operation = crypto.randomUUID()
    const datetime = visit?.datetime ?? row.preferred_datetime
    const interval=await this.db.prepare(`SELECT ms.starts_at,ms.ends_at,s.average_duration_minutes duration,${WINDOW_END.replace('r.preferred_datetime','?')} AS work_end FROM requests r JOIN services s ON s.id=r.service_id JOIN master_schedule ms ON ms.id=? WHERE r.id=?`).bind(datetime,slotId,row.id).first<{starts_at:string;ends_at:string;duration:number;work_end:string}>()
    if(!interval)return null
    const eligible = visit ? ELIGIBLE_SLOT.replaceAll('r.preferred_datetime','?2') : ELIGIBLE_SLOT
    const message = visit ? 'Визит перенесён' : 'Мастер назначен'
    const results = await this.db.batch([
      this.db.prepare(`UPDATE requests SET status='assigned',master_id=?,assigned_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
        preferred_datetime=${visit?'?2':'preferred_datetime'},preferred_slot=${visit?'?':'preferred_slot'},
        needs_manual_review=0,version=version+1,last_operation_id=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),status_changed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id=? AND version=? AND status IN ('confirmed','assigned') AND ${visit?'?2':'preferred_datetime'}>?
        AND EXISTS(${eligible} AND ms.id=? AND ms.starts_at=? AND ms.ends_at=?) AND EXISTS(SELECT 1 FROM services WHERE id=requests.service_id AND average_duration_minutes=?)`)
        .bind(masterId,...(visit?[datetime,visit.slot]:[]),operation,row.id,row.version,new Date().toISOString(),masterId,row.id,slotId,interval.starts_at,interval.ends_at,interval.duration),
      this.db.prepare('UPDATE master_schedule SET is_booked=0,request_id=NULL WHERE request_id=? AND EXISTS(SELECT 1 FROM requests WHERE id=? AND last_operation_id=?)').bind(row.id,row.id,operation),
      this.db.prepare(`UPDATE master_schedule SET is_booked=1,request_id=?,starts_at=?,ends_at=? WHERE id=? AND is_booked=0
        AND EXISTS(SELECT 1 FROM requests WHERE id=? AND last_operation_id=?)`).bind(row.id,datetime,interval.work_end,slotId,row.id,operation),
      this.db.prepare(`INSERT INTO master_schedule(master_id,starts_at,ends_at) SELECT ?,?,? WHERE ?<? AND EXISTS(SELECT 1 FROM requests WHERE id=? AND last_operation_id=?)`).bind(masterId,interval.starts_at,datetime,interval.starts_at,datetime,row.id,operation),
      this.db.prepare(`INSERT INTO master_schedule(master_id,starts_at,ends_at) SELECT ?,?,? WHERE ?<? AND EXISTS(SELECT 1 FROM requests WHERE id=? AND last_operation_id=?)`).bind(masterId,interval.work_end,interval.ends_at,interval.work_end,interval.ends_at,row.id,operation),
      this.history(operation,actor,row.status,visit?message:automatic?'Мастер назначен автоматически':'Мастер назначен вручную',visit?'comment':'assignment'),
      this.audit(operation,actor,metadata,visit?'request_rescheduled':'assign_master',{ from_status: row.status, to_status: 'assigned', master_id: masterId, previous_master_id: row.master_id, schedule_id: slotId, automatic, ...(visit?{previous_datetime:row.preferred_datetime,new_datetime:datetime}:{}) }),
      this.clientNotification(operation,visit?'request_updated':'master_assigned',message),
      this.email(operation,message),
      this.db.prepare(`INSERT INTO notifications(user_id,request_id,type,message,event_key) SELECT m.user_id,r.id,?,?||r.request_number,?
        FROM requests r JOIN masters m ON m.id=r.master_id WHERE r.last_operation_id=?`).bind(visit?'request_updated':'master_assigned',visit?'Перенесён визит по заявке ':'Вам назначена заявка ',operation+':master',operation),
      this.db.prepare(`INSERT INTO notifications(user_id,request_id,type,message,event_key) SELECT m.user_id,r.id,'assignment_removed','Заявка передана другому мастеру: '||r.request_number,?
        FROM requests r JOIN masters m ON m.id=? WHERE r.last_operation_id=? AND m.id!=r.master_id`).bind(operation+':previous-master',row.master_id,operation),
      this.changedRow(operation),
    ])
    return (results[results.length-1].results[0] as unknown as RequestRow) ?? null
  }
  async noAnswer(row: RequestRow, actor: PublicUser, metadata: AuditMetadata, comment?: string) {
    const operation = crypto.randomUUID()
    const since = new Date(Date.now()-2*86400000).toISOString()
    const count = `(SELECT COUNT(*) FROM request_status_history h WHERE h.request_id=r.id AND h.event_type='no_answer' AND h.created_at>?)`
    const results = await this.db.batch([
      this.db.prepare(`UPDATE requests SET version=version+1,last_operation_id=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE id=? AND status IN ('new','confirmed','assigned','in_progress','waiting_parts','ready_for_pickup')`).bind(operation,row.id),
      this.db.prepare(`INSERT INTO request_status_history(request_id,from_status,to_status,changed_by_user_id,changed_by_role,comment,event_type)
        SELECT r.id,r.status,r.status,?,'admin',?,'no_answer' FROM requests r WHERE r.last_operation_id=?`)
        .bind(actor.id,comment ? 'Недозвон: '+comment : 'Недозвон',operation),
      this.db.prepare(`UPDATE requests AS r SET needs_manual_review=1 WHERE last_operation_id=? AND ${count}>=3`).bind(operation,since),
      this.audit(operation,actor,metadata,'no_answer',{ comment: comment ?? 'Недозвон' }),
      this.db.prepare(`INSERT INTO notifications(user_id,request_id,type,message,event_key)
        SELECT u.id,r.id,'manual_review','Три недозвона за 2 дня: '||r.request_number,?||':no_answer:'||u.id
        FROM requests r JOIN users u ON u.role='admin' AND u.is_active=1 WHERE r.last_operation_id=? AND ${count}=3`).bind(operation,operation,since),
      this.changedRow(operation),
      this.db.prepare("SELECT COUNT(*) AS count FROM request_status_history WHERE request_id=(SELECT id FROM requests WHERE last_operation_id=?) AND event_type='no_answer' AND created_at>?").bind(operation,since),
    ])
    const changed = results[5].results[0] as unknown as RequestRow | undefined
    if (!changed) return null
    const attempts = results[6].results[0] as unknown as { count: number }
    return { row: changed, attempts: attempts?.count ?? 0 }
  }
}







