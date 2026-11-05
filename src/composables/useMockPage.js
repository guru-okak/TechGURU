import {ref,computed} from 'vue'
import {workspaceError,refreshWorkspace} from '../api/workspace'
export function useMockPage(){const loading=ref(false);async function retry(){loading.value=true;try{await refreshWorkspace()}finally{loading.value=false}}return {loading,error:computed(()=>!!workspaceError.value),empty:ref(false),retry}}
