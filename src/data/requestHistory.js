import {reactive} from 'vue'
export const requestStatusHistory=reactive([])
export function historyForRequest(id){return requestStatusHistory.filter(h=>h.request_id===id).slice().sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id-b.id)}
