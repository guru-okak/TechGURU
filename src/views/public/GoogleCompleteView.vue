<script setup>
import {ref,onMounted} from 'vue'
import {useRouter,RouterLink} from 'vue-router'
import {useTheme} from '../../composables/useTheme'
import bgLight from '../../assets/Вход/bg_l.png'
import bgDark from '../../assets/Вход/bg_d.png'
import {api} from '../../api/client'
import {useSession} from '../../composables/useSession'
import Card from '../../components/ui/Card.vue'
import Input from '../../components/ui/Input.vue'
import Button from '../../components/ui/Button.vue'
const {isDark}=useTheme()
const profile=ref(null),name=ref(''),phone=ref(''),password=ref(''),error=ref(''),busy=ref(false),router=useRouter(),session=useSession()
onMounted(async()=>{try{profile.value=await api('/auth/google/profile');name.value=profile.value.name}catch(e){error.value=e.message}})
async function submit(){busy.value=true;error.value='';try{const body=profile.value.exists?{password:password.value}:{full_name:name.value,phone:'+'+phone.value.replace(/\D/g,'')};const r=await api('/auth/google/complete',{method:'POST',body});session.accept(r.user);password.value='';router.replace('/'+r.user.role)}catch(e){error.value=e.message}finally{busy.value=false}}
</script>
<template><div class="flex min-h-[calc(100vh-76px)] items-center justify-center bg-cover bg-center bg-no-repeat px-4 py-10 sm:py-14" :style="{backgroundImage:`url(${isDark?bgDark:bgLight})`}"><main class="w-full max-w-[520px]"><Card padding="lg" class="w-full"><h1 class="text-2xl font-extrabold">{{profile?.exists?'Привязать Google':'Добро пожаловать в TechGURU'}}</h1><p class="mt-3 text-sm text-muted">{{profile?.email}}</p><p class="mt-3 text-sm text-muted">{{profile?.exists?'Аккаунт с этой почтой уже существует. Подтвердите привязку его паролем.':'Почта подтверждена Google. Укажите имя и контактный телефон для связи по ремонту.'}}</p><form v-if="profile" @submit.prevent="submit" class="mt-6 grid gap-4"><Input v-if="profile.exists" v-model="password" label="Пароль существующего аккаунта" type="password" autocomplete="current-password" required/><template v-else><Input v-model="name" label="Имя и фамилия" autocomplete="name" required/><Input v-model="phone" label="Контактный телефон" type="tel" autocomplete="tel" placeholder="+7…" required/></template><p v-if="error" role="alert" class="text-sm text-danger">{{error}}</p><Button type="submit" variant="primary" block :loading="busy">{{profile.exists?'Подтвердить и войти':'Создать аккаунт'}}</Button></form><p v-else-if="error" role="alert" class="mt-5 text-danger">{{error}}</p><RouterLink to="/login" class="mt-5 block text-center text-sm text-brand">Вернуться ко входу</RouterLink></Card></main></div></template>
