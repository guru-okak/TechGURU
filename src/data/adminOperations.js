import {api,mutate} from '../api/client'
import { reactive } from 'vue'
import { servicePoints } from './servicePoints'
import { adminRequests,adminMasters,adminClients,adminServices,adminSkills,adminStock,adminParts,auditEvents,purchaseOrders,purchaseItems,today,masterLoad } from './admin'
export const adminPoints=reactive([]),adminSuppliers=reactive([]),adminHistory=reactive([]),adminNotices=reactive([])
export const orderLabels={draft:'Черновик',pending:'Подтверждён',sent:'Отправлен поставщику',received:'Получен'}
export const orderTones={draft:'amber',pending:'blue',sent:'purple',received:'green'}
export function nextId(rows){return Math.max(0,...rows.map(r=>r.id))+1}
export function logAdmin(action,entity_type,entity_id,details={}){
 auditEvents.unshift({id:nextId(auditEvents),user_id:1,role:'admin',action,entity_type,entity_id,details:JSON.stringify(details),created_at:new Date().toISOString()})
}
export function auditLabel(event){
 return ({request_created:'Создана заявка',request_confirmed:'Заявка подтверждена',assign_master:'Назначен мастер',request_rescheduled:'Перенесён визит',request_cancelled:'Заявка отменена',no_answer:'Зафиксирован недозвон',refresh:'Обновлена сессия',login:'Вход в систему','procurement.checked':'Проверены потребности склада','request.created':'Создана заявка','request.status_changed':'Изменён статус заявки','request.confirmed':'Заявка подтверждена','request.assigned':'Назначен мастер','request.no_answer':'Зафиксирован недозвон','request.updated':'Изменены детали заявки','purchase_order.pending':'Закупка подтверждена','purchase_order.sent':'Заказ отправлен поставщику','purchase_order.received':'Поставка получена','record.updated':'Изменена запись справочника','record.created':'Создана запись справочника','service.deleted':'Услуга удалена','service.archived':'Услуга архивирована'})[event.action]??event.action
}
export function auditTarget(event){
 const map={request:'requests',service:'services',client:'clients',master:'masters',part:'warehouse',supplier:'suppliers',service_point:'points',purchase_order:'orders'}
 return '/admin/'+(map[event.entity_type]??'audit')+(event.entity_type==='request'?'?request='+event.entity_id:'')
}
export function noteRequest(r,from,comment){
 adminHistory.unshift({id:nextId(adminHistory),request_id:r.id,from_status:from,to_status:r.status,changed_by_user_id:1,changed_by_role:'admin',comment,created_at:new Date().toISOString()})
}
export async function transitionRequest(id,status,comment=''){
 if(status==='confirmed')return mutate('/admin/requests/'+id+'/confirm',{},'PATCH')
 return mutate('/business/requests/'+id+'/'+({rejected:'reject',completed:'pickup'}[status]??status),{comment})
}

export function eligibleMasters(r){return adminMasters.filter(m=>m.is_available&&adminSkills.some(s=>s.master_id===m.id&&s.service_id===r?.service_id))}

export function assignMaster(id,masterId){return mutate('/admin/requests/'+id+'/assign',{master_id:Number(masterId)},'PATCH')}

export async function noAnswer(id){return (await mutate('/admin/requests/'+id+'/no-answer')).no_answer_count}

export async function saveRequest(form,id=null){
 const data={description:form.description,preferred_datetime:form.preferred_datetime+'T'+form.preferred_slot.slice(0,5)+':00+03:00',preferred_slot:form.preferred_slot,...(form.service_mode==='onsite'?{client_address:form.client_address,service_district:form.service_district??'Центральный',dropoff_point_id:null}:{dropoff_point_id:Number(form.dropoff_point_id),client_address:null,service_district:null})}
 if(id)return mutate('/business/requests/'+id+'/edit',{...data,comment:form.comment??''})
 return mutate('/admin/requests',{...data,user_id:Number(form.user_id),service_id:Number(form.service_id),service_mode:form.service_mode,comment:form.comment?.trim()||null})
}

export function orderTotal(id){return purchaseItems.filter(i=>i.purchase_order_id===id).reduce((sum,i)=>sum+i.quantity*i.unit_price,0)}
export async function advanceOrder(id){return (await mutate('/business/orders/'+id+'/advance')).status}

export const adminPartKinds={1:{kind:'display',category:'Смартфоны'},2:{kind:'battery',category:'Смартфоны'},3:{kind:'ssd',category:'Ноутбуки и ПК'},4:{kind:'paste',category:'Ноутбуки и ПК'},5:{kind:'pump',category:'Бытовая техника'},6:{kind:'connector',category:'Смартфоны'},7:{kind:'cable',category:'Смартфоны'},8:{kind:'adapter',category:'Ноутбуки и ПК'}}
export function adminPartKind(id){const name=adminParts.find(p=>p.id===id)?.name??'';return /экран|дисплей/i.test(name)?{kind:'display',category:'Смартфоны'}:/термопаст/i.test(name)?{kind:'paste',category:'Ноутбуки и ПК'}:/насос|помп|термостат|модул/i.test(name)?{kind:'pump',category:'Бытовая техника'}:{kind:'board',category:'Другие запчасти'}}


export async function makePurchaseDrafts(){await mutate('/business/orders/drafts');return purchaseOrders.filter(o=>o.status==='draft').length}

export function downloadCsv(filename,rows){
 const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/^(?=\s*[=+@\-\t\r\n])/,"'").replaceAll('"','""')+'"').join(';')).join('\r\n')
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}

