import type { Env } from '../env.ts'
import type { PublicUser } from '../../shared/contracts/auth.ts'
import { HttpError } from '../middleware/http.ts'
import { auditMetadata } from '../services/auth.ts'
import { DAILY_LOAD_SQL, RequestRepository, requestDto } from './requests.ts'
import { assignRequest } from '../services/requests.ts'
import { hashPassword,verifyPassword } from '../security/passwords.ts'

type Row = Record<string, any>
// For a drop-off repair, the pickup can happen days after the work was finished.
export const repairFinishedAt = `COALESCE(
  (SELECT MAX(h.created_at) FROM request_status_history h
   WHERE h.request_id=r.id AND h.to_status='ready_for_pickup' AND h.created_at>=r.started_at),
  r.completed_at
)`
const now = () => new Date().toISOString()
const statusLabels:Record<string,string>={new:'Новая',confirmed:'Подтверждена',assigned:'Мастер назначен',in_progress:'В работе',waiting_parts:'Ожидание запчастей',ready_for_pickup:'Готова к выдаче',completed:'Завершена',closed:'Закрыта',cancelled:'Отменена',rejected:'Отклонена'}
export class BusinessRepository {
  public env: Env
  public actor: PublicUser
  public request: Request
  public system: boolean
  constructor(env: Env, actor: PublicUser, request: Request, system=false) {this.env=env;this.actor=actor;this.request=request;this.system=system}
  q(sql: string, ...args: any[]) { return this.env.DB.prepare(sql).bind(...args) }
  async all(sql: string, ...args: any[]): Promise<Row[]> { return (await this.q(sql,...args).all<Row>()).results }
  one(sql: string, ...args: any[]): Promise<Row | null> { return this.q(sql,...args).first<Row>() }
  fail(message: string, status = 409): never { throw new HttpError(status,'BUSINESS_CONFLICT',message) }
  admin() { if (this.actor.role!=='admin') this.fail('Недостаточно прав',403) }
  // D1 batches are atomic. A failed optimistic precondition aborts every write.
  guard(condition: string, ...args: any[]) { return this.q(`SELECT CASE WHEN (${condition}) THEN 1 ELSE json('concurrent_change') END`,...args) }
  async batch(statements: D1PreparedStatement[]) {
    try { return await this.env.DB.batch(statements) }
    catch (error) {
      const message = error instanceof Error ? error.message+' '+String(error.cause) : ''
      if (/malformed JSON|integer overflow|concurrent_change|constraint|mismatch|_required|_exists|three_days|invalid_status/i.test(message)) this.fail('Данные изменились или нарушено правило операции. Обновите страницу и проверьте значения.')
      throw error
    }
  }
  audit(action: string, entity: string, id: number, details: object = {}) {
    const meta=auditMetadata(this.request,this.env)
    return this.q('INSERT INTO audit_log(user_id,role,action,entity_type,entity_id,details,ip_address,user_agent) VALUES (?,?,?,?,?,?,?,?)',this.system?null:this.actor.id,this.system?'system':this.actor.role,action,entity,id,JSON.stringify(details),meta.ip,meta.userAgent)
  }
  async owned(id: number) {
    const row=await new RequestRepository(this.env.DB).get(id)
    if (!row || (this.actor.role==='client' && row.user_id!==this.actor.id) || (this.actor.role==='master' && !await this.one('SELECT id FROM masters WHERE id=? AND user_id=?',row.master_id,this.actor.id))) this.fail('Заявка не найдена',404)
    return row
  }
  async candidates(id: number, includeUnavailable=false) {
    if (!this.system) this.admin()
    const r=await this.owned(id), repo=new RequestRepository(this.env.DB)
    const rows=await this.all(`SELECT m.*,u.full_name,sk.skill_level,
      (SELECT group_concat(s.name, ', ') FROM master_skills ms JOIN services s ON s.id=ms.service_id WHERE ms.master_id=m.id) skills_summary,
      (SELECT COUNT(*) FROM requests r2 WHERE r2.master_id=m.id AND r2.id!=? AND r2.status IN ${DAILY_LOAD_SQL} AND date(r2.preferred_datetime,'+3 hours')=date(?,'+3 hours')) current_load,
      (SELECT COUNT(*) FROM requests r3 WHERE r3.master_id=m.id AND r3.status IN ('completed','closed')) completed_count
      FROM masters m JOIN users u ON u.id=m.user_id LEFT JOIN master_skills sk ON sk.master_id=m.id AND sk.service_id=?
      ORDER BY current_load*1.0/NULLIF(m.max_daily_requests,0),sk.skill_level DESC,m.rating DESC,current_load ASC,m.id`,id,r.preferred_datetime,r.service_id)
    const eligible:Row[]=[]
    for (const m of rows) {const slot=await repo.eligibleSlot(id,m.id);if(slot||includeUnavailable)eligible.push({...m,eligible:!!slot,unavailable_reason:slot?'':!m.skill_level?'Нет навыка для этой услуги':m.skill_level< (await this.one('SELECT required_skill_level FROM services WHERE id=?',r.service_id))!.required_skill_level?'Недостаточный уровень навыка':!m.is_available?'Приём заявок приостановлен':m.current_load>=m.max_daily_requests?'Достигнут дневной лимит':'Проверьте активность, формат, район и свободное окно расписания'})}
    return eligible
  }
  async autoAssign(id: number, exclude?: number) {
    const row=await this.owned(id)
    if (row.status!=='confirmed') return requestDto(row)
    for (const candidate of await this.candidates(id)) {
      if(candidate.id===exclude)continue
      try { return await assignRequest(id,candidate.id,this.system?null:this.actor,this.request,this.env,true) }
      catch(error) { if (!(error instanceof HttpError) || error.status!==409) throw error }
    }
    return requestDto(await this.owned(id))
  }
  async workspace(screen = 'full') {
    const admin=this.actor.role==='admin', master=this.actor.role==='master'
    const ownMaster=master ? await this.one('SELECT id FROM masters WHERE user_id=?',this.actor.id) : null
    const requestFilter=admin ? '' : master ? ' WHERE r.master_id=?' : ' WHERE r.user_id=?'
    const scope=admin ? [] : [master ? ownMaster?.id??-1 : this.actor.id]
    const screens:Record<string,string[]>={
      catalog:['services','points'],
      notifications:['notifications','reports','requests','services','masters'],
      users:['users','masters'],
      services:['services','skills','masters'],
      points:['points','requests','services'],
      suppliers:['suppliers','parts','orders','purchaseItems'],
      orders:['suppliers','parts','orders','purchaseItems','stock','warehouses'],
      audit:['audit'],
      schedule:['schedule','masters','requests','services','users'],
    }
    const selected=screen==='full'?null:new Set([...(screens[screen]??[]),'notifications'])
    const queries: {key:string; statement:D1PreparedStatement}[]=[]
    const data:Record<string,any>={user:this.actor,...(selected?{partial:true}:{users:[this.actor]})}
    const read=(key:string,sql:string,...args:any[])=>{if(selected&&!selected.has(key))return;queries.push({key,statement:this.q(sql,...args)})}
    const related=(key:string,table:string)=>read(key,`SELECT related.* FROM ${table} related JOIN requests r ON r.id=related.request_id${requestFilter} ORDER BY related.id`,...scope)
    read('requests',`SELECT r.*,u.full_name client_name,s.name service_name,mu.full_name master_name${admin ? `,${repairFinishedAt} repair_finished_at` : ''} FROM requests r JOIN users u ON u.id=r.user_id JOIN services s ON s.id=r.service_id LEFT JOIN masters m ON m.id=r.master_id LEFT JOIN users mu ON mu.id=m.user_id${requestFilter} ORDER BY r.created_at DESC,r.id DESC`,...scope)
    if(admin)read('users','SELECT id,full_name,phone,email,address,role,is_active,created_at FROM users ORDER BY id')
    if(admin||master){
      read('masters','SELECT m.*,u.full_name,u.email,u.phone FROM masters m JOIN users u ON u.id=m.user_id'+(admin?'':' WHERE m.user_id=?'),...(admin?[]:[this.actor.id]))
      read('stock',admin?'SELECT * FROM stock':"SELECT s.* FROM stock s JOIN warehouses w ON w.id=s.warehouse_id LEFT JOIN masters m ON m.id=w.master_id WHERE m.user_id=? OR w.type='central'",...(admin?[]:[this.actor.id]))
      read('reports',admin?'SELECT mr.*,u.full_name FROM master_reports mr JOIN masters m ON m.id=mr.master_id JOIN users u ON u.id=m.user_id ORDER BY mr.id DESC':'SELECT * FROM master_reports WHERE master_id=? ORDER BY id DESC',...(admin?[]:[ownMaster?.id??-1]))
      read('parts','SELECT *,unit_price_cents/100.0 unit_price FROM parts')
      read('warehouses','SELECT * FROM warehouses'+(admin?'':" WHERE master_id=? OR type='central'"),...(admin?[]:[ownMaster?.id??-1]))
      read('skills','SELECT * FROM master_skills'+(admin?'':' WHERE master_id=?'),...(admin?[]:[ownMaster?.id??-1]))
      read('schedule','SELECT * FROM master_schedule'+(admin?'':' WHERE master_id=?'),...(admin?[]:[ownMaster?.id??-1]))
    }
    read('services','SELECT *,base_price_cents/100.0 base_price FROM services WHERE is_active=1'+(admin?' OR is_active=0':''))
    read('points','SELECT * FROM service_points WHERE is_active=1'+(admin?' OR is_active=0':''))
    if(admin){
      read('suppliers','SELECT * FROM suppliers')
      read('orders','SELECT * FROM purchase_orders ORDER BY id DESC')
      read('purchaseItems','SELECT *,unit_price_cents/100.0 unit_price FROM purchase_order_items')
      read('queue','SELECT * FROM notification_queue ORDER BY id DESC')
      read('audit','SELECT * FROM audit_log ORDER BY id DESC')
    }
    related('history','request_status_history');related('requestParts','request_parts');related('items','request_items');related('ratings','ratings')
    read('notifications','SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC',this.actor.id)
    // One D1 round trip and a consistent read batch, rather than 21 sequential calls.
    const results=await this.env.DB.batch<Row>(queries.map(query=>query.statement))
    queries.forEach((query,index)=>{data[query.key]=results[index].results})
    for(const key of ['reports','masters','stock','parts','warehouses','suppliers','orders','purchaseItems','skills','schedule','queue','audit'])if(!selected||selected.has(key))data[key]??=[]
    if(data.requests)data.requests=data.requests.map((r:Row)=>({...r,total_price:r.total_price_cents/100}))
    for(const key of ['requestParts','items'])if(data[key])data[key]=data[key].map((r:Row)=>({...r,unit_price:r.unit_price_cents/100}))
    return data
  }
  async report(id:number,input:Row){
    if(this.actor.role!=='master')this.fail('Недостаточно прав',403)
    const r=await this.owned(id)
    if(!['assigned','in_progress','waiting_parts'].includes(r.status))this.fail('Обращение доступно для активного ремонта')
    const key=crypto.randomUUID()
    await this.batch([this.guard('EXISTS(SELECT 1 FROM requests WHERE id=? AND master_id=? AND version=?)',id,r.master_id,r.version),
      this.q('INSERT INTO master_reports(request_id,master_id,category,message) VALUES (?,?,?,?)',id,r.master_id,input.category,input.message),
      this.q('UPDATE requests SET needs_manual_review=1,version=version+1 WHERE id=?',id),
      this.q("INSERT INTO notifications(user_id,request_id,type,message,event_key) SELECT id,?,'master_report',?,?||':'||id FROM users WHERE role='admin' AND is_active=1",id,r.request_number+' · Обращение мастера: '+input.message,key),
      this.audit('master.report','request',id,input)])
    return {ok:true}
  }
  async resolveReport(id:number){this.admin();const report=await this.one('SELECT * FROM master_reports WHERE id=?',id);if(!report)this.fail('Обращение не найдено',404);await this.batch([this.q("UPDATE master_reports SET status='resolved',resolved_at=? WHERE id=?",now(),id),this.audit('master.report.resolved','request',report.request_id)]);return {ok:true}}
  async action(id: number, action: string, input: Row) {
    const r=await this.owned(id), master=this.actor.role==='master',admin=this.actor.role==='admin'
    const comment=String(input.comment??'').trim(), op=crypto.randomUUID()
    const statements=[this.guard('EXISTS(SELECT 1 FROM requests WHERE id=? AND version=?)',id,r.version)]
    let target=r.status
    if (action==='start' && master && r.status==='assigned') target='in_progress'
    else if(action==='decline' && master && r.status==='assigned' && comment) target='confirmed'
    else if(action==='reject' && admin && ['new','confirmed','assigned','in_progress','waiting_parts','ready_for_pickup'].includes(r.status) && comment) target='rejected'
    else if(action==='cancel' && admin && ['new','confirmed'].includes(r.status)) target='cancelled'
    else if(action==='pickup' && (admin || this.actor.role==='client') && r.status==='ready_for_pickup') target='completed'
    else if(action==='resume' && master && r.status==='waiting_parts') {
      if (await this.one('SELECT id FROM request_parts WHERE request_id=? AND reserved_quantity+issued_quantity<quantity',id)) this.fail('Не все запчасти обеспечены')
      target='in_progress'
    } else if(action==='complete' && (master||admin) && r.status==='in_progress') {
      if(r.estimate_proposal) this.fail('Дождитесь решения клиента по смете')
      const parts=await this.all('SELECT * FROM request_parts WHERE request_id=?',id)
      let partsTotal=0
      for(const p of parts) {
        const used=Number(input.usage?.[p.id]??input.usage?.[p.part_id]??0)
        const outstanding=p.issued_quantity-p.used_quantity-p.returned_quantity
        if(!Number.isInteger(used)||used<0||used>outstanding) this.fail('Расход не может превышать выданное количество',422)
        const returned=outstanding-used
        statements.push(...await this.stockChange(r.master_id,p.part_id,-outstanding,0))
        if(returned) statements.push(...await this.stockChange(null,p.part_id,returned,0))
        if(p.reserved_quantity) statements.push(...await this.stockChange(null,p.part_id,0,-p.reserved_quantity))
        statements.push(this.q("UPDATE request_parts SET used_quantity=used_quantity+?,returned_quantity=returned_quantity+?,reserved_quantity=0,status=?,changed_by_user_id=?,changed_by_role=? WHERE id=?",used,returned,used?'used':'returned',this.actor.id,this.actor.role,p.id))
        partsTotal+=(p.used_quantity+used)*p.unit_price_cents
      }
      const sum=await this.one('SELECT COALESCE(SUM(quantity*unit_price_cents),0) total FROM request_items WHERE request_id=?',id)
      if(r.approved_parts_cents!==null && partsTotal>r.approved_parts_cents) this.fail('Стоимость использованных деталей превышает согласованную сумму. Запросите новую смету')
      const total=Number(sum?.total??0)+partsTotal
      statements.push(this.q('UPDATE requests SET total_price_cents=?,total_price=? WHERE id=?',total,total/100,id))
      target=r.service_mode==='onsite'?'completed':'ready_for_pickup'
    } else this.fail('Действие недоступно для вашей роли или статуса')
    if(action==='reject'||action==='decline'||action==='cancel') {
      const parts=await this.all('SELECT * FROM request_parts WHERE request_id=?',id)
      for(const p of parts){
        const outstanding=p.issued_quantity-p.used_quantity-p.returned_quantity
        if(outstanding){statements.push(...await this.stockChange(r.master_id,p.part_id,-outstanding,0),...await this.stockChange(null,p.part_id,outstanding,0))}
        if(p.reserved_quantity)statements.push(...await this.stockChange(null,p.part_id,0,-p.reserved_quantity))
        statements.push(this.q("UPDATE request_parts SET reserved_quantity=0,returned_quantity=returned_quantity+?,status='returned' WHERE id=?",outstanding,p.id))
      }
      statements.push(this.q('UPDATE master_schedule SET is_booked=0,request_id=NULL WHERE request_id=?',id))
    }
    statements.push(this.q(`UPDATE requests SET status=?,comment=?,master_id=?,needs_manual_review=?,started_at=CASE WHEN ?='start' THEN ? ELSE started_at END,completed_at=CASE WHEN ?='completed' THEN ? ELSE completed_at END,status_changed_at=?,updated_at=?,version=version+1,last_operation_id=? WHERE id=?`,target,comment||r.comment,action==='decline'?null:r.master_id,action==='decline'?1:0,action,now(),target,now(),now(),now(),op,id),
      this.q('INSERT INTO request_status_history(request_id,from_status,to_status,changed_by_user_id,changed_by_role,comment) VALUES (?,?,?,?,?,?)',id,r.status,target,this.actor.id,this.actor.role,comment||({start:'Мастер принял заявку в работу',decline:'Отказ мастера от назначения',reject:'Заявка отклонена',cancel:'Заявка отменена администратором',pickup:'Техника получена клиентом',resume:'Ремонт возобновлён',complete:'Ремонт завершён'} as Row)[action]||action),this.audit('request.'+action,'request',id,{from:r.status,to:target,comment}))
    statements.push(...this.notices(id,'status_changed',`Заявка ${r.request_number}: ${statusLabels[target]}`))
    if(action==='cancel')statements.push(this.q("UPDATE requests SET cancel_reason=?,cancelled_by='admin' WHERE id=?",comment||'Отменено администратором',id))
    await this.batch(statements)
    if(action==='decline') {
      // Retry candidates using an admin context; actor remains explicit in audit.
      const adminUser=await this.one("SELECT * FROM users WHERE role='admin' AND is_active=1 ORDER BY id LIMIT 1")
      if(adminUser) await new BusinessRepository(this.env,adminUser as PublicUser,this.request).autoAssign(id,r.master_id??undefined)
    }
    return requestDto(await this.ownedAfter(id))
  }
  async ownedAfter(id:number) { const r=await new RequestRepository(this.env.DB).get(id);if(!r)this.fail('Заявка не найдена',404);return r }
  notices(id:number,type:string,message:string) {
    const key=crypto.randomUUID()
    return [this.q(`INSERT INTO notifications(user_id,request_id,type,message,event_key) SELECT user_id,id,?,?,? FROM requests WHERE id=?`,type,message,key+':client',id),
      this.q(`INSERT INTO notifications(user_id,request_id,type,message,event_key) SELECT u.id,r.id,?,?,?||':'||u.id FROM requests r JOIN users u ON u.role='admin' OR u.id=(SELECT user_id FROM masters WHERE id=r.master_id) WHERE r.id=? AND u.id!=r.user_id AND u.is_active=1`,type,message,key,id),
      this.q(`INSERT INTO notification_queue(user_id,request_id,channel,recipient,subject,message,event_key) SELECT u.id,r.id,'email',u.email,'TechGURU',?,? FROM requests r JOIN users u ON u.id=r.user_id WHERE r.id=? AND u.email IS NOT NULL`,message,key+':email',id)]
  }
  async stockChange(masterId:number|null,partId:number,quantity:number,reserved:number):Promise<D1PreparedStatement[]> {
    const w=await this.one(masterId===null?"SELECT id FROM warehouses WHERE type='central'":'SELECT id FROM warehouses WHERE master_id=?',...(masterId===null?[]:[masterId]))
    if(!w)this.fail('Склад не найден')
    const s=await this.one('SELECT * FROM stock WHERE warehouse_id=? AND part_id=?',w.id,partId)
    if(!s) {
      if(quantity<0||reserved<0)this.fail('Недостаточно запчастей на складе')
      return [this.guard('NOT EXISTS(SELECT 1 FROM stock WHERE warehouse_id=? AND part_id=?)',w.id,partId),this.q('INSERT INTO stock(warehouse_id,part_id,quantity,reserved_quantity) VALUES (?,?,?,?)',w.id,partId,quantity,reserved)]
    }
    if(s.quantity+quantity<0||s.reserved_quantity+reserved<0||s.reserved_quantity+reserved>s.quantity+quantity)this.fail('Недостаточно доступных запчастей')
    return [this.guard('EXISTS(SELECT 1 FROM stock WHERE id=? AND quantity=? AND reserved_quantity=?)',s.id,s.quantity,s.reserved_quantity),this.q('UPDATE stock SET quantity=quantity+?,reserved_quantity=reserved_quantity+? WHERE id=?',quantity,reserved,s.id)]
  }
  async requestPart(id:number,input:Row) {
    const r=await this.owned(id)
    if(!['admin','master'].includes(this.actor.role)||!['in_progress','waiting_parts'].includes(r.status))this.fail('Запчасти запрашиваются во время ремонта')
    const p=await this.one('SELECT * FROM parts WHERE id=? AND is_active=1',input.part_id)
    if(!p)this.fail('Запчасть не найдена',422)
    const existing=await this.one('SELECT * FROM request_parts WHERE request_id=? AND part_id=?',id,p.id)
    const s=await this.one("SELECT s.* FROM stock s JOIN warehouses w ON w.id=s.warehouse_id WHERE w.type='central' AND s.part_id=?",p.id)
    const reserve=Math.min(input.quantity,s?s.quantity-s.reserved_quantity:0),target=reserve<input.quantity?'waiting_parts':r.status
    const statements=[this.guard('EXISTS(SELECT 1 FROM requests WHERE id=? AND version=?)',id,r.version),...await this.stockChange(null,p.id,0,reserve),
      existing?this.q("UPDATE request_parts SET quantity=quantity+?,reserved_quantity=reserved_quantity+?,status='reserved',changed_by_user_id=?,changed_by_role=? WHERE id=?",input.quantity,reserve,this.actor.id,this.actor.role,existing.id):this.q("INSERT INTO request_parts(request_id,part_id,quantity,status,unit_price,unit_price_cents,reserved_quantity,changed_by_user_id,changed_by_role) VALUES (?,?,?,'reserved',?,?,?,?,?)",id,p.id,input.quantity,p.unit_price_cents/100,p.unit_price_cents,reserve,this.actor.id,this.actor.role),
      this.q('UPDATE requests SET status=?,version=version+1,updated_at=?,status_changed_at=CASE WHEN status!=? THEN ? ELSE status_changed_at END WHERE id=?',target,now(),target,now(),id),this.audit('parts.requested','request',id,input),...this.notices(id,'parts_requested','Запрошены запчасти')]
    if(target!==r.status)statements.push(this.q('INSERT INTO request_status_history(request_id,from_status,to_status,changed_by_user_id,changed_by_role,comment) VALUES (?,?,?,?,?,?)',id,r.status,target,this.actor.id,this.actor.role,'Ожидание запчастей'))
    await this.batch(statements)
    await this.drafts()
    return {reserved:reserve,missing:input.quantity-reserve}
  }
  async issue(id:number,partId:number) {
    this.admin();const r=await this.owned(id)
    if(!['in_progress','waiting_parts'].includes(r.status)||!r.master_id)this.fail('Выдача доступна для выполняемой заявки')
    const p=await this.one('SELECT * FROM request_parts WHERE request_id=? AND part_id=?',id,partId)
    if(!p?.reserved_quantity)this.fail('Нет резерва для выдачи')
    if(r.estimate_proposal)this.fail('Дождитесь решения клиента по смете')
    if(r.approved_parts_cents!==null){
      const allocated=await this.one('SELECT COALESCE(SUM((issued_quantity-returned_quantity)*unit_price_cents),0) total FROM request_parts WHERE request_id=?',id)
      if(Number(allocated?.total??0)+p.reserved_quantity*p.unit_price_cents>r.approved_parts_cents)this.fail('Стоимость деталей превышает согласованный лимит. Отправьте клиенту новую смету')
    }
    await this.batch([this.guard('EXISTS(SELECT 1 FROM requests WHERE id=? AND version=?)',id,r.version),...await this.stockChange(null,partId,-p.reserved_quantity,-p.reserved_quantity),...await this.stockChange(r.master_id,partId,p.reserved_quantity,0),
      this.q("UPDATE request_parts SET issued_quantity=issued_quantity+reserved_quantity,reserved_quantity=0,status='issued',changed_by_user_id=?,changed_by_role='admin' WHERE id=?",this.actor.id,p.id),this.q('UPDATE requests SET version=version+1 WHERE id=?',id),this.audit('parts.issued','request',id,{part_id:partId}),...this.notices(id,'parts_issued','Запчасти выданы мастеру')])
    return {issued:p.reserved_quantity}
  }
  async drafts() {
    this.adminOrWorker()
    const need=`MAX(p.min_stock*2,COALESCE((SELECT SUM(rp.quantity-rp.reserved_quantity-rp.issued_quantity) FROM request_parts rp JOIN requests r ON r.id=rp.request_id WHERE rp.part_id=p.id AND r.status='waiting_parts'),0))+s.reserved_quantity-s.quantity-COALESCE((SELECT SUM(i.quantity) FROM purchase_order_items i JOIN purchase_orders po ON po.id=i.purchase_order_id WHERE i.part_id=p.id AND po.status IN ('pending','sent')),0)`
    const source=`FROM parts p JOIN suppliers sup ON sup.id=p.supplier_id AND sup.is_active=1 JOIN stock s ON s.part_id=p.id JOIN warehouses w ON w.id=s.warehouse_id AND w.type='central' WHERE p.is_active=1 AND (s.quantity-s.reserved_quantity<p.min_stock OR EXISTS(SELECT 1 FROM request_parts rp JOIN requests r ON r.id=rp.request_id WHERE rp.part_id=p.id AND r.status='waiting_parts' AND rp.quantity>rp.reserved_quantity+rp.issued_quantity)) AND (${need})>0`
    await this.batch([
      this.q(`INSERT INTO purchase_orders(supplier_id,order_number,status,created_by_user_id) SELECT supplier_id,'PO-'||strftime('%Y','now')||'-'||printf('%04d',(SELECT COALESCE(MAX(id),0) FROM purchase_orders)+ROW_NUMBER() OVER(ORDER BY supplier_id)),'draft',? FROM (SELECT DISTINCT p.supplier_id ${source}) x WHERE NOT EXISTS(SELECT 1 FROM purchase_orders o WHERE o.supplier_id=x.supplier_id AND o.status='draft')`,this.actor.id),
      this.q(`DELETE FROM purchase_order_items WHERE purchase_order_id IN (SELECT id FROM purchase_orders WHERE status='draft') AND part_id NOT IN (SELECT p.id ${source})`),
      this.q(`INSERT INTO purchase_order_items(purchase_order_id,part_id,quantity,unit_price,unit_price_cents) SELECT (SELECT id FROM purchase_orders o WHERE o.supplier_id=p.supplier_id AND o.status='draft' ORDER BY id LIMIT 1),p.id,${need},p.unit_price_cents/100.0,p.unit_price_cents ${source} ON CONFLICT(purchase_order_id,part_id) DO UPDATE SET quantity=MAX(purchase_order_items.quantity,excluded.quantity),unit_price_cents=excluded.unit_price_cents,unit_price=excluded.unit_price`),
      this.q("DELETE FROM purchase_orders WHERE status='draft' AND NOT EXISTS(SELECT 1 FROM purchase_order_items WHERE purchase_order_id=purchase_orders.id)"),
      this.q(`INSERT OR IGNORE INTO notifications(user_id,type,message,event_key) SELECT u.id,'purchase_draft','Сформирован черновик закупки '||o.order_number,'draft:'||o.id||':'||u.id FROM purchase_orders o JOIN users u ON u.role='admin' AND u.is_active=1 WHERE o.status='draft'`),
      this.audit('procurement.checked','purchase_order',0)])
    return {ok:true}
  }

