import {reactive} from 'vue'
import { moscowDate, reportDay } from '../../shared/domain/reportDates'
import { DAILY_LOAD_STATUSES } from '../../shared/domain/requests'
import {STATUSES} from '../config/statuses'
// Reactive server workspace. No generated operational records.
export const adminServices=reactive([]),adminClients=reactive([]),adminMasterUsers=reactive([]),adminMasterRecords=reactive([]),adminMasters=reactive([]),adminSkills=reactive([]),adminRequests=reactive([]),adminParts=reactive([]),adminStock=reactive([]),auditEvents=reactive([]),purchaseOrders=reactive([]),purchaseItems=reactive([])
export const statusLabels = Object.fromEntries(STATUSES.map(s => [s.code, s.label]))
export const statusTones = Object.fromEntries(STATUSES.map(s => [s.code, s.tone]))
export const activeStatuses = ['assigned', 'in_progress', 'waiting_parts', 'ready_for_pickup']
export const today = moscowDate()
export const dayOffset = reportDay

export function requestView(r){return {...r,client:adminClients.find(c=>c.id===r.user_id)??{full_name:r.client_name??'Клиент',phone:r.contact_phone},service:adminServices.find(s=>s.id===r.service_id),master:adminMasters.find(m=>m.id===r.master_id)}}
export function stockView(s){return {...s,...adminParts.find(p=>p.id===s.part_id),stock_id:s.id,available:s.quantity-s.reserved_quantity}}
export function masterLoad(m){return adminRequests.filter(r=>r.master_id===m.id&&new Date(r.preferred_datetime).toLocaleDateString('en-CA',{timeZone:'Europe/Moscow'})===today&&DAILY_LOAD_STATUSES.includes(r.status)).length}
export const money=value=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:2}).format(value)
export const shortDate=value=>new Date(value).toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'short'})
