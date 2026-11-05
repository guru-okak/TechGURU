import {computed,onMounted,ref} from 'vue'
import {fetchMasterRequestById} from '../data/requests'
import {historyForRequest} from '../data/requestHistory'
import {partsWithCatalog} from '../data/requestParts'
import {mutate} from '../api/client'
export function useMasterTask(requestId){
 const task=ref(null),loading=ref(true),error=ref(null)
 async function load(){loading.value=true;error.value=null;try{task.value=await fetchMasterRequestById(Number(requestId))}catch(e){error.value=e}finally{loading.value=false}}
 async function action(name,body={}){await mutate('/business/requests/'+requestId+'/'+name,body);await load();return task.value}
 async function completeRepair({usage={},comment=''}={}){await action('complete',{usage:Object.fromEntries(Object.entries(usage).map(([id,value])=>[id,Number(value.used)])),comment});return task.value?.status}
 onMounted(load)
 return {task,loading,error,load,history:computed(()=>historyForRequest(Number(requestId))),parts:computed(()=>partsWithCatalog(Number(requestId))),accept:()=>action('start'),resume:()=>action('resume'),markWaitingParts:()=>load(),closeRequest:()=>action('pickup'),completeRepair}
}
