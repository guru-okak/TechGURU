<script setup>
import {services} from '../data/services'
import PasswordForm from '../components/PasswordForm.vue'
import {mutate} from '../api/client'
import {setWorkMode} from '../data/masterWorkModes'
import { countLabel } from '../data/presentationCount'
import DeviceArt from '../components/illustrations/DeviceArt.vue'
import StatusBadge from '../components/ui/StatusBadge.vue'
import { useMasterRequests } from '../composables/useMasterRequests'
import { profileMaster } from '../data/masterProfile'
import UserAvatar from '../components/ui/UserAvatar.vue'
import AvatarPicker from '../components/AvatarPicker.vue'
import WorkspaceHero from '../components/WorkspaceHero.vue'
import { masterMedia } from '../data/masterMedia'
import { computed, reactive, ref } from 'vue'
import PageState from '../components/ui/PageState.vue'
import { useMockPage } from '../composables/useMockPage'
import Badge from '../components/ui/Badge.vue'
import Button from '../components/ui/Button.vue'
import Card from '../components/ui/Card.vue'
import Input from '../components/ui/Input.vue'
import Select from '../components/ui/Select.vue'
import SvgIcon from '../components/ui/SvgIcon.vue'
import ToggleSwitch from '../components/ui/ToggleSwitch.vue'
import { useSession } from '../composables/useSession'
import { toast } from '../composables/useToast'
import {
  masterProfile,
  saveMasterProfile,
  setAvailability,
  setSkill,
  setZone,
  skillCatalog,
  zoneCatalog,
} from '../data/masterProfile'

const { current } = useSession()
const { requests:workRequests,stats:workStats }=useMasterRequests()
const completedWorks=computed(()=>workRequests.value.filter(r=>['completed','closed'].includes(r.status)))
const { loading, error, empty, retry } = useMockPage()
const saveError = ref('')

const form = reactive({
  fullName: masterProfile.fullName,
  phone: masterProfile.phone,
  email: masterProfile.email,
})

const workCarousel=ref(null)
const newSkill = ref('')
const newZone = ref('')

const skillOptions = computed(() => [
  { value: '', label: 'Добавить навык…' },
  ...services.filter(s=>s.is_active).map(s=>s.name)
    .filter((s) => !masterProfile.skills.includes(s))
    .map((s) => ({ value: s, label: s })),
])

const zoneOptions = computed(() => [
  { value: '', label: 'Добавить район…' },
  ...zoneCatalog
    .filter((z) => !masterProfile.zones.includes(z))
    .map((z) => ({ value: z, label: z })),
])

async function save() {
  saveError.value = ''
  if (form.fullName.trim().length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || form.phone.replace(/\D/g, '').length < 10) { saveError.value = 'Проверьте ФИО, email и номер телефона.'; return }
  await saveMasterProfile({ ...form, fullName: form.fullName.trim() })
  current.value.name=masterProfile.fullName; current.value.initials=masterProfile.fullName.split(' ').filter(Boolean).slice(0,2).map(n=>n[0]).join('')
  toast('Профиль сохранён')
}

async function addSkill() {
  if (!newSkill.value) return
  try{await setSkill(newSkill.value, true);newSkill.value='';toast('Навык сохранён')}catch(e){toast(e.message)}
}

function addZone() {
  if (!newZone.value) return
  setZone(newZone.value, true)
  newZone.value = ''
}

async function changeMode(field,value){if(!value&&!(field==='is_onsite'?profileMaster.is_dropoff:profileMaster.is_onsite)){toast('Оставьте хотя бы один формат работы');return}await mutate('/masters/'+profileMaster.id,{[field]:value?1:0},'PATCH');toast('Формат работы сохранён')}
async function onAvailability(value) {
  await setAvailability(value)
  toast(value ? 'Вы доступны для новых заявок' : 'Новые заявки приостановлены')
}
</script>


