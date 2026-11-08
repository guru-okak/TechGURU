<script setup>
import RequestPhotos from './RequestPhotos.vue'
import {workspace} from '../api/workspace'
import {mutate} from '../api/client'
import { computed, ref, watch } from 'vue'
import Modal from './ui/Modal.vue'
import Button from './ui/Button.vue'
import Input from './ui/Input.vue'
import SvgIcon from './ui/SvgIcon.vue'
import StatusBadge from './ui/StatusBadge.vue'
import DeviceArt from './illustrations/DeviceArt.vue'
import { clientRatings, requestHints } from '../data/clientWorkspace'
import { DEMO_CLIENT_ID } from '../data/users'
import { historyForRequest } from '../data/requestHistory'
import { statusLabel } from '../config/statuses'
import { toast } from '../composables/useToast'
const props = defineProps({ request: { type: Object, default: null } })
const emit = defineEmits(['close','changed'])
const reason = ref(''), cancelling = ref(false), stars = ref(0), comment = ref(''), error = ref('')
watch(() => props.request?.id, () => { reason.value = ''; cancelling.value = false; stars.value = 0; comment.value = ''; error.value = '' })
const owned = computed(() => props.request?.user_id === DEMO_CLIENT_ID)
const canCancel = computed(() => owned.value && ['new','confirmed'].includes(props.request?.status))
const rating = computed(() => clientRatings.find(r => r.request_id === props.request?.id))
const canRate = computed(() => owned.value && props.request?.master_id && ['completed','closed'].includes(props.request?.status) && !rating.value)
const repairFinished = computed(() => ['ready_for_pickup','completed','closed'].includes(props.request?.status))
const proposal = computed(() => props.request?.estimate_proposal && JSON.parse(props.request.estimate_proposal))
const proposalTotal = computed(() => proposal.value ? proposal.value.items.reduce((sum,item)=>sum+item.quantity*item.unit_price_cents,0)+proposal.value.parts_cents : 0)
const estimateBusy=ref(false),estimateError=ref('')
const visitDate = computed(() => props.request?.preferred_slot && props.request?.preferred_datetime ? new Date(props.request.preferred_datetime).toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'short',year:'numeric'}) : props.request?.desiredDate)
const formatPrice = cents => new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(cents/100)
async function decideEstimate(accepted){
 estimateBusy.value=true
 estimateError.value=''
 try{
  await mutate('/business/requests/'+props.request.id+'/estimate-decision',{proposal_id:proposal.value.id,accepted})
  emit('changed')
  toast(accepted?'Смета согласована':'Новая смета отклонена')
 }catch(e){estimateError.value=e.message}finally{estimateBusy.value=false}
}
async function cancel(){if(!canCancel.value)return;try{await mutate('/requests/'+props.request.id+'/cancel',{cancel_reason:reason.value.trim()||'Отменено клиентом'},'PATCH');cancelling.value=false;emit('changed');toast('Заявка отменена')}catch(e){error.value=e.message}}
async function rate(){if(!canRate.value||!stars.value)return;try{await mutate('/business/requests/'+props.request.id+'/rating',{rating:stars.value,comment:comment.value.trim()});toast('Спасибо за оценку')}catch(e){error.value=e.message}}
async function pickup(){try{await mutate('/business/requests/'+props.request.id+'/pickup');emit('changed');toast('Получение техники подтверждено')}catch(e){error.value=e.message}}

