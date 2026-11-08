import {notificationText} from './notificationPresentation'
import {reactive,ref} from 'vue'
import {api} from './client'
import {serviceView} from './presentation'
import {useSession} from '../composables/useSession'
import * as catalog from '../data/services'
import * as people from '../data/users'
import {masters} from '../data/masters'
import {servicePoints} from '../data/servicePoints'
import * as requests from '../data/requests'
import * as admin from '../data/admin'
import * as operations from '../data/adminOperations'
import * as inventory from '../data/parts'
import {requestParts} from '../data/requestParts'
import {requestStatusHistory} from '../data/requestHistory'
import * as profile from '../data/masterProfile'
import {clientRatings} from '../data/clientWorkspace'
export const workspace=reactive({users:[],schedule:[],queue:[],items:[],candidates:{}})
export const masterReports=ref([])
export const noticeRecords=ref([])
export const workspaceError=ref('')
function replace(target,rows){const byId=new Map(target.map(row=>[row.id,row]));const records=rows.map(row=>{const old=byId.get(row.id);return old?Object.assign(old,row):row});target.splice(0,target.length,...records)}
const noticeDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow'})
const noticeTime=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'})
function emptyWorkspace(){return {users:[],masters:[],services:[],points:[],requests:[],parts:[],stock:[],warehouses:[],suppliers:[],orders:[],purchaseItems:[],skills:[],schedule:[],history:[],requestParts:[],ratings:[],notifications:[],audit:[],items:[],queue:[]}}
let workspaceSnapshot = null
function apply(data){
 if(data?.partial)data={...(workspaceSnapshot??emptyWorkspace()),...data}
 workspaceSnapshot=data

 const r=data??emptyWorkspace()
 for(const key of ['users','schedule','queue','items'])replace(workspace[key],r[key]??[])
 replace(people.users,r.users);people.setCurrentClient(r.user?.id??0)
 replace(masters,r.masters);replace(catalog.services,r.services)
 replace(catalog.servicesView,r.services.map(serviceView))
 replace(servicePoints,r.points);replace(requests.requests,r.requests)
 replace(requests.requestsView,r.requests.map(requests.toRequestView));replace(requests.clientRequests,requests.requestsView);replace(requests.masterRequests,requests.requestsView)
 const centralWarehouses=new Set(r.warehouses.filter(w=>w.type==='central').map(w=>w.id))
 for(const [target,key] of [[admin.adminRequests,'requests'],[admin.adminServices,'services'],[admin.adminMasters,'masters'],[admin.adminMasterRecords,'masters'],[admin.adminSkills,'skills'],[admin.adminParts,'parts'],[admin.adminStock,'stock'],[admin.auditEvents,'audit'],[admin.purchaseOrders,'orders'],[admin.purchaseItems,'purchaseItems'],[operations.adminPoints,'points'],[operations.adminSuppliers,'suppliers'],[operations.adminHistory,'history']])replace(target,target===admin.adminStock?r[key].filter(stock=>centralWarehouses.has(stock.warehouse_id)):r[key])
 replace(admin.adminClients,r.users.filter(u=>u.role==='client').map(u=>({...u,avatar:u.avatar_url})));replace(admin.adminMasterUsers,r.users.filter(u=>u.role==='master'))
 replace(inventory.parts,r.parts);replace(inventory.stock,r.stock);replace(inventory.warehouses,r.warehouses)
 replace(requestParts,r.requestParts);replace(requestStatusHistory,r.history.map(h=>({...h,status:h.to_status})));replace(clientRatings,r.ratings)
 masterReports.value=r.reports??[]
 const now=Date.now(),today=noticeDay.format(now),yesterday=noticeDay.format(now-86400000)
 noticeRecords.value=r.notifications.map(n=>{const date=new Date(n.created_at),day=noticeDay.format(date);return {...n,unread:!n.is_read,title:({master_assigned:'Назначен мастер',rating_received:'Новый отзыв клиента',estimate_updated:'Смета требует согласования',assignment_removed:'Заявка передана другому мастеру',parts_requested:'Запрошены запчасти',status_changed:'Изменение статуса'})[n.type]??'Обновление по заявке',text:notificationText(n.message),group:day===today?'today':day===yesterday?'yesterday':'earlier',time:noticeTime.format(date),type:n.type==='master_assigned'?'assignment':n.type}})

 replace(operations.adminNotices,r.notifications)
 if(r.user){useSession().accept(r.user);Object.assign(profile.profileUser,r.user)}
 const m=r.masters.find(m=>m.user_id===r.user?.id)
 if(m){Object.assign(profile.profileMaster,m);requests.setCurrentMaster(m.id);profile.setCurrentMaster(m.id);replace(profile.profileSkills,r.skills.filter(s=>s.master_id===m.id))}
}
let workspaceScreen = 'full'
export function setWorkspaceScreen(path) {
 const role=path.split('/')[1],page=path.split('/')[2]
 workspaceScreen=page==='notifications'?'notifications':page==='schedule'?'schedule':role==='client'&&page==='services'?'catalog':role==='admin'&&['users','services','points','suppliers','orders','audit'].includes(page)?page:'full'
}
let workspaceGeneration = 0
let workspacePending = null
export function clearWorkspace() {
  workspaceGeneration++
  workspacePending = null
  apply(null)
  requests.setCurrentMaster(0)
  profile.setCurrentMaster(0)
  profile.profileSkills.splice(0)
  workspaceError.value = ''
}
export async function refreshWorkspace({ fresh = false } = {}) {
  const generation = workspaceGeneration
  const screen = workspaceScreen
  const { user } = useSession()
  const userId = user.value?.id
  const isCurrent = () => generation === workspaceGeneration && user.value?.id === userId
  if (!userId) return
  const pending = workspacePending
  if (pending?.generation === generation && pending.userId === userId && pending.screen === screen) {
    if (!fresh) return pending.promise
    // A mutation may finish after the running read started. Read again after it.
    await pending.promise.catch(() => {})
    if (!isCurrent()) return
    return refreshWorkspace()
  }
  const entry = { generation, userId, screen, promise: null }
  entry.promise = (async () => {
  try {
    const data = await api('/workspace'+(screen==='full'?'':'?screen='+screen))
    if (!isCurrent() || workspaceScreen !== screen || data.user?.id !== userId) return
    apply(data)
    workspaceError.value = ''
    return data
  } catch (error) {
    if (!isCurrent() || workspaceScreen !== screen) return
    workspaceError.value = error.message
    throw error
  }
  })().finally(() => {
    if (workspacePending === entry) workspacePending = null
  })
  workspacePending = entry
  return entry.promise
}
export async function loadPublic(){const [services,points]=await Promise.all([api('/services?limit=100'),api('/service-points?limit=100')]);replace(catalog.services,services);replace(catalog.servicesView,services.map(serviceView));replace(servicePoints,points)}