<template>
 <div class="master-profile grid gap-6">
  <WorkspaceHero title="Профиль мастера" description="Контакты, специализация и условия работы — чтобы каждая новая заявка подходила вам." eyebrow="ВАША ЭКСПЕРТИЗА" :image="masterMedia.craftProfile"/>
  <PageState :loading="loading" :error="error" :empty="empty" @retry="retry" icon="user" title="Профиль пока не заполнен">
   <div class="master-profile-layout">
    <div class="grid gap-6 min-w-0">
     <Card padding="lg"><div class="master-profile-identity"><UserAvatar :size="64"/><div><h2>{{masterProfile.fullName}}</h2><p>Мастер TechGURU</p></div><Badge :tone="masterProfile.isAvailable?'green':'gray'">{{masterProfile.isAvailable?'Доступен':'На паузе'}}</Badge></div>
      <AvatarPicker/><form class="master-contact-form" @submit.prevent="save" novalidate><h2>Контактная информация</h2><p class="text-sm text-muted">Для связи с клиентами и администратором</p><div class="grid gap-5 mt-6"><Input v-model="form.fullName" label="ФИО" hint="Отчество — при наличии" autocomplete="name" required/><div class="grid gap-5 sm:grid-cols-2"><Input v-model="form.phone" type="tel" label="Телефон" autocomplete="tel" required/><Input v-model="form.email" type="email" label="Email" autocomplete="email" required/></div></div><p v-if="saveError" class="mt-4 text-sm text-danger" role="alert">{{saveError}}</p><Button type="submit" variant="primary" class="mt-6">Сохранить изменения</Button></form>
     </Card>
     <Card padding="lg"><div class="master-section-top"><div><h2>Специализация</h2><p>Услуги, для которых у вас есть необходимые навыки</p></div></div><div class="master-profile-chips"><span v-for="skill in masterProfile.skills" :key="skill">{{skill}}<button type="button" :aria-label="'Убрать навык '+skill" @click="setSkill(skill,false)"><SvgIcon name="x" :size="15"/></button></span><p v-if="!masterProfile.skills.length" class="text-sm text-muted">Навыки не указаны.</p></div><div class="master-profile-add"><Select label="Добавить навык" v-model="newSkill" :options="skillOptions"/><Button variant="outline" :disabled="!newSkill" @click="addSkill">Добавить</Button></div></Card>
     <Card v-if="profileMaster.is_onsite" padding="lg"><div class="master-section-top"><div><h2>Зона обслуживания</h2><p>Районы, в которых вы готовы работать на выезде</p></div></div><div class="master-profile-chips"><span v-for="zone in masterProfile.zones" :key="zone">{{zone}}<button type="button" :aria-label="'Убрать район '+zone" @click="setZone(zone,false)"><SvgIcon name="x" :size="15"/></button></span><p v-if="!masterProfile.zones.length" class="text-sm text-muted">Районы не указаны.</p></div><div class="master-profile-add"><Select label="Добавить район" v-model="newZone" :options="zoneOptions"/><Button variant="outline" :disabled="!newZone" @click="addZone">Добавить</Button></div></Card>
    </div>
    <aside class="master-profile-aside">
     <Card padding="lg"><h2>Рабочий статус</h2><p class="text-sm text-muted mt-3">Приостановите новые назначения, если сейчас не можете их принимать.</p><div class="master-profile-switch"><div><strong>Доступен для заявок</strong><small>{{masterProfile.isAvailable?'Приём открыт':'Приём на паузе'}}</small></div><ToggleSwitch :model-value="masterProfile.isAvailable" label="Доступен для новых заявок" @update:model-value="onAvailability"/></div><p class="master-profile-note">Уже назначенные работы остаются в вашей очереди.</p></Card>
     <Card padding="lg"><h2>Форматы работы</h2><p class="master-profile-note">Можно выбрать оба формата. Это учитывается при назначении новых заявок.</p><div class="master-profile-switch"><strong>Выезд к клиенту</strong><ToggleSwitch :model-value="!!profileMaster.is_onsite" label="Работа на выезде" @update:model-value="v=>changeMode('is_onsite',v)"/></div><div class="master-profile-switch"><strong>Ремонт в сервисе</strong><ToggleSwitch :model-value="!!profileMaster.is_dropoff" label="Работа в сервисе" @update:model-value="v=>changeMode('is_dropoff',v)"/></div><p class="master-profile-note">{{countLabel(masterProfile.skills.length,'навык','навыка','навыков')}} · {{countLabel(masterProfile.zones.length,'район','района','районов')}} обслуживания</p></Card>
     <Card padding="lg"><h2>Опыт и нагрузка</h2><dl class="master-profile-facts"><div><dt>Рейтинг</dt><dd>{{masterProfile.rating.toFixed(1)}}<small> / 5</small></dd></div><div><dt>Опыт работы</dt><dd>{{masterProfile.experienceYears}} лет</dd></div><div><dt>Выполнено работ</dt><dd>{{workStats.closed}}</dd></div><div><dt>Лимит на день</dt><dd>{{masterProfile.maxDailyRequests}} заявок</dd></div></dl></Card>
     <div class="master-note">Навыки, район и доступность учитываются при подборе подходящего исполнителя.</div>
    </aside>
   </div>
   <section class="master-works"><div class="master-section-top"><div><h2>Мои работы</h2><p>Выполненные и закрытые заявки. История вашей работы в сервисе.</p></div><div class="flex gap-2"><Button variant="outline" aria-label="Предыдущие работы" :disabled="completedWorks.length<2" @click="workCarousel?.scrollBy({left:-520,behavior:'smooth'})">←</Button><Button variant="outline" aria-label="Следующие работы" :disabled="completedWorks.length<2" @click="workCarousel?.scrollBy({left:520,behavior:'smooth'})">→</Button></div><RouterLink to="/master/requests?scope=all">Вся история →</RouterLink></div><div v-if="completedWorks.length" class="works-carousel" ref="workCarousel" tabindex="0" aria-label="Выполненные работы — прокрутите список"><RouterLink v-for="r in completedWorks" :key="r.id" :to="'/master/task/'+r.number" class="master-work-example"><span class="master-work-example-icon"><DeviceArt :name="r.icon"/></span><small>{{r.request_number??'#'+r.number}}</small><h3>{{r.device}}</h3><p>{{r.service}}</p><StatusBadge :status="r.status"/></RouterLink></div><p v-else class="master-note">Здесь появятся завершённые вами ремонты. Активные задачи остаются в разделе заявок.</p></section>
  </PageState>
 <PasswordForm/></div>