</script>
<template>

 <Modal :model-value="!!request" @update:model-value="v => { if (!v) $emit('close') }" :title="request?.request_number ?? `Заявка #${request?.number}`" size="lg">
  <div v-if="request && owned" class="client-detail">
   <div class="detail-device"><span><DeviceArt :name="request.icon" /></span><div><StatusBadge :status="request.status"/><h3>{{ request.device }}</h3><p>{{ requestHints[request.status] }}</p></div></div>
   <RequestPhotos :photos="request.photos"/><div class="detail-problem"><small>ОПИСАНИЕ НЕИСПРАВНОСТИ</small><p>{{ request.description }}</p></div>
   <dl class="client-detail-grid"><dt>Услуга</dt><dd>{{ request.service_name }}</dd><dt>Формат</dt><dd>{{ request.service_mode === 'onsite' ? 'Выезд мастера' : 'Приём в сервисе' }}</dd><dt>{{ request.service_mode === 'onsite' ? 'Адрес' : 'Точка приёма' }}</dt><dd>{{ request.client_address ?? request.service_point }}</dd><dt>Желаемое время</dt><dd>{{ visitDate }}<span v-if="request.preferred_slot"> · {{ request.preferred_slot }}</span></dd><dt>Мастер</dt><dd>{{ request.master }}</dd><dt>Стоимость</dt><dd class="font-semibold">{{ request.total_price > 0 ? request.price : 'Уточняется после диагностики' }}</dd></dl>
   <p v-if="request.cancel_reason" class="detail-message">Причина отмены: {{ request.cancel_reason }}</p>
   <section v-if="proposal && ['new','confirmed','assigned','in_progress','waiting_parts'].includes(request.status)" class="detail-form">
    <h3>Новая смета ожидает согласования</h3>
    <p class="text-sm text-muted">{{ proposal.reason }}</p>
    <div v-for="(item,index) in proposal.items" :key="index" class="flex justify-between gap-4"><span>{{item.name}} × {{item.quantity}}</span><strong>{{formatPrice(item.quantity*item.unit_price_cents)}}</strong></div>
    <div class="flex justify-between gap-4"><span>Запчасти, до</span><strong>{{formatPrice(proposal.parts_cents)}}</strong></div>
    <div class="flex justify-between gap-4"><span>Новая сумма, до</span><strong>{{formatPrice(proposalTotal)}}</strong></div>
    <p v-if="estimateError" class="text-sm text-danger" role="alert">{{estimateError}}</p>
    <div class="flex flex-wrap gap-2"><Button variant="primary" :disabled="estimateBusy" @click="decideEstimate(true)">Согласовать</Button><Button variant="outline" :disabled="estimateBusy" @click="decideEstimate(false)">Отклонить</Button></div>
   </section>
   <div v-if="canCancel && cancelling" class="detail-form"><Input v-model="reason" label="Причина отмены" placeholder="Почему хотите отменить заявку?" maxlength="500"/><p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p><div class="flex flex-wrap gap-2"><Button variant="danger" @click="cancel">Подтвердить отмену</Button><Button variant="outline" @click="cancelling = false; error = ''">Вернуться к заявке</Button></div></div>
   <section class="detail-form"><h3>Смета ремонта</h3><p class="text-sm text-muted">{{repairFinished?'Итоговая стоимость выполненного ремонта.':'Предварительная стоимость. Состав работ и деталей уточняется после диагностики.'}}</p><div v-for="item in workspace.items.filter(i=>i.request_id===request.id)" :key="item.id" class="flex justify-between gap-4"><span>{{item.name}} × {{item.quantity}}</span><strong>{{new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(item.quantity*item.unit_price_cents/100)}}</strong></div><div class="flex justify-between gap-4"><span>{{repairFinished ? 'Итого с использованными деталями' : 'Предварительная сумма'}}</span><strong>{{new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(request.total_price??0)}}</strong></div><p v-if="!request.total_price" class="text-sm text-muted">Смета ещё не сформирована.</p></section>
   <section class="detail-form"><h3>История заявки</h3><div v-for="(event,i) in historyForRequest(request.id)" :key="event.id??i"><strong>{{statusLabel(event.status)}}</strong><time class="block text-xs text-muted">{{new Date(event.created_at).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})}}</time><p class="text-sm text-muted">{{({start:'Мастер принял заявку в работу',complete:'Ремонт завершён',pickup:'Техника получена клиентом'}[event.comment]??event.comment)}}</p></div><p v-if="!historyForRequest(request.id).length" class="text-sm text-muted">История изменений появится после обработки заявки.</p></section>
   <Button v-if="request.status==='ready_for_pickup'" variant="primary" @click="pickup">Подтвердить получение техники</Button>
   <div v-if="rating" class="detail-message text-ok"><SvgIcon name="checkCircle" :size="18"/>Ваша оценка мастеру: {{ rating.rating }} из 5. Спасибо!</div>
   <form v-else-if="canRate" class="detail-form" @submit.prevent="rate"><h3>Как прошёл ремонт?</h3><p class="text-sm text-muted">Оцените работу мастера. На заявку можно оставить одну оценку.</p><div class="rating-stars" role="group" aria-label="Оценка мастеру"><button v-for="n in 5" :key="n" type="button" :aria-label="`${n} из 5`" :aria-pressed="stars === n" :class="{ selected: stars >= n }" @click="stars = n; error = ''"><SvgIcon name="star" :size="27"/></button></div><Input v-model="comment" label="Комментарий (необязательно)" maxlength="1000"/><p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p><Button type="submit" variant="primary">Отправить оценку</Button></form>
  </div>
  <template #footer><Button v-if="canCancel && !cancelling" variant="ghost" @click="cancelling = true">Отменить заявку</Button><Button variant="outline" @click="$emit('close')">Закрыть</Button></template>
 </Modal>
</template>
<style scoped>
.client-detail{display:grid;gap:24px}.detail-device{display:flex;gap:20px;align-items:center}.detail-device>span{width:90px;height:90px;flex-shrink:0;border-radius:20px;background:var(--surface2);padding:10px}.detail-device>div{min-width:0;overflow-wrap:anywhere}.detail-device h3{font-size:22px;font-weight:700;letter-spacing:-.03em;margin-top:12px}.detail-device p{font-size:15px;color:var(--muted);margin-top:7px;line-height:1.7}.detail-problem{border-radius:14px;padding:18px;background:var(--surface2)}.detail-problem small{font-size:12px;letter-spacing:.12em;color:var(--muted)}.detail-problem p{font-size:15px;line-height:1.8;margin-top:8px}.client-detail-grid{display:grid;grid-template-columns:130px minmax(0,1fr);gap:17px;font-size:15px}.client-detail-grid dt{color:var(--muted)}.client-detail-grid dd{overflow-wrap:anywhere}.detail-form{display:grid;gap:15px;border-top:1px solid var(--border);padding-top:22px}.detail-form h3{font-size:20px;font-weight:700}.detail-message{display:flex;gap:8px;align-items:center;font-size:15px;padding:15px;background:var(--surface2);border-radius:12px}.rating-stars{display:flex;gap:8px}.rating-stars button{display:grid;place-items:center;width:42px;height:42px;background:var(--surface2);border-radius:11px;color:var(--muted);cursor:pointer}.rating-stars button.selected{color:var(--amber);background:color-mix(in srgb,var(--amber) 12%,transparent)}.rating-stars button.selected :deep(svg){fill:color-mix(in srgb,var(--amber) 20%,transparent)}@media(max-width:480px){.detail-device{align-items:start;gap:13px}.detail-device>span{width:64px;height:64px;padding:8px}.detail-device h3{font-size:18px}.client-detail-grid{grid-template-columns:1fr;gap:7px}.client-detail-grid dd{margin-bottom:10px}}
</style>
