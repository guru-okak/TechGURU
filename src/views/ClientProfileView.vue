<script setup>
import PasswordForm from '../components/PasswordForm.vue'
import {mutate} from '../api/client'
import WorkspaceHero from '../components/WorkspaceHero.vue'
import { clientHeaderMedia } from '../data/clientHeaderMedia'
import UserAvatar from '../components/ui/UserAvatar.vue'
import AvatarPicker from '../components/AvatarPicker.vue'
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import Input from '../components/ui/Input.vue'
import SvgIcon from '../components/ui/SvgIcon.vue'
import PageState from '../components/ui/PageState.vue'
import { useMockPage } from '../composables/useMockPage'
import { useSession } from '../composables/useSession'
import { useNotifications } from '../composables/useNotifications'
import { users, DEMO_CLIENT_ID } from '../data/users'
import { toast } from '../composables/useToast'

const router = useRouter(), { current, logout } = useSession()
const page = useMockPage(), { unreadCount } = useNotifications()
const user = users.find(u => u.id === DEMO_CLIENT_ID)
const baseline = reactive({ full_name: user.full_name, email: user.email, phone: user.phone, address: user.address ?? '' })
const form = reactive({ ...baseline }), errors = reactive({}), saved = ref(false)
const dirty = computed(() => Object.keys(baseline).some(k => form[k] !== baseline[k]))
const initials = computed(() => baseline.full_name.split(' ').filter(Boolean).slice(0,2).map(n => n[0]).join(''))
function reset() {
 Object.assign(form, baseline); Object.keys(errors).forEach(k => delete errors[k]); saved.value = false
}
async function save() {
 Object.keys(errors).forEach(k => delete errors[k]); saved.value = false
 if(form.full_name.trim().length < 3) errors.full_name = 'Укажите ФИО'
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Проверьте email'
 if(form.phone.replace(/\D/g,'').length < 10) errors.phone = 'Проверьте номер телефона'
 if(Object.keys(errors).length) return
 const values = Object.fromEntries(Object.entries(form).map(([k,v]) => [k,v.trim()]))
 await mutate('/profile',values,'PATCH')
 Object.assign(user, values); Object.assign(baseline, values); Object.assign(form, values)
 current.value.name = baseline.full_name; current.value.initials = initials.value
 saved.value = true; toast('Контакты сохранены')
}
async function signOut() { await logout(); router.push('/login') }
</script>

<template>
 <div class="client-profile-page">
  <WorkspaceHero title="Личные данные" description="Контакты и фотография профиля. Всё, что нужно для связи с сервисом и оформления заявок." eyebrow="МОЙ АККАУНТ" :image="clientHeaderMedia.profile"/>
  <PageState :loading="page.loading.value" :error="page.error.value" :empty="page.empty.value" title="Профиль пока не заполнен" icon="user" @retry="page.retry">
   <div class="profile-layout">
    <Card padding="none" class="profile-main">
     <div class="profile-identity"><UserAvatar :size="64"/><div><h2>{{ baseline.full_name }}</h2><p>{{ baseline.email }}</p></div><span class="profile-role"><SvgIcon name="user" :size="13"/>Клиент</span></div>
     <div class="client-avatar-picker"><AvatarPicker/></div><form class="profile-form" @submit.prevent="save" novalidate>
      <div class="profile-section-title"><span><SvgIcon name="user" :size="19"/></span><div><h2>Контактная информация</h2><p>Используем эти данные при создании заявки</p></div></div>
      <div class="profile-fields"><div class="full-field"><Input v-model="form.full_name" label="ФИО" hint="Отчество — при наличии" :error="errors.full_name" required autocomplete="name"/></div><Input v-model="form.email" label="Email" type="email" icon-left="mail" :error="errors.email" required autocomplete="email"/><Input v-model="form.phone" label="Телефон" type="tel" icon-left="phone" :error="errors.phone" required autocomplete="tel"/></div>
      <div class="profile-address"><div class="profile-section-title"><span><SvgIcon name="mapPin" :size="19"/></span><div><h2>Адрес для выезда</h2><p>Чтобы не вводить его каждый раз</p></div></div><Input v-model="form.address" label="Адрес" placeholder="Город, улица, дом, квартира" autocomplete="street-address" hint="В каждой заявке можно указать другой адрес."/></div>
      <div class="profile-form-footer"><Button type="submit" variant="primary" :disabled="!dirty">Сохранить изменения</Button><Button v-if="dirty" variant="ghost" @click="reset">Отменить</Button><span v-if="saved && !dirty" role="status"><SvgIcon name="checkCircle" :size="16"/>Изменения сохранены</span></div>
     </form>
    </Card>
    <aside class="profile-aside">
     <Card padding="lg" class="profile-help"><span class="profile-help-icon"><SvgIcon name="shield" :size="25"/></span><h2>Всё для вашего ремонта</h2><p>Заявки, сообщения сервиса и история обращений — всегда под рукой.</p><RouterLink to="/client/requests"><SvgIcon name="clipboard" :size="18"/><span>Мои заявки</span><SvgIcon name="arrowRight" :size="15"/></RouterLink><RouterLink to="/client/notifications"><SvgIcon name="bell" :size="18"/><span>Уведомления</span><small v-if="unreadCount">{{ unreadCount }}</small><SvgIcon v-else name="arrowRight" :size="15"/></RouterLink></Card>
     <div class="profile-contact-note"><SvgIcon name="infoCircle" :size="18"/><p>Мастер и администратор используют телефон для уточнения деталей и согласования времени ремонта.</p></div>
     <Card padding="lg" class="profile-session"><span><SvgIcon name="lock" :size="18"/>Ваш сеанс</span><p>Если вы пользуетесь общим устройством, завершите сеанс после работы.</p><Button variant="outline" block @click="signOut"><SvgIcon name="logout" :size="16"/>Выйти из аккаунта</Button></Card>
    </aside>
   </div>
  </PageState>
 <PasswordForm/></div>