</template>
<style scoped>
.works-carousel{display:flex;gap:20px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px 18px}.works-carousel>a{flex:0 0 min(420px,88%);scroll-snap-align:start}

.master-profile-layout{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:24px;align-items:start}.master-profile-identity{display:flex;align-items:center;gap:14px;padding-bottom:25px;border-bottom:1px solid var(--border);margin-bottom:27px}.master-profile-identity>span:first-child{display:grid;place-items:center;width:58px;height:58px;flex-shrink:0;border-radius:19px;background:linear-gradient(145deg,#d2e9ff,#93bfff);color:#1b4b98;font-size:21px;font-weight:700}.master-profile-identity>div{min-width:0;flex:1}.master-profile h2{font-size:21px;font-weight:700;line-height:1.4;letter-spacing:-.03em}.master-profile-identity p{font-size:13px;color:var(--muted);margin-top:4px}.master-contact-form>h2{font-size:18px}.master-profile-aside{display:grid;gap:22px;min-width:0}.master-profile-chips{display:flex;gap:9px;flex-wrap:wrap}.master-profile-chips>span{display:inline-flex;align-items:center;gap:8px;max-width:100%;font-size:14px;line-height:1.6;padding:7px 8px 7px 13px;color:var(--blue);background:color-mix(in srgb,var(--blue) 7%,transparent);border:1px solid color-mix(in srgb,var(--blue) 20%,var(--border));border-radius:11px}.master-profile-chips button{display:grid;place-items:center;width:30px;height:30px;flex-shrink:0;border-radius:8px;cursor:pointer}.master-profile-chips button:hover{background:color-mix(in srgb,var(--blue) 12%,transparent)}.master-profile-add{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:13px;align-items:end;margin-top:25px}.master-profile-switch{display:flex;align-items:center;justify-content:space-between;gap:13px;border-block:1px solid var(--border);padding:21px 0;margin-top:23px}.master-profile-switch strong{display:block;font-size:14px}.master-profile-switch small{display:block;color:var(--muted);font-size:12px;margin-top:5px}.master-profile-note{font-size:13px;line-height:1.8;color:var(--muted);margin-top:17px}.master-profile-facts{margin-top:20px;display:grid;gap:18px}.master-profile-facts>div{display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border);padding-bottom:17px}.master-profile-facts>div:last-child{border-bottom:0;padding-bottom:0}.master-profile-facts dt{font-size:13px;color:var(--muted)}.master-profile-facts dd{font-size:17px;font-weight:650}.master-profile-facts dd small{font-size:12px;color:var(--muted);font-weight:400}@media(max-width:1000px){.master-profile-layout{grid-template-columns:1fr}.master-profile-aside{grid-template-columns:1fr 1fr}.master-profile-aside>.master-note{grid-column:1/-1}}@media(max-width:600px){.master-profile-aside{grid-template-columns:1fr}.master-profile-add{grid-template-columns:1fr}.master-profile-add .btn-base{justify-self:start}.master-profile h2{font-size:19px}.master-profile-identity{flex-wrap:wrap}.master-profile-identity h2{font-size:17px}.master-profile-identity>span:last-child{margin-left:72px}}
</style>

