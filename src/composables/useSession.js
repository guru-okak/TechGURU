import {computed,reactive,ref} from 'vue'
import {api} from '../api/client'
const user=ref(null),role=computed(()=>user.value?.role??null)
const profiles=reactive({admin:{name:'Администратор',caption:'Администратор',home:'/admin'},master:{name:'Мастер',caption:'Мастер',home:'/master'},client:{name:'Клиент',caption:'Клиент',home:'/client'},guest:{name:'Гость',caption:'Не авторизован',home:'/'}})
let initialized=false
function accept(value){user.value=value;if(value)Object.assign(profiles[value.role],{avatar:value.avatar_url??'',name:value.full_name,email:value.email,phone:value.phone,initials:value.full_name.split(' ').map(s=>s[0]).slice(0,2).join('')})}
async function initialize(){if(initialized)return;try{accept((await api('/auth/me')).user)}catch(error){if(error.status!==401)throw error}initialized=true}
async function login(credentials){const result=await api('/auth/login',{method:'POST',body:credentials});accept(result.user);initialized=true;return role.value}
async function logout() {
  await api('/auth/logout', { method: 'POST', body: {} })
  accept(null)
  const { clearWorkspace, loadPublic } = await import('../api/workspace')
  clearWorkspace()
  // Catalog availability must not determine whether an ended session can exit the cabinet.
  await loadPublic().catch(() => {})
}
export function useSession(){return {user,role,profiles,current:computed(()=>profiles[role.value]??profiles.guest),isAuthenticated:computed(()=>!!user.value),initialize,login,logout,accept,homeFor:(value=role.value)=>profiles[value]?.home??'/login'}}
