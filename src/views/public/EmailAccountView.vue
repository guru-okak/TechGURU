<script setup>
import {computed,ref,onMounted} from 'vue'
import {useRoute,useRouter,RouterLink} from 'vue-router'
import {useSession} from '../../composables/useSession'
import {useTheme} from '../../composables/useTheme'
import bgLight from '../../assets/Вход/bg_l.png'
import bgDark from '../../assets/Вход/bg_d.png'
import {api} from '../../api/client'
import Card from '../../components/ui/Card.vue'
import Input from '../../components/ui/Input.vue'
import Button from '../../components/ui/Button.vue'
const router=useRouter(),session=useSession(),{isDark}=useTheme()
const route=useRoute(),purpose=computed(()=>route.path.includes('verify')?'verify':'reset')
const email=ref(String(route.query.email??'')),password=ref(''),code=ref(''),ticket=ref(''),busy=ref(false),error=ref(''),done=ref(false),nextSend=ref(0),clock=ref(Date.now())
let timer=setInterval(()=>clock.value=Date.now(),1000)
import {onUnmounted} from 'vue';onUnmounted(()=>clearInterval(timer))
const seconds=computed(()=>Math.max(0,Math.ceil((nextSend.value-clock.value)/1000)))
async function send(){busy.value=true;error.value='';try{const r=await api('/auth/email/'+purpose.value+'/send',{method:'POST',body:{email:email.value}});ticket.value=r.ticket;nextSend.value=Date.now()+60000}catch(e){error.value=e.message}finally{busy.value=false}}
async function confirm(){busy.value=true;error.value='';try{const result=await api('/auth/email/'+purpose.value+'/confirm',{method:'POST',body:{ticket:ticket.value,code:code.value,...(purpose.value==='reset'?{password:password.value}:{})}});if(result.user){session.accept(result.user);await router.replace('/'+result.user.role);return}done.value=true;password.value=''}catch(e){error.value=e.message}finally{busy.value=false}}
onMounted(()=>{if(purpose.value==='verify'&&email.value)send()})
</script>
<template>
 <div class="flex min-h-[calc(100vh-76px)] items-center justify-center bg-cover bg-center bg-no-repeat px-4 py-10 sm:py-14" :style="{backgroundImage:`url(${isDark?bgDark:bgLight})`}"><main class="w-full max-w-[520px]"><Card padding="lg" class="w-full">
 <div class="mb-7 text-center"><span class="text-sm font-bold text-brand">TechGURU · Безопасность аккаунта</span><h1 class="mt-3 text-2xl font-extrabold">{{purpose==='verify'?'Подтвердите почту':'Восстановление пароля'}}</h1><p class="mt-3 text-sm text-muted">{{done?'Всё готово. Войдите в аккаунт.':ticket?'Введите шестизначный код из письма. Он действует 5 минут.':'Мы отправим одноразовый код на вашу почту.'}}</p></div>
 <form v-if="!done" class="grid gap-4" @submit.prevent="ticket?confirm():send()">
 <template v-if="!ticket"><Input v-model="email" label="Электронная почта" type="email" autocomplete="email" required/>
 </template>
 <template v-else><p class="text-center text-sm text-muted">Код отправлен на <strong>{{email}}</strong></p><Input v-model="code" label="Код из письма" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required/><Input v-if="purpose==='reset'" v-model="password" label="Новый пароль (от 8 символов)" type="password" autocomplete="new-password" minlength="8" required/></template>
 <p v-if="error" role="alert" class="rounded-xl bg-danger/10 p-3 text-sm text-danger">{{error}}</p>
 <Button type="submit" variant="primary" block :loading="busy">{{ticket?'Подтвердить':'Отправить код'}}</Button>
 <template v-if="ticket"><button type="button" class="text-sm text-brand" :disabled="busy||seconds>0" @click="send">{{seconds?'Повторная отправка через '+seconds+' с':'Отправить повторно'}}</button><button type="button" class="text-sm text-muted" @click="ticket='';code='';error=''">Изменить почту</button></template>
 </form><RouterLink to="/login" class="mt-6 block text-center text-sm font-semibold text-brand">Вернуться ко входу</RouterLink>
 </Card></main></div>
</template>
