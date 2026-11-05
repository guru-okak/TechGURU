import {ref} from 'vue'
export const connectionError=ref('')
let refreshing=null
async function request(url,options){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{return await fetch(url,{...options,signal:controller.signal})}finally{clearTimeout(timer)}}
export class ApiError extends Error{constructor(message,status,fields,code){super(message);this.status=status;this.fields=fields;this.code=code}}
let pendingCsrf = null
async function fetchCsrfToken() {
  let response
  try {
    response = await request('/api/auth/csrf', { credentials: 'same-origin' })
  } catch {
    throw new ApiError('Не удалось связаться с сервером. Повторите запрос.', 0)
  }
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.data?.csrfToken) {
    throw new ApiError(result?.error?.message ?? 'Сервер недоступен. Повторите запрос.', response.status)
  }
  return result.data.csrfToken
}
function csrfToken() {
  pendingCsrf ??= fetchCsrfToken().finally(() => { pendingCsrf = null })
  return pendingCsrf
}
export async function api(path,{method='GET',body,retry=true}={}){
 const headers={};if(method!=='GET'){headers['X-CSRF-Token']=await csrfToken();if(body!==undefined)headers['Content-Type']='application/json'}
 let response;try{response=await request('/api'+path,{method,headers,credentials:'same-origin',...(body===undefined?{}:{body:JSON.stringify(body)})})}catch{throw new ApiError('Не удалось связаться с сервером. Повторите запрос.',0)}
 if(response.status===401&&retry&&!['/auth/login','/auth/register','/auth/refresh','/auth/csrf'].includes(path)){
  refreshing??=api('/auth/refresh',{method:'POST',retry:false}).finally(()=>{refreshing=null})
  try{await refreshing;return api(path,{method,body,retry:false})}catch{}
 }
 const result=await response.json().catch(()=>({}));if(!response.ok)throw new ApiError(result.error?.message??'Не удалось выполнить запрос',response.status,result.error?.fields,result.error?.code)
 return result.data??result
}
const pendingMutations=new Map()
export function mutate(path,body={},method='POST'){
 const key=JSON.stringify([method,path,body])
 if(pendingMutations.has(key))return pendingMutations.get(key)
 const operation=(async()=>{const result=await api(path,{method,body});const {refreshWorkspace}=await import('./workspace.js');try{await refreshWorkspace({fresh:true})}catch{const {toast}=await import('../composables/useToast');toast('Изменение сохранено. Обновите страницу, чтобы загрузить последние данные.')}return result})().finally(()=>pendingMutations.delete(key))
 pendingMutations.set(key,operation);return operation
}
export async function saveRecord(entity,id,data){return mutate('/admin/records/'+entity+(id?'/'+id:''),data,id?'PATCH':'POST')}

export async function downloadApi(path,filename){await api('/auth/me');const response=await request('/api'+path,{credentials:'same-origin'});if(!response.ok)throw new ApiError('Не удалось скачать файл',response.status);const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
