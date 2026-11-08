import {dumpDatabase} from '../repositories/backup.ts'
import { z } from 'zod'
import type { Env } from '../env.ts'
import { requireAuth } from '../middleware/auth.ts'
import { json,readJson,HttpError } from '../middleware/http.ts'
import { requireCsrf } from '../security/cookies.ts'
import {clearAuthHeaders} from '../security/cookies.ts'
import { reportDay } from '../../shared/domain/reportDates.ts'
import { BusinessRepository, repairFinishedAt } from '../repositories/business.ts'
import { DAILY_LOAD_SQL } from '../repositories/requests.ts'
const id=z.coerce.number().int().positive(),integer=z.number().int().nonnegative().max(100000000),flag=z.union([z.literal(0),z.literal(1)])
const text=z.string().trim().min(1).max(500),email=z.string().trim().toLowerCase().email().max(254),phone=z.string().trim().regex(/^\+?[\d ()-]{10,25}$/).transform(s=>'+'+s.replace(/\D/g,''))
const profile=z.object({full_name:z.string().trim().min(2).max(150),email,phone,address:z.string().trim().max(500).nullable().optional()}).strict()
const action=z.object({comment:z.string().trim().max(2000).optional(),usage:z.record(z.string(),integer).optional()}).strict()
const directories={
 services:z.object({name:text,equipment_category:text,base_price_cents:integer,average_duration_minutes:integer.min(1).max(1440),required_skill_level:integer.min(1).max(10),is_active:flag.default(1)}).strict(),
 points:z.object({name:text,address:text,working_hours:text.default('Пн–Сб, 10:00–20:00'),is_active:flag.default(1)}).strict(),
 suppliers:z.object({name:text,contact_person:z.string().max(150).nullable().optional(),phone:z.string().max(30).nullable().optional(),email:z.union([email,z.literal('')]).nullable().optional(),is_active:flag.default(1)}).strict(),
 parts:z.object({name:text,sku:text,description:z.string().max(2000).nullable().optional(),unit_price_cents:integer,supplier_id:z.number().int().positive(),min_stock:integer,is_active:flag.default(1)}).strict(),
 users:profile.extend({role:z.enum(['client','master','admin']),is_active:flag.default(1),password:z.string().min(8).max(128).optional()}).strict(),
}
export async function businessRoute(request:Request,env:Env):Promise<Response|null>{
 const path=new URL(request.url).pathname
 if(!/^\/api\/(workspace|profile|notifications(?:\/|$)|business\/|masters(?:\/|$)|admin\/(records\/|jobs|reports|backup)|schedule(?:\/|$))/.test(path))return null
 const {user}=await requireAuth(request,env),repo=new BusinessRepository(env,user,request)
 if(path.startsWith('/api/admin/')||path.startsWith('/api/schedule')||path.startsWith('/api/business/orders/'))repo.admin()
 const restricted=/^\/api\/business\/requests\/\d+\/(start|decline|resume|complete|parts|issue|edit|estimate|reject|cancel|pickup)$/.exec(path)
 if(restricted){const roles:Record<string,string[]>={start:['master'],decline:['master'],resume:['master'],complete:['master'],parts:['master','admin'],issue:['admin'],edit:['admin'],estimate:['admin'],reject:['admin'],cancel:['admin'],pickup:['client','admin']};if(!roles[restricted[1]].includes(user.role))throw new HttpError(403,'FORBIDDEN','Недостаточно прав')}
 if(request.method==='GET'){
  if(path==='/api/workspace')return json({data:await repo.workspace(z.enum(['full','catalog','notifications','users','services','points','suppliers','orders','audit','schedule']).parse(new URL(request.url).searchParams.get('screen')??'full'))})
  if(path==='/api/profile')return json({data:user})
  if(path==='/api/notifications')return json({data:await repo.all('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 500',user.id)})
  const candidates=/^\/api\/business\/requests\/(\d+)\/candidates$/.exec(path)
  if(candidates)return json({data:await repo.candidates(id.parse(candidates[1]),new URL(request.url).searchParams.get('all')==='1')})
  const report=/^\/api\/admin\/reports\/(requests|revenue|top|repair|masters|stock|audit)$/.exec(path)
  if(report){
   repo.admin();const days=z.coerce.number().int().min(1).max(3650).default(30).parse(new URL(request.url).searchParams.get('days')??undefined),since=new Date(reportDay(1-days)+'T00:00:00+03:00').toISOString()
   const type=report[1]
   let rows:Record<string,unknown>[]=[],columns:string[]=[]
   if(type==='requests'){rows=await repo.all('SELECT r.request_number,r.status,r.service_mode,u.full_name client,s.name service,r.created_at,r.total_price_cents/100.0 total_rub FROM requests r JOIN users u ON u.id=r.user_id JOIN services s ON s.id=r.service_id WHERE r.created_at>=? ORDER BY r.id',since);columns=['request_number','status','service_mode','client','service','created_at','total_rub']}
   if(type==='revenue'){rows=await repo.all("SELECT s.equipment_category,SUM(r.total_price_cents)/100.0 revenue_rub FROM requests r JOIN services s ON s.id=r.service_id WHERE r.status IN ('completed','closed') AND r.completed_at>=? GROUP BY s.equipment_category",since);columns=['equipment_category','revenue_rub']}
   if(type==='top'){rows=await repo.all('SELECT s.name,COUNT(*) requests FROM requests r JOIN services s ON s.id=r.service_id WHERE r.created_at>=? GROUP BY s.id ORDER BY requests DESC,s.id LIMIT 5',since);columns=['name','requests']}
   if(type==='repair'){rows=await repo.all(`SELECT r.request_number,s.name,ROUND((julianday(${repairFinishedAt})-julianday(r.started_at))*24,2) hours
     FROM requests r JOIN services s ON s.id=r.service_id
     WHERE r.status IN ('completed','closed') AND r.completed_at>=?
       AND julianday(${repairFinishedAt})>=julianday(r.started_at)`,since);columns=['request_number','name','hours']}
   if(type==='masters'){rows=await repo.all(`SELECT u.full_name,m.max_daily_requests,(SELECT COUNT(*) FROM requests r WHERE r.master_id=m.id AND r.status IN ${DAILY_LOAD_SQL} AND date(r.preferred_datetime,'+3 hours')=date('now','+3 hours')) current_load FROM masters m JOIN users u ON u.id=m.user_id`);columns=['full_name','max_daily_requests','current_load']}
   if(type==='stock'){rows=await repo.all('SELECT w.name warehouse,p.name,p.sku,s.quantity,s.reserved_quantity,s.quantity-s.reserved_quantity available FROM stock s JOIN parts p ON p.id=s.part_id JOIN warehouses w ON w.id=s.warehouse_id');columns=['warehouse','name','sku','quantity','reserved_quantity','available']}
   if(type==='audit'){rows=await repo.all('SELECT created_at,role,action,entity_type,entity_id,details FROM audit_log WHERE created_at>=? ORDER BY id',since);columns=['created_at','role','action','entity_type','entity_id','details']}
   const labels:Record<string,string>={request_number:'Номер заявки',status:'Статус',service_mode:'Канал',client:'Клиент',service:'Услуга',created_at:'Дата',total_rub:'Стоимость, ₽',equipment_category:'Категория',revenue_rub:'Выручка, ₽',name:'Название',requests:'Заявок',hours:'Время ремонта, ч',full_name:'Мастер',max_daily_requests:'Дневной лимит',current_load:'Загрузка',warehouse:'Склад',sku:'Артикул',quantity:'Остаток',reserved_quantity:'Резерв',available:'Доступно',role:'Роль',action:'Действие',entity_type:'Тип объекта',entity_id:'ID объекта',details:'Подробности'}
   const escape=(v:unknown)=>'"'+String(v??'').replace(/^(?=\s*[=+@\-\t\r\n])/,"'").replaceAll('"','""')+'"'
   const csv='\uFEFF'+[columns.map(c=>labels[c]??c),...rows.map(row=>columns.map(c=>row[c]))].map(row=>row.map(escape).join(';')).join('\r\n')
   return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="'+type+'.csv"','Cache-Control':'no-store'}})
  }
  if(path==='/api/admin/backup'){repo.admin();return new Response(await dumpDatabase(env),{headers:{'Content-Type':'application/sql','Content-Disposition':'attachment; filename="techguru-backup.sql"','Cache-Control':'no-store'}})}
  throw new HttpError(404,'NOT_FOUND','Маршрут не найден')
 }
 if(!['POST','PATCH','DELETE'].includes(request.method))throw new HttpError(405,'METHOD_NOT_ALLOWED','Метод не поддерживается')
 requireCsrf(request)
 const body=await readJson(request,true)
 let result:unknown
 const reportRoute=/^\/api\/business\/requests\/(\d+)\/report$/.exec(path)
 if(reportRoute&&request.method==='POST')return json({data:await repo.report(id.parse(reportRoute[1]),z.object({category:z.enum(['qualification','diagnosis','system','other']),message:z.string().trim().min(5).max(2000)}).strict().parse(body))})
 const resolveRoute=/^\/api\/business\/reports\/(\d+)\/resolve$/.exec(path)
 if(resolveRoute&&request.method==='POST')return json({data:await repo.resolveReport(id.parse(resolveRoute[1]))})
 if(path==='/api/profile/password'&&request.method==='POST'){await repo.password(z.object({current_password:z.string().min(1).max(128),new_password:z.string().min(8).max(128)}).strict().parse(body));return json({data:{ok:true}},200,clearAuthHeaders(request,env))}
 if(path==='/api/profile'&&request.method==='PATCH')result=await repo.profile(profile.partial().extend({avatar_url:z.string().max(28000).regex(/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/).nullable().optional()}).strict().parse(body))
 else if(/^\/api\/notifications\/(all|\d+)\/read$/.test(path)&&request.method==='PATCH'){const v=path.split('/')[3];result=await repo.readNotices(v==='all'?undefined:id.parse(v))}
 else if(path==='/api/admin/jobs'&&request.method==='POST')result=await repo.jobs()
 else {
  const match=/^\/api\/business\/requests\/(\d+)\/(start|decline|reject|cancel|pickup|resume|complete|parts|issue|rating|edit|estimate|estimate-decision|reschedule)$/.exec(path)
  const record=/^\/api\/admin\/records\/(services|points|suppliers|parts|users)(?:\/(\d+))?$/.exec(path)
  const master=/^\/api\/masters\/(\d+)$/.exec(path)
  const order=/^\/api\/business\/orders\/(\d+)\/(advance|items)$/.exec(path)
  const schedule=/^\/api\/schedule(?:\/(\d+))?$/.exec(path)
  if(match&&request.method==='POST'){
   const rid=id.parse(match[1]),a=match[2]
   if(a==='parts')result=await repo.requestPart(rid,z.object({part_id:z.number().int().positive(),quantity:integer.min(1).max(1000)}).strict().parse(body))
   else if(a==='issue')result=await repo.issue(rid,z.object({part_id:z.number().int().positive()}).strict().parse(body).part_id)
   else if(a==='rating')result=await repo.rating(rid,z.object({rating:integer.min(1).max(5),comment:z.string().max(1000).optional()}).strict().parse(body))
   else if(a==='edit')result=await repo.editRequest(rid,z.object({description:z.string().trim().min(3).max(2000).optional(),comment:z.string().max(2000).nullable().optional(),preferred_datetime:z.iso.datetime({offset:true}).transform(v=>new Date(v).toISOString()).optional(),preferred_slot:z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/).optional(),client_address:text.nullable().optional(),service_district:z.enum(['Центральный','Северный','Южный']).nullable().optional(),dropoff_point_id:z.number().int().positive().nullable().optional()}).strict().refine(v=>Object.keys(v).length>0).parse(body))
   else if(a==='reschedule')result=await repo.reschedule(rid,z.object({datetime:z.iso.datetime({offset:true}).transform(v=>new Date(v).toISOString()),slot:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d$/)}).strict().parse(body))
   else if(a==='estimate')result=await repo.estimate(rid,z.object({items:z.array(z.object({name:text,quantity:integer.min(1).max(1000),unit_price_cents:integer}).strict()).min(1).max(30),parts_cents:integer,reason:text}).strict().parse(body))
   else if(a==='estimate-decision')result=await repo.decideEstimate(rid,z.object({proposal_id:z.uuid(),accepted:z.boolean()}).strict().parse(body))
   else result=await repo.action(rid,a,action.parse(body))
  }else if(record&&record[1]==='users'&&record[2]&&request.method==='DELETE'){result=await repo.deleteUser(id.parse(record[2]))
  }else if(record&&['POST','PATCH'].includes(request.method)){
   if((record[2]&&request.method!=='PATCH')||(!record[2]&&request.method!=='POST'))throw new HttpError(405,'METHOD_NOT_ALLOWED','Метод не поддерживается')
   const entity=record[1] as keyof typeof directories
   result=await repo.saveDirectory(entity,record[2]?id.parse(record[2]):null,(record[2]?directories[entity].partial():directories[entity]).parse(body))
  }else if(master&&request.method==='PATCH')result=await repo.saveMaster(id.parse(master[1]),z.object({experience_years:integer.max(80).optional(),max_daily_requests:integer.min(1).max(50).optional(),is_available:flag.optional(),is_onsite:flag.optional(),is_dropoff:flag.optional(),service_area:z.array(z.enum(['Центральный','Северный','Южный'])).max(3).optional(),skills:z.array(z.object({service_id:z.number().int().positive(),skill_level:integer.min(1).max(10)}).strict()).max(100).optional()}).strict().parse(body))
  else if(order&&request.method==='POST')result=order[2]==='advance'?await repo.orderAction(id.parse(order[1])):await repo.orderItems(id.parse(order[1]),z.object({items:z.array(z.object({part_id:z.number().int().positive(),quantity:integer.min(1).max(10000)}).strict()).min(1).max(100).refine(v=>new Set(v.map(i=>i.part_id)).size===v.length)}).strict().parse(body))
  else if(path==='/api/business/orders/drafts'&&request.method==='POST'){repo.admin();result=await repo.drafts()}
  else if(schedule&&['POST','PATCH'].includes(request.method))result=await repo.schedule(z.object({master_id:z.number().int().positive(),starts_at:z.iso.datetime({offset:true}).transform(v=>new Date(v).toISOString()),ends_at:z.iso.datetime({offset:true}).transform(v=>new Date(v).toISOString())}).strict().parse(body),schedule[1]?id.parse(schedule[1]):undefined)
  else throw new HttpError(404,'NOT_FOUND','Маршрут не найден')
 }
 return json({data:result})
}
