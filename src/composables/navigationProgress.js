import {ref} from 'vue'
export const navigationBusy=ref(false)
let timer
export function beginNavigation(){clearTimeout(timer);timer=setTimeout(()=>navigationBusy.value=true,250)}
export function endNavigation(){clearTimeout(timer);navigationBusy.value=false}