  adminOrWorker(){if(this.actor.role!=='admin'&&this.actor.role!=='master')this.fail('Недостаточно прав',403)}
  async orderAction(id:number) {
    this.admin();const o=await this.one('SELECT * FROM purchase_orders WHERE id=?',id)
    if(!o)this.fail('Заказ не найден',404)
    const target=({draft:'pending',pending:'sent',sent:'received'} as Row)[o.status]
    if(!target)this.fail('Заказ уже получен')
    const items=await this.all('SELECT * FROM purchase_order_items WHERE purchase_order_id=?',id)
    if(!items.length)this.fail('Заказ пуст')
    const statements=[this.guard('EXISTS(SELECT 1 FROM purchase_orders WHERE id=? AND status=?)',id,o.status)]
    if(target==='received')for(const p of items)statements.push(...await this.stockChange(null,p.part_id,p.quantity,0))
    statements.push(this.q('UPDATE purchase_orders SET status=?,sent_at=CASE WHEN ?=\'sent\' THEN ? ELSE sent_at END,received_at=?,updated_at=? WHERE id=?',target,target,now(),target==='received'?now():null,now(),id),this.audit('purchase_order.'+target,'purchase_order',id))
    await this.batch(statements)
    if(target==='received')await this.fulfil()
    return {status:target}
  }
  async orderItems(id:number,input:Row){
    this.admin();const o=await this.one('SELECT * FROM purchase_orders WHERE id=?',id)
    if(!o||o.status!=='draft')this.fail('Состав редактируется только у черновика')
    const statements=[this.guard("EXISTS(SELECT 1 FROM purchase_orders WHERE id=? AND status='draft')",id),this.q('DELETE FROM purchase_order_items WHERE purchase_order_id=?',id)]
    for(const item of input.items){const part=await this.one('SELECT * FROM parts WHERE id=? AND supplier_id=? AND is_active=1',item.part_id,o.supplier_id);if(!part)this.fail('Деталь должна относиться к поставщику заказа',422);statements.push(this.q('INSERT INTO purchase_order_items(purchase_order_id,part_id,quantity,unit_price,unit_price_cents) VALUES (?,?,?,?,?)',id,part.id,item.quantity,part.unit_price_cents/100,part.unit_price_cents))}
    statements.push(this.q('UPDATE purchase_orders SET updated_at=? WHERE id=?',now(),id),this.audit('purchase_order.items_updated','purchase_order',id))
    await this.batch(statements);return {ok:true}
  }
  async fulfil() {
    const waiting=await this.all("SELECT r.id FROM requests r JOIN request_parts p ON p.request_id=r.id WHERE r.status='waiting_parts' AND p.quantity>p.reserved_quantity+p.issued_quantity GROUP BY r.id ORDER BY MIN(p.needed_at),MIN(p.id),r.id")
    for(const item of waiting) {
      const r=await this.ownedAfter(item.id),parts=await this.all('SELECT * FROM request_parts WHERE request_id=? ORDER BY needed_at,id',r.id)
      const statements=[this.guard('EXISTS(SELECT 1 FROM requests WHERE id=? AND version=?)',r.id,r.version)]
      let full=true,received=false
      for(const p of parts){
        const missing=p.quantity-p.reserved_quantity-p.issued_quantity
        if(missing<=0)continue
        const s=await this.one("SELECT s.* FROM stock s JOIN warehouses w ON w.id=s.warehouse_id WHERE w.type='central' AND s.part_id=?",p.part_id)
        const reserve=Math.min(missing,s?s.quantity-s.reserved_quantity:0)
        if(reserve<missing)full=false
        if(reserve)received=true
        if(reserve)statements.push(...await this.stockChange(null,p.part_id,0,reserve),this.q('UPDATE request_parts SET reserved_quantity=reserved_quantity+? WHERE id=?',reserve,p.id))
      }
      statements.push(this.q('UPDATE requests SET version=version+1 WHERE id=?',r.id))
      if(full)statements.push(this.q("UPDATE requests SET status='in_progress',status_changed_at=?,updated_at=? WHERE id=?",now(),now(),r.id),this.q("INSERT INTO request_status_history(request_id,from_status,to_status,changed_by_role,comment) VALUES (?,'waiting_parts','in_progress','system','Запчасти обеспечены')",r.id),this.audit('parts.fulfilled','request',r.id),...this.notices(r.id,'parts_available','Запчасти поступили, ремонт возобновлён'))
      if(received&&!full)statements.push(...this.notices(r.id,'parts_partial','Часть запчастей поступила. Ожидаем оставшиеся детали.'))
      try {await this.batch(statements)}catch(error){if(!(error instanceof HttpError)||error.status!==409)throw error}
    }
  }
  async profile(input:Row) {
    const values={full_name:input.full_name??this.actor.full_name,email:input.email??this.actor.email,phone:input.phone??this.actor.phone,address:input.address??this.actor.address}
    await this.batch([this.q('UPDATE users SET full_name=?,full_name_fold=?,email=?,phone=?,address=?,avatar_url=? WHERE id=?',values.full_name,values.full_name.toLocaleLowerCase('ru-RU'),values.email,values.phone,values.address,input.avatar_url===undefined?this.actor.avatar_url??null:input.avatar_url,this.actor.id),this.audit('profile.updated','user',this.actor.id)])
    return {ok:true}
  }
  async password(input:Row){
    const old=await this.one('SELECT password_hash FROM users WHERE id=?',this.actor.id)
    if(!old||!await verifyPassword(input.current_password,old.password_hash))this.fail('Текущий пароль указан неверно',422)
    const hash=await hashPassword(input.new_password)
    await this.batch([this.guard('EXISTS(SELECT 1 FROM users WHERE id=? AND password_hash=?)',this.actor.id,old.password_hash),this.q('UPDATE users SET password_hash=? WHERE id=?',hash,this.actor.id),this.q('DELETE FROM sessions WHERE user_id=?',this.actor.id),this.audit('password.changed','user',this.actor.id)])
    return {ok:true}
  }
  async rating(id:number,input:Row) {
    if(this.actor.role!=='client')this.fail('Недостаточно прав',403)
    const r=await this.owned(id)
    if(!['completed','closed'].includes(r.status)||!r.master_id)this.fail('Оценка доступна после завершения ремонта')
    await this.batch([this.q('INSERT INTO ratings(request_id,master_id,user_id,rating,comment) VALUES (?,?,?,?,?)',id,r.master_id,this.actor.id,input.rating,input.comment??''),
      this.q('UPDATE masters SET rating=(SELECT AVG(rating) FROM ratings WHERE master_id=?) WHERE id=?',r.master_id,r.master_id),this.audit('rating.created','request',id)])
    return {ok:true}
  }
  async readNotices(id?:number) {
    await this.batch([this.q('UPDATE notifications SET is_read=1 WHERE user_id=?'+(id?' AND id=?':''),this.actor.id,...(id?[id]:[]))])
    return {ok:true}
  }
  async saveDirectory(entity:string,id:number|null,input:Row) {
    this.admin()
    const columns:Record<string,string[]>={
      services:['name','equipment_category','base_price_cents','average_duration_minutes','required_skill_level','is_active'],
      points:['name','address','working_hours','is_active'],suppliers:['name','contact_person','phone','email','is_active'],
      parts:['name','sku','description','unit_price_cents','supplier_id','min_stock','is_active'],
      users:['full_name','phone','email','address','role','is_active'],
    }
    if(!columns[entity])this.fail('Справочник не найден',404)
    const table=entity==='points'?'service_points':entity
    const keys=columns[entity].filter(k=>input[k]!==undefined)
    if(!keys.length)this.fail('Нет полей для изменения',422)
    if(entity==='users'&&id===this.actor.id&&(input.is_active===0||input.role&&input.role!=='admin'))this.fail('Нельзя отключить собственную учётную запись')
    let createMaster=entity==='users'&&!id&&input.role==='master'
    if(entity==='users'&&id){
      const old=await this.one('SELECT role FROM users WHERE id=?',id)
      if(!old)this.fail('Пользователь не найден',404)
      if(input.role&&input.role!==old.role&&old.role==='master')this.fail('У пользователя есть профиль мастера. Сохраните роль и при необходимости отключите доступ.')
      createMaster=input.role==='master'&&old.role!=='master'
    }
    if(entity==='services'&&input.base_price_cents!==undefined){keys.push('base_price');input.base_price=input.base_price_cents/100}
    if(entity==='parts'&&input.unit_price_cents!==undefined){keys.push('unit_price');input.unit_price=input.unit_price_cents/100}
    if(entity==='users'&&input.full_name!==undefined){keys.push('full_name_fold');input.full_name_fold=input.full_name.toLocaleLowerCase('ru-RU')}
    if(entity==='users'&&input.password){keys.push('password_hash');input.password_hash=await hashPassword(input.password)}
    if(!id&&entity==='users'&&!input.password)this.fail('Укажите начальный пароль',422)
    const query=id?this.q(`UPDATE ${table} SET ${keys.map(k=>k+'=?').join(',')} WHERE id=? RETURNING id`,...keys.map(k=>input[k]),id):this.q(`INSERT INTO ${table}(${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')}) RETURNING id`,...keys.map(k=>input[k]))
    // Audit insertion uses RETURNING-independent last_insert_rowid only within
    // the same D1 batch and immediately after the entity insert.
    const meta=auditMetadata(this.request,this.env)
    const statements=[query]
    if(createMaster)statements.push(this.q(`INSERT INTO masters(user_id,is_onsite,is_dropoff) SELECT id,1,1 FROM users WHERE ${id?'id':'email'}=?`,id??input.email),this.q(`INSERT INTO warehouses(name,type,master_id) SELECT ?,'master',m.id FROM masters m JOIN users u ON u.id=m.user_id WHERE u.${id?'id':'email'}=?`,'Мобильный склад '+(input.full_name??id),id??input.email))
    if(entity==='parts'&&!id)statements.push(this.q("INSERT INTO stock(warehouse_id,part_id,quantity) SELECT w.id,p.id,0 FROM warehouses w JOIN parts p ON p.sku=? WHERE w.type='central'",input.sku))
    const lookup=id?'?':entity==='users'?'(SELECT id FROM users WHERE email=?)':entity==='parts'?'(SELECT id FROM parts WHERE sku=?)':'last_insert_rowid()'
    const identity=id?[id]:entity==='users'?[input.email]:entity==='parts'?[input.sku]:[]
    statements.push(this.q(`INSERT INTO audit_log(user_id,role,action,entity_type,entity_id,details,ip_address,user_agent) VALUES (?,'admin',?,?,${lookup},'{}',?,?)`,this.actor.id,id?'record.updated':'record.created',entity,...identity,meta.ip,meta.userAgent))
    const result=await this.batch(statements)
    const savedId=Number((result[0].results[0] as Row|undefined)?.id)
    if(!savedId)this.fail('Запись не найдена',404)
    return {id:savedId}
  }
  async saveMaster(id:number,input:Row) {
    const m=await this.one('SELECT * FROM masters WHERE id=?',id)
    if(!m||(this.actor.role!=='admin'&&m.user_id!==this.actor.id))this.fail('Мастер не найден',404)
    if(this.actor.role!=='admin'&&(input.experience_years!==undefined||input.max_daily_requests!==undefined))this.fail('Навыки, стаж и дневной лимит изменяет администратор',403)
    const fields=['experience_years','max_daily_requests','is_available','is_onsite','is_dropoff','service_area'].filter(k=>input[k]!==undefined)
    const statements=[]
    if(fields.length)statements.push(this.q(`UPDATE masters SET ${fields.map(k=>k+'=?').join(',')} WHERE id=?`,...fields.map(k=>k==='service_area'?JSON.stringify(input[k]):input[k]),id))
    if(input.skills){
      if(new Set(input.skills.map((s:Row)=>s.service_id)).size!==input.skills.length)this.fail('Навыки не должны повторяться',422)
      statements.push(this.q('DELETE FROM master_skills WHERE master_id=?',id))
      for(const s of input.skills)statements.push(this.q('INSERT INTO master_skills(master_id,service_id,skill_level) VALUES (?,?,?)',id,s.service_id,s.skill_level))
    }
    statements.push(this.audit('master.updated','master',id))
    await this.batch(statements);return {ok:true}
  }
  async schedule(input:Row,id?:number) {
    this.admin()
    if(Date.parse(input.ends_at)<=Date.parse(input.starts_at))this.fail('Конец интервала должен быть позже начала',422)
    const statements=[this.guard('NOT EXISTS(SELECT 1 FROM master_schedule WHERE master_id=? AND id!=? AND starts_at<? AND ends_at>?)',input.master_id,id??-1,input.ends_at,input.starts_at)]
    if(id)statements.push(this.guard('EXISTS(SELECT 1 FROM master_schedule WHERE id=? AND is_booked=0)',id),this.q('UPDATE master_schedule SET master_id=?,starts_at=?,ends_at=? WHERE id=?',input.master_id,input.starts_at,input.ends_at,id))
    else statements.push(this.q('INSERT INTO master_schedule(master_id,starts_at,ends_at) VALUES (?,?,?)',input.master_id,input.starts_at,input.ends_at))
    statements.push(this.audit('schedule.saved','master',input.master_id));await this.batch(statements);return {ok:true}
  }
  async editRequest(id:number,input:Row) {
    this.admin();const r=await this.owned(id)
    if(!['new','confirmed'].includes(r.status))this.fail('Редактирование доступно до назначения')
    const nextDate=input.preferred_datetime??r.preferred_datetime,nextSlot=input.preferred_slot??r.preferred_slot
    if(input.preferred_datetime||input.preferred_slot){const start=new Date(nextDate).toLocaleTimeString('en-GB',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'});const [a,b]=nextSlot.split('-').map((v:string)=>Number(v.slice(0,2))*60+Number(v.slice(3)));if(Date.parse(nextDate)<=Date.now()||start!==nextSlot.slice(0,5)||b-a!==120)this.fail('Проверьте будущую дату и двухчасовой слот по московскому времени',422)}
    const fields=['description','comment','preferred_datetime','preferred_slot','client_address','service_district','dropoff_point_id'].filter(k=>input[k]!==undefined)
    await this.batch([this.guard('EXISTS(SELECT 1 FROM requests WHERE id=? AND version=?)',id,r.version),this.q(`UPDATE requests SET ${fields.map(k=>k+'=?').join(',')},version=version+1,updated_at=? WHERE id=?`,...fields.map(k=>input[k]),now(),id),this.audit('request.updated','request',id),...this.notices(id,'request_updated','Администратор уточнил детали заявки')]);return {ok:true}
  }
  async reschedule(id: number, visit: { datetime: string; slot: string }) {
    this.admin()
    const row = await this.owned(id)
    if (row.status !== 'assigned' || row.master_id === null) this.fail('Перенос доступен до начала назначенного ремонта')
    const start = new Date(visit.datetime).toLocaleTimeString('en-GB', { timeZone:'Europe/Moscow', hour:'2-digit', minute:'2-digit' })
    const [from,to] = visit.slot.split('-').map(value => Number(value.slice(0,2))*60+Number(value.slice(3)))
    if (Date.parse(visit.datetime)<=Date.now() || start!==visit.slot.slice(0,5) || to-from!==120 || new Date(visit.datetime).getUTCSeconds() || new Date(visit.datetime).getUTCMilliseconds()) {
      this.fail('Выберите будущий двухчасовой слот по московскому времени',422)
    }
    const repo = new RequestRepository(this.env.DB)
    const slot = await repo.eligibleSlot(id,row.master_id,visit)
    if (!slot) this.fail('У назначенного мастера нет свободного окна на это время')
    const changed = await repo.assign(row,row.master_id,slot.id,this.actor,auditMetadata(this.request,this.env),false,visit)
    if (!changed) this.fail('Расписание или заявка изменились. Обновите данные')
    return requestDto(changed)
  }
  async estimate(id:number,input:Row){
    this.admin();const r=await this.owned(id)
    if(!['new','confirmed','assigned','in_progress','waiting_parts'].includes(r.status))this.fail('Смета завершённой заявки не меняется')
    const proposal={ id:crypto.randomUUID(), items:input.items, parts_cents:input.parts_cents, reason:input.reason }
    const statements=[this.guard('EXISTS(SELECT 1 FROM requests WHERE id=? AND version=?)',id,r.version),
      this.q('UPDATE requests SET estimate_proposal=?,approved_parts_cents=COALESCE(approved_parts_cents,0),version=version+1 WHERE id=?',JSON.stringify(proposal),id),
      this.audit('estimate.proposed','request',id,proposal),...this.notices(id,'estimate_updated','Новая смета ожидает решения клиента')]
    await this.batch(statements);return {ok:true}
  }
  async decideEstimate(id:number,input:{proposal_id:string; accepted:boolean}){
    if(this.actor.role!=='client')this.fail('Решение по смете принимает клиент',403)
    const row=await this.owned(id)
    const proposal=row.estimate_proposal?JSON.parse(row.estimate_proposal):null
    if(!proposal||proposal.id!==input.proposal_id||!['new','confirmed','assigned','in_progress','waiting_parts'].includes(row.status))this.fail('Смета изменилась или уже рассмотрена')
    const statements=[this.guard('EXISTS(SELECT 1 FROM requests WHERE id=? AND version=?)',id,row.version)]
    if(input.accepted){
      statements.push(this.q('DELETE FROM request_items WHERE request_id=?',id))
      for(const item of proposal.items)statements.push(this.q('INSERT INTO request_items(request_id,name,quantity,unit_price,unit_price_cents) VALUES (?,?,?,?,?)',id,item.name,item.quantity,item.unit_price_cents/100,item.unit_price_cents))
      const total=proposal.items.reduce((sum:number,item:Row)=>sum+item.quantity*item.unit_price_cents,0)+proposal.parts_cents
      statements.push(this.q('UPDATE requests SET total_price_cents=?,total_price=?,approved_parts_cents=? WHERE id=?',total,total/100,proposal.parts_cents,id))
    }
    statements.push(this.q('UPDATE requests SET estimate_proposal=NULL,version=version+1 WHERE id=?',id),
      this.audit(input.accepted?'estimate.accepted':'estimate.rejected','request',id,{proposal_id:proposal.id}),
      ...this.notices(id,'estimate_updated',input.accepted?'Клиент согласовал смету':'Клиент отклонил новую смету'))
    await this.batch(statements);return {ok:true}
  }
  async jobs() {
    this.admin();await this.fulfil();await this.drafts()
    const rows=await this.all("SELECT * FROM requests WHERE status IN ('new','confirmed','assigned','in_progress','waiting_parts','ready_for_pickup','completed')")
    for(const r of rows){
      const age=Date.now()-Date.parse(r.status_changed_at)
      const until=Date.parse(r.preferred_datetime)-Date.now()
      if(r.service_mode==='onsite'&&r.status==='assigned'&&until>0&&until<=2*3600000)await this.batch([this.q(`INSERT OR IGNORE INTO notifications(user_id,request_id,type,message,event_key) SELECT u.id,?,'visit_reminder','Выезд мастера в течение двух часов',?||':'||u.id FROM users u WHERE u.id=? OR u.id=(SELECT user_id FROM masters WHERE id=?)`,r.id,'reminder:'+r.id+':'+r.preferred_datetime,r.user_id,r.master_id)])
      if(r.status==='confirmed'&&age>=4*3600000)await this.batch([this.q("UPDATE requests SET is_urgent=1 WHERE id=? AND status='confirmed'",r.id)])
      if(r.status==='completed'&&r.completed_at&&Date.now()-Date.parse(r.completed_at)>=3*86400000){
        await this.batch([this.guard("EXISTS(SELECT 1 FROM requests WHERE id=? AND status='completed' AND version=?)",r.id,r.version),this.q("UPDATE requests SET status='closed',status_changed_at=?,updated_at=?,version=version+1 WHERE id=?",now(),now(),r.id),this.q("INSERT INTO request_status_history(request_id,from_status,to_status,changed_by_role,comment) VALUES (?,'completed','closed','system','Автозакрытие через три дня')",r.id),this.q('UPDATE master_schedule SET is_booked=0,request_id=NULL WHERE request_id=?',r.id),this.audit('request.auto_closed','request',r.id),...this.notices(r.id,'closed','Заявка закрыта')])
      }
      const thresholds:Record<string,number[]>={new:[2],confirmed:[4],assigned:[24],in_progress:[7*24],waiting_parts:[14*24],ready_for_pickup:[14*24,30*24]}
      for(const hours of thresholds[r.status]??[])if(age>=hours*3600000){
        const key=`escalation:${r.id}:${r.status_changed_at}:${hours}`
        const client=r.status==='ready_for_pickup'&&hours===14*24
        await this.batch([this.q(`INSERT OR IGNORE INTO notifications(user_id,request_id,type,message,event_key) SELECT u.id,?,'escalation',?,?||':'||u.id FROM users u WHERE u.is_active=1 AND ${client?'u.id=?':r.status==='assigned'?"(u.role='admin' OR u.id=(SELECT user_id FROM masters WHERE id="+Number(r.master_id)+"))":"u.role='admin'"}`,r.id,'Заявка '+r.request_number+': требуется внимание',key,...(client?[r.user_id]:[]))])
      }
    }
    return {ok:true}
  }
}