</template>

<style scoped>
.client-avatar-picker{padding:0 30px}.client-avatar-picker :deep(.profile-avatar-picker){margin-bottom:0}.client-profile-page{display:grid;gap:28px;max-width:1250px;margin:0 auto;width:100%;min-width:0}.profile-kicker{color:var(--blue);font-size:13px;font-weight:750;letter-spacing:.13em}.profile-page-heading h1{font-size:34px;font-weight:750;letter-spacing:-.045em;line-height:1.2;margin-top:10px}.profile-page-heading>p{font-size:15px;line-height:1.8;color:var(--muted);margin-top:12px}.profile-layout{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:24px;align-items:start}.profile-main{overflow:hidden;min-width:0}.profile-identity{display:flex;align-items:center;gap:16px;padding:26px 30px;border-bottom:1px solid var(--border);background:linear-gradient(110deg,color-mix(in srgb,var(--blue) 9%,var(--surface)),var(--surface) 80%)}.profile-avatar{display:grid;place-items:center;flex-shrink:0;width:60px;height:60px;border-radius:20px;background:linear-gradient(135deg,#d3e9ff,#93bfff);color:#1c4b99;font-size:22px;font-weight:700;box-shadow:0 5px 18px #1b5bd51a}.profile-identity>div{min-width:0;flex:1}.profile-identity h2{font-size:21px;font-weight:700;letter-spacing:-.025em;overflow-wrap:anywhere}.profile-identity p{font-size:15px;color:var(--muted);margin-top:5px;overflow-wrap:anywhere}.profile-role{display:flex;align-items:center;gap:5px;font-size:13px;padding:5px 9px;border:1px solid var(--border);border-radius:20px;color:var(--muted);background:var(--surface)}.profile-form{padding:30px}.profile-section-title{display:flex;align-items:center;gap:12px}.profile-section-title>span{display:grid;place-items:center;width:39px;height:39px;border:1px solid color-mix(in srgb,var(--blue) 15%,var(--border));border-radius:12px;color:var(--blue);background:color-mix(in srgb,var(--blue) 6%,transparent);flex-shrink:0}.profile-section-title h2{font-size:17px;font-weight:650;line-height:1.5;letter-spacing:-.02em}.profile-section-title p{font-size:14px;line-height:1.8;color:var(--muted);margin-top:2px}.profile-fields{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;margin-top:25px}.full-field{grid-column:1/-1;min-width:0}.profile-address{border-top:1px solid var(--border);padding-top:26px;margin-top:28px;display:grid;gap:23px}.profile-form-footer{display:flex;align-items:center;flex-wrap:wrap;gap:12px;border-top:1px solid var(--border);padding-top:24px;margin-top:28px;min-height:68px}.profile-form-footer>span{display:flex;align-items:center;gap:6px;font-size:14px;color:var(--green)}.profile-aside{display:grid;gap:22px;min-width:0}.profile-help{background:linear-gradient(145deg,color-mix(in srgb,var(--blue) 7%,var(--surface)),var(--surface));overflow:hidden}.profile-help-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;color:var(--blue);background:color-mix(in srgb,var(--blue) 10%,transparent);border:1px solid color-mix(in srgb,var(--blue) 18%,var(--border))}.profile-help h2{font-size:20px;font-weight:700;letter-spacing:-.025em;margin-top:19px}.profile-help>p,.profile-session>p{font-size:15px;line-height:1.9;color:var(--muted);margin:11px 0 23px}.profile-help>a{display:flex;align-items:center;gap:10px;padding:16px 0;border-top:1px solid var(--border);font-size:15px;transition:color .2s}.profile-help>a:hover{color:var(--blue)}.profile-help>a:last-child{padding-bottom:0}.profile-help>a>span:nth-child(2){flex:1}.profile-help>a>small{border-radius:20px;background:var(--blue);color:#fff;padding:2px 6px;font-size:13px}.profile-contact-note{display:flex;align-items:start;gap:10px;padding:0 5px;color:var(--muted)}.profile-contact-note>span{flex-shrink:0;color:var(--blue);margin-top:3px}.profile-contact-note p{font-size:14px;line-height:1.9}.profile-session>span{display:flex;align-items:center;gap:9px;font-size:15px;font-weight:650}.profile-session>span>span{color:var(--blue)}.profile-session>p{font-size:14px;margin-bottom:18px}@media(max-width:1100px){.profile-layout{grid-template-columns:minmax(0,1fr) 250px}.profile-form{padding:24px}.profile-identity{padding:24px}.profile-fields{grid-template-columns:1fr}.profile-role{display:none}}@media(max-width:760px){.profile-layout{grid-template-columns:1fr}.profile-aside{grid-template-columns:1fr 1fr}.profile-contact-note{grid-column:1/-1;grid-row:2}.profile-fields{grid-template-columns:1fr 1fr}.profile-role{display:flex}}@media(max-width:520px){.profile-page-heading h1{font-size:29px}.profile-page-heading>p{font-size:15px}.profile-identity{padding:20px;gap:12px}.profile-identity h2{font-size:18px}.profile-identity p{font-size:13px}.profile-avatar{width:48px;height:48px;border-radius:15px;font-size:20px}.profile-role{display:none}.profile-form{padding:22px 20px}.profile-fields,.profile-aside{grid-template-columns:1fr}.profile-section-title h2{font-size:16px}.profile-section-title p{font-size:13px}.profile-form-footer>span{width:100%}.profile-session{grid-row:3}.profile-contact-note{grid-row:2}.profile-layout{gap:20px}}
</style>

