<script setup>
import RequestPhotos from './RequestPhotos.vue'
import {serviceMedia} from '../api/presentation'
import {api,mutate} from '../api/client'
import {requestParts} from '../data/requestParts'
import {adminParts} from '../data/admin'
import {workspace} from '../api/workspace'
import { computed,reactive,ref,watch } from 'vue'
import Modal from './ui/Modal.vue'
import Button from './ui/Button.vue'
import Input from './ui/Input.vue'
import DatePicker from './ui/DatePicker.vue'
import Select from './ui/Select.vue'
import Badge from './ui/Badge.vue'
import StatusBadge from './ui/StatusBadge.vue'
import DeviceArt from './illustrations/DeviceArt.vue'
import StatusArt from './illustrations/StatusArt.vue'
import { adminRequests,adminClients,adminServices,requestView,statusLabels,today,money } from '../data/admin'
import { adminPoints,adminHistory,eligibleMasters,transitionRequest,assignMaster,noAnswer,saveRequest } from '../data/adminOperations'
import { toast } from '../composables/useToast'
const props=defineProps({modelValue:Boolean,requestId:{type:Number,default:null}})
const emit=defineEmits(['update:modelValue'])
const raw=computed(()=>adminRequests.find(r=>r.id===props.requestId))
const record=computed(()=>raw.value?requestView(raw.value):null)
const editing=ref(false),error=ref(''),masterId=ref(''),reason=ref(''),rejecting=ref(false)
const form=reactive({}),estimateOpen=ref(false),estimateText=ref(''),estimateReason=ref(''),estimateParts=ref(0)
const moving=ref(false),visit=reactive({date:'',slot:''})
const slots=['10:00-12:00','13:00-15:00','16:00-18:00']
const candidates=ref([])
async function loadCandidates(){try{candidates.value=raw.value?.status==='confirmed'?await api('/business/requests/'+raw.value.id+'/candidates?all=1'):[]}catch(e){error.value=e.message;candidates.value=[]}}
watch(()=>[props.modelValue,raw.value?.status],()=>{if(props.modelValue)loadCandidates()},{immediate:true})
const history=computed(()=>adminHistory.filter(h=>h.request_id===props.requestId).slice().reverse())
const canReject=computed(()=>raw.value&&['new','confirmed','assigned','in_progress','waiting_parts','ready_for_pickup'].includes(raw.value.status))
const canEdit=computed(()=>raw.value&&['new','confirmed'].includes(raw.value.status))
function init(){const r=raw.value;Object.assign(form,{user_id:r?.user_id??adminClients.find(c=>c.is_active)?.id??0,service_id:r?.service_id??adminServices.find(s=>s.is_active)?.id??0,service_mode:r?.service_mode??'onsite',service_district:r?.service_district??'Центральный',client_address:r?.client_address??'',dropoff_point_id:r?.dropoff_point_id??adminPoints[0]?.id??'',description:r?.description??'',comment:r?.comment??'',preferred_datetime:r?.preferred_datetime.slice(0,10)??today,preferred_slot:r?.preferred_slot??slots[0]});error.value='';reason.value='';rejecting.value=false;masterId.value=''}
watch(()=>[props.modelValue,props.requestId],()=>{if(props.modelValue){init();editing.value=!props.requestId}},{immediate:true})
async function run(action){error.value='';try{await action();await loadCandidates();toast('Изменения сохранены')}catch(e){error.value=e.message}}
function save(){run(async()=>{const r=await saveRequest(form,props.requestId);editing.value=false;if(!props.requestId)emit('update:modelValue',false);toast('Заявка '+r.request_number+' сохранена')})}
function missed(){run(async()=>{const count=await noAnswer(props.requestId);toast(count>=3?'Заявка помечена для ручной проверки':'Недозвон: попытка '+count)})}
function openEstimate(){
 estimateText.value=workspace.items.filter(i=>i.request_id===record.value.id).map(i=>[i.name,i.quantity,i.unit_price_cents/100].join(';')).join('\n')
 estimateReason.value=''
 estimateParts.value=(raw.value.approved_parts_cents??0)/100
 estimateOpen.value=true
}
function proposeEstimate(){
 run(async()=>{
  const items=estimateText.value.split('\n').filter(line=>line.trim()).map(line=>{
   const [name,quantity,price]=line.split(';')
   return {name:name.trim(),quantity:Number(quantity),unit_price_cents:Math.round(Number(price)*100)}
  })
  await mutate('/business/requests/'+record.value.id+'/estimate',{items,reason:estimateReason.value,parts_cents:Math.round(Number(estimateParts.value)*100)})
  estimateOpen.value=false
 })
}
function startEdit(){init();editing.value=true}
watch(()=>[props.modelValue,props.requestId],()=>{moving.value=false;estimateOpen.value=false})
function startMove(){
 const r=raw.value
 visit.date=new Date(r.preferred_datetime).toLocaleDateString('en-CA',{timeZone:'Europe/Moscow'})
 visit.slot=r.preferred_slot
 moving.value=true
}
function saveMove(){
 run(async()=>{
  await mutate('/business/requests/'+record.value.id+'/reschedule',{datetime:visit.date+'T'+visit.slot.slice(0,5)+':00+03:00',slot:visit.slot})
  moving.value=false
 })
}
</script>
<template>
 <Modal :model-value="modelValue" @update:model-value="emit('update:modelValue',$event)" :title="record?.request_number??'Новая заявка'" :description="editing?'Данные обращения и удобное время ремонта':'Обработка обращения клиента'" size="lg">
  <form v-if="editing" id="admin-request-form" class="grid gap-5" @submit.prevent="save" novalidate>
   <Select :disabled="!!requestId" v-model="form.user_id" label="Клиент" :options="adminClients.filter(c=>c.is_active).map(c=>({value:c.id,label:c.full_name+' · '+c.phone}))" required/>
   <Select :disabled="!!requestId" v-model="form.service_id" label="Услуга" :options="adminServices.filter(s=>s.is_active).map(s=>({value:s.id,label:s.name}))" required/>
   <Select :disabled="!!requestId" v-model="form.service_mode" label="Формат обслуживания" :options="[{value:'onsite',label:'Выезд мастера'},{value:'dropoff',label:'Приём в сервисе'}]"/>
   <Select v-if="form.service_mode==='onsite'" v-model="form.service_district" label="Район" :options="['Центральный','Северный','Южный']"/><Input v-if="form.service_mode==='onsite'" v-model="form.client_address" label="Адрес выезда" required/><Select v-else v-model="form.dropoff_point_id" label="Точка приёма" :options="adminPoints.filter(p=>p.is_active).map(p=>({value:p.id,label:p.name}))"/>
   <div class="grid gap-5 sm:grid-cols-2"><Input v-model="form.preferred_datetime" type="date" label="Желаемая дата" required/><Select v-model="form.preferred_slot" label="Временной слот" :options="[...new Set([...slots,form.preferred_slot])].map(s=>({value:s,label:s.replace('-',' — ')}))"/></div>
   <label class="admin-form-field">Описание неисправности<textarea v-model="form.description" class="control" rows="3" required></textarea></label><label class="admin-form-field">Комментарий администратора<textarea v-model="form.comment" class="control" rows="2"></textarea></label>
  </form>
  <div v-else-if="record" class="grid gap-6">
   <div class="flex flex-wrap items-center gap-2"><StatusBadge :status="record.status"/><Badge tone="blue">{{record.service_mode==='onsite'?'Выезд мастера':'В сервисе'}}</Badge><Badge v-if="record.is_urgent" tone="red">Срочно</Badge><Badge v-if="record.needs_manual_review" tone="red">Ручная проверка</Badge></div>
   <div class="admin-request-summary"><span><DeviceArt :name="serviceMedia(record.service??{}).icon"/></span><div><h3>{{record.service?.name}}</h3><p>{{record.description}}</p></div></div>
   <RequestPhotos :photos="record.photos"/><dl class="admin-detail-grid"><dt>Клиент</dt><dd>{{record.client.full_name}}<a :href="'tel:'+record.client.phone" class="block text-brand mt-1">{{record.contact_phone??record.client.phone}}</a></dd><dt>Желаемое время</dt><dd>{{new Date(record.preferred_datetime).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Moscow'})}}<small class="block text-muted">{{record.preferred_slot}}</small></dd><dt>{{record.service_mode==='onsite'?'Адрес':'Точка приёма'}}</dt><dd>{{record.client_address??adminPoints.find(p=>p.id===record.dropoff_point_id)?.name}}</dd><dt>Мастер</dt><dd>{{record.master?.full_name??'Не назначен'}}</dd><dt>Стоимость</dt><dd>{{money(record.total_price)}}</dd></dl>
   <div v-if="record.status==='confirmed'" class="admin-action-panel"><h3>Назначить мастера</h3><p>Список учитывает навык, формат работы и доступность специалиста.</p><Select v-model="masterId" label="Подходящий мастер" :options="[{value:'',label:'Выберите мастера'},...candidates.filter(m=>m.eligible).map(m=>({value:m.id,label:m.full_name+' · '+m.current_load+'/'+m.max_daily_requests+' заявок'}))]"/><div class="candidate-list"><article v-for="m in candidates" :key="m.id" class="candidate-card"><strong>{{m.full_name}}</strong><p>Услуги: {{m.skills_summary??'не указаны'}}</p><p>Загрузка на дату заявки: {{m.current_load}} / {{m.max_daily_requests}} · Рейтинг {{m.rating}} · Навык {{m.skill_level??'не указан'}}</p><p>{{m.eligible?'Доступен для назначения':m.unavailable_reason}}</p><Button v-if="m.eligible" variant="outline" @click="masterId=m.id">Выбрать</Button><RouterLink v-if="!m.eligible" to="/admin/masters" class="text-brand mr-4">Навыки и профиль</RouterLink><RouterLink v-if="!m.eligible" to="/admin/schedule" class="text-brand">Открыть расписание</RouterLink></article></div><p v-if="!candidates.some(m=>m.eligible)">Подходящих мастеров сейчас нет. Проверьте навыки и доступность команды.</p><Button variant="primary" :disabled="!masterId" @click="run(()=>assignMaster(record.id,masterId))">Назначить мастера</Button></div>
   <div v-if="canEdit" class="request-actions"><Button v-if="record.status==='new'" variant="primary" @click="run(()=>transitionRequest(record.id,'confirmed','Заявка подтверждена администратором'))">Подтвердить заявку</Button><Button variant="outline" @click="startEdit">Редактировать детали</Button><Button variant="outline" @click="run(()=>mutate('/business/requests/'+record.id+'/cancel',{comment:'Отменено администратором'}))">Отменить заявку</Button><Button variant="outline" @click="missed">Недозвон</Button></div>
   <Button v-if="record.status==='assigned' && !moving" variant="outline" @click="startMove">Перенести визит</Button>
   <form v-if="record.status==='assigned' && moving" class="admin-action-panel grid gap-3" @submit.prevent="saveMove">
    <p>Новое время должно быть свободно у назначенного мастера.</p>
    <div class="grid gap-4 sm:grid-cols-2"><DatePicker v-model="visit.date" :min="today" label="Новая дата"/><Select v-model="visit.slot" label="Новое время" :options="[...new Set([...slots,visit.slot])]"/></div>
    <div class="flex gap-2"><Button type="submit" variant="primary">Сохранить время</Button><Button type="button" variant="outline" @click="moving=false">Отмена</Button></div>
   </form>
   <Button v-if="canReject" variant="danger" class="reject-action" @click="rejecting=!rejecting">Отклонить заявку</Button>
   <Button v-if="record.status==='ready_for_pickup'" variant="primary" @click="run(()=>transitionRequest(record.id,'completed','Техника выдана клиенту'))">Подтвердить выдачу клиенту</Button>
   <div v-if="rejecting&&canReject" class="admin-action-panel"><label class="admin-form-field">Причина отклонения<textarea v-model="reason" class="control" rows="2"></textarea></label><Button variant="danger" @click="run(async()=>{await transitionRequest(record.id,'rejected',reason);rejecting=false})">Подтвердить отклонение</Button></div>
   <section class="grid gap-3"><h3 class="font-semibold">Запчасти заявки</h3><div v-for="part in requestParts.filter(p=>p.request_id===record.id)" :key="part.id" class="flex flex-wrap items-center gap-3"><span>{{adminParts.find(p=>p.id===part.part_id)?.name}} · резерв {{part.reserved_quantity}}, выдано {{part.issued_quantity}}</span><Button v-if="part.reserved_quantity" variant="outline" @click="run(()=>mutate('/business/requests/'+record.id+'/issue',{part_id:part.part_id}))">Выдать мастеру</Button></div></section><section v-if="['new','confirmed','assigned','in_progress','waiting_parts'].includes(record.status)" class="grid gap-3"><h3 class="font-semibold">Смета работ</h3><p v-for="item in workspace.items.filter(i=>i.request_id===record.id)" :key="item.id">{{item.name}} · {{item.quantity}} × {{money(item.unit_price_cents/100)}}</p><p v-if="raw.estimate_proposal" class="text-sm text-muted">Новая смета ожидает решения клиента.</p><p v-if="raw.approved_parts_cents!==null" class="text-sm text-muted">Согласовано на запчасти: {{money(raw.approved_parts_cents/100)}}</p><Button variant="outline" @click="estimateOpen ? estimateOpen=false : openEstimate()">Предложить новую смету</Button><form v-if="estimateOpen" @submit.prevent="proposeEstimate" class="grid gap-3"><label>Работа, количество и цена через точку с запятой<textarea v-model="estimateText" rows="4" class="control" placeholder="Диагностика;1;1200" required/></label><Input v-model="estimateParts" type="number" min="0" step="0.01" label="Лимит стоимости запчастей, ₽" required/><Input v-model="estimateReason" label="Причина изменения" maxlength="500" required/><Button type="submit">Отправить клиенту</Button></form></section><div><h3 class="font-semibold mb-4">История изменений</h3><div v-for="h in history" :key="h.id" class="admin-history-row"><StatusArt :status="h.to_status"/><div><strong>{{statusLabels[h.to_status]}}</strong><p>{{h.comment}}</p><small>{{new Date(h.created_at).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})}}</small></div></div><p v-if="!history.length" class="text-sm text-muted">Здесь появятся подтверждения, назначения и комментарии оператора.</p></div>
  </div>
  <p v-if="error" class="text-sm text-danger mt-4" role="alert">{{error}}</p>
  <template #footer><Button variant="outline" @click="editing&&props.requestId?(editing=false):emit('update:modelValue',false)">{{editing&&props.requestId?'Отмена':'Закрыть'}}</Button><Button v-if="editing" type="submit" form="admin-request-form" variant="primary">Сохранить заявку</Button></template>
 </Modal>
</template>

<style scoped>.request-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.reject-action{justify-self:start}.candidate-list{display:grid;gap:10px;margin:15px 0}.candidate-card{padding:14px;border:1px solid var(--border);border-radius:12px}.candidate-card p{font-size:13px;color:var(--muted);margin:8px 0}@media(max-width:520px){.request-actions{grid-template-columns:1fr}}</style>
