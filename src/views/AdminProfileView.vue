<script setup>
import PasswordForm from '../components/PasswordForm.vue'
import {mutate} from '../api/client'
import {reactive,ref} from 'vue'
import WorkspaceHero from '../components/WorkspaceHero.vue'
import {adminMedia} from '../data/adminMedia'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import Input from '../components/ui/Input.vue'
import UserAvatar from '../components/ui/UserAvatar.vue'
import AvatarPicker from '../components/AvatarPicker.vue'
import PageState from '../components/ui/PageState.vue'
import {useMockPage} from '../composables/useMockPage'
import {useSession} from '../composables/useSession'
import {toast} from '../composables/useToast'
const {current}=useSession(),page=useMockPage(),error=ref('')
const form=reactive({full_name:current.value.name,email:current.value.email??'admin@techguru.example',phone:current.value.phone??'+7 800 000-00-01'})
async function save(){error.value='';if(form.full_name.trim().length<3||!/^\S+@\S+\.\S+$/.test(form.email)||form.phone.replace(/\D/g,'').length<10){error.value='Проверьте ФИО, email и телефон.';return}await mutate('/profile',{...form},'PATCH');Object.assign(current.value,{name:form.full_name.trim(),email:form.email.trim(),phone:form.phone.trim(),initials:form.full_name.trim().split(' ').slice(0,2).map(n=>n[0]).join('')});toast('Профиль сохранён')}
</script>
<template><div class="grid gap-6"><WorkspaceHero title="Профиль администратора" description="Ваши контакты и учётная запись для работы с сервисом." eyebrow="МОЙ АККАУНТ" :image="adminMedia.overview"/><PageState :loading="page.loading.value" :error="page.error.value" :empty="page.empty.value" @retry="page.retry"><div class="admin-profile-layout"><Card padding="lg"><div class="flex items-center gap-4 mb-5"><UserAvatar :size="64"/><div><h2 class="text-xl font-bold">{{current.name}}</h2><p class="text-sm text-muted">Администратор TechGURU</p></div></div><AvatarPicker/><form class="grid gap-5" @submit.prevent="save" novalidate><Input v-model="form.full_name" label="ФИО" hint="Отчество — при наличии" autocomplete="name"/><div class="grid gap-5 sm:grid-cols-2"><Input v-model="form.email" label="Email" type="email" autocomplete="email"/><Input v-model="form.phone" label="Телефон" type="tel" autocomplete="tel"/></div><p v-if="error" class="text-danger" role="alert">{{error}}</p><Button variant="primary" type="submit" class="justify-self-start">Сохранить изменения</Button></form></Card><Card padding="lg"><h2 class="text-xl font-bold">Рабочее пространство</h2><p class="text-sm text-muted mt-3 leading-relaxed">Управление заявками, командой, ресурсами и историей изменений сервиса.</p><div class="grid gap-3 mt-6"><Button variant="outline" to="/admin/requests?attention=1">Заявки, требующие внимания</Button><Button variant="outline" to="/admin/audit">Журнал аудита</Button><Button variant="outline" to="/admin">Обзор сервиса</Button></div></Card></div></PageState><PasswordForm/></div></template>

