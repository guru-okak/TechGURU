import { reactive } from 'vue'
// Frontend preference state; SQL fields remain is_onsite / is_dropoff.
export const masterWorkModes = reactive({})
export function modesFor(id, onsite=1, dropoff=1) {
 if (!masterWorkModes[id]) masterWorkModes[id]={is_onsite:Number(onsite),is_dropoff:Number(dropoff)}
 return masterWorkModes[id]
}
export function bindWorkModes(record) {
 const modes=modesFor(record.id,record.is_onsite,record.is_dropoff)
 for(const field of ['is_onsite','is_dropoff']) Object.defineProperty(record,field,{enumerable:true,configurable:true,get:()=>modes[field],set:value=>{modes[field]=Number(value)}})
 return record
}
export function workModeLabel(m) { return [m.is_onsite?'Выезд к клиенту':'',m.is_dropoff?'В сервисе':''].filter(Boolean).join(' и ') || 'Формат не выбран' }
export function setWorkMode(record,field,value) {
 if(!value&&!record[field==='is_onsite'?'is_dropoff':'is_onsite']) return false
 record[field]=value?1:0
 return true
}
