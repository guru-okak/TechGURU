<script setup>
import {reactive,ref} from 'vue'
import {useRouter} from 'vue-router'
import {api} from '../api/client'
import {useSession} from '../composables/useSession'
import {clearWorkspace} from '../api/workspace'
import Card from './ui/Card.vue'
import Input from './ui/Input.vue'
import Button from './ui/Button.vue'
const router=useRouter(),form=reactive({current_password:'',new_password:'',repeat:''}),error=ref(''),busy=ref(false)
async function save(){error.value='';if(form.new_password!==form.repeat){error.value='Пароли не совпадают';return}busy.value=true;try{await api('/profile/password',{method:'POST',body:{current_password:form.current_password,new_password:form.new_password}});useSession().accept(null);clearWorkspace();await router.push('/login')}catch(e){error.value=e.message}finally{busy.value=false}}
</script>
<template><Card padding="lg" class="password-card mt-6"><h2 class="text-xl font-bold">Изменить пароль</h2><p class="text-sm text-muted mt-2">После изменения потребуется войти заново на всех устройствах.</p><form class="password-fields grid gap-4 mt-5" @submit.prevent="save"><Input v-model="form.current_password" label="Текущий пароль" type="password" autocomplete="current-password" required/><Input v-model="form.new_password" label="Новый пароль" type="password" autocomplete="new-password" minlength="8" maxlength="128" required/><Input v-model="form.repeat" label="Повторите новый пароль" type="password" autocomplete="new-password" required/><p v-if="error" role="alert" class="text-danger">{{error}}</p><Button type="submit" variant="primary" :loading="busy">Изменить пароль</Button></form></Card></template>

<style scoped>.password-card{max-width:900px;width:100%}.password-fields{grid-template-columns:repeat(2,minmax(0,1fr));align-items:end}.password-fields>:first-child{grid-column:1/-1;max-width:420px}.password-fields>button{justify-self:start;grid-column:1/-1}@media(max-width:600px){.password-fields{grid-template-columns:1fr}.password-fields>:first-child{max-width:none}}</style>