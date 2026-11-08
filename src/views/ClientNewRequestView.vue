<script setup>
import {mutate} from '../api/client'
import WorkspaceHero from '../components/WorkspaceHero.vue'
import { clientHeaderMedia } from '../data/clientHeaderMedia'
import { computed, reactive, ref, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from '../components/ui/Button.vue'
import Card from '../components/ui/Card.vue'
import Input from '../components/ui/Input.vue'
import Select from '../components/ui/Select.vue'
import DatePicker from '../components/ui/DatePicker.vue'
import { isCompleteAddress } from '../../shared/domain/address'
import AddressPicker from '../components/AddressPicker.vue'
import SvgIcon from '../components/ui/SvgIcon.vue'
import DeviceArt from '../components/illustrations/DeviceArt.vue'
import { servicesView } from '../data/services'
import { servicePoints } from '../data/servicePoints'
import { users, DEMO_CLIENT_ID } from '../data/users'
import { requests, requestsView, toRequestView } from '../data/requests'
import { useNotifications } from '../composables/useNotifications'
import { toast } from '../composables/useToast'
const route = useRoute(), router = useRouter()
const user = users.find(u => u.id === DEMO_CLIENT_ID)
const selected = servicesView.find(s => s.name === route.query.service || s.id === Number(route.query.service_id))
const form = reactive({ service_id: selected?.id ?? '', service_mode: route.query.mode === 'dropoff' ? 'dropoff' : 'onsite', client_address: user.address ?? '', service_district:'', dropoff_point_id: servicePoints[0]?.id??'', preferred_datetime: '', preferred_slot: '', description: '', device_model: '', contact_person: user.full_name, contact_phone: user.phone, photos: [] })
const errors = reactive({}), step = ref(1), submitting = ref(false)
const addressPicker = ref(null), districtFallback = ref(false), checkingAddress = ref(false)
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' })
const service = computed(() => servicesView.find(s => s.id === Number(form.service_id)))
const serviceOptions = [{ value: '', label: 'Выберите услугу' }, ...servicesView.filter(s => s.is_active).map(s => ({ value: s.id, label: s.name }))]
const slotClock=ref(Date.now()),slotTimer=setInterval(()=>slotClock.value=Date.now(),30000)
onUnmounted(()=>clearInterval(slotTimer))
const slots = computed(()=>[{ value:'',label:'Выберите время' }, ...['10:00-12:00','13:00-15:00','16:00-18:00'].map(value => ({ value, label:value.replace('-',' — ') })).filter(s=>new Date(form.preferred_datetime+'T'+s.value.slice(0,5)+':00+03:00').getTime()>slotClock.value)] )
const { addNotification } = useNotifications()
function validateFirst() {
 Object.keys(errors).forEach(k => delete errors[k])
 if (!service.value) errors.service_id = 'Выберите услугу из каталога'
 if (form.service_mode === 'onsite') {
  if (!isCompleteAddress(form.client_address)) errors.client_address = 'Укажите город, улицу и номер дома через запятую'
  else if (!addressPicker.value?.checkCity()) errors.client_address = 'Выезд доступен только по Москве'
 }
 if (form.service_mode === 'dropoff' && !servicePoints.some(p => p.id === Number(form.dropoff_point_id))) errors.dropoff_point_id = 'Выберите точку приёма'
 if (!form.preferred_datetime || form.preferred_datetime < today) errors.preferred_datetime = 'Выберите сегодняшнюю или будущую дату'
 if (!slots.value.some(s => s.value && s.value === form.preferred_slot)) errors.preferred_slot = 'Выберите временной слот'
 return !Object.keys(errors).length
}
async function next() {
 if (addressPicker.value?.busy || checkingAddress.value) return
 if (!validateFirst()) return
 if (form.service_mode === 'onsite' && (!districtFallback.value || !form.service_district)) {
  checkingAddress.value = true
  try { await addressPicker.value?.search() }
  finally { checkingAddress.value = false }
 }
 if (form.service_mode === 'onsite' && !form.service_district) {
  errors.service_district = districtFallback.value ? 'Выберите зону вручную' : 'Уточните адрес дома'
  return
 }
 step.value = 2
}
const photoBusy=ref(false)
async function selectPhotos(event){delete errors.photos;photoBusy.value=true;try{const files=Array.from(event.target.files??[]);if(files.length+form.photos.length>5)throw Error('Можно прикрепить до 5 фотографий');const result=[];for(const file of files){if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)throw Error('Выберите JPEG, PNG или WebP до 10 МБ');const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();let image;for(const quality of [.8,.65,.5,.35,.2]){image=canvas.toDataURL('image/webp',quality);if(image.length<=180000)break}if(image.length>180000)throw Error('Слишком детальное фото: выберите изображение меньшего размера');result.push(image)}form.photos.push(...result)}catch(e){errors.photos=e.message}finally{photoBusy.value=false;event.target.value=''}}
async function submit() {if(photoBusy.value)return

 if (!validateFirst()) { step.value = 1; return }
 if (form.service_mode === 'onsite' && (!form.service_district || addressPicker.value?.busy)) {
  errors.service_district = 'Уточните адрес и зону обслуживания'
  step.value = 1
  return
 }
 if ([form.device_model.trim(),form.description.trim()].filter(Boolean).join(': ').length>2000) errors.description='Описание вместе с моделью должно содержать не более 2000 символов'
 if (form.description.trim().length < 10) errors.description = 'Опишите проблему подробнее: не менее 10 символов'
 if (form.contact_person.trim().length < 3) errors.contact_person = 'Укажите ФИО контактного лица'
 if (form.contact_phone.replace(/\D/g,'').length < 10) errors.contact_phone = 'Проверьте номер телефона'
 const photos = form.photos
 if (Object.keys(errors).length) return
 submitting.value = true
 try {
 const record=await mutate('/requests?auto_confirm=1',{service_id:Number(form.service_id),service_mode:form.service_mode,description:[form.device_model.trim(),form.description.trim()].filter(Boolean).join(': '),preferred_datetime:form.preferred_datetime+'T'+form.preferred_slot.slice(0,5)+':00+03:00',preferred_slot:form.preferred_slot,contact_person:form.contact_person,photos,...(form.service_mode==='onsite'?{client_address:form.client_address,service_district:form.service_district}:{dropoff_point_id:Number(form.dropoff_point_id)})})
 toast('Заявка сохранена');await router.push({path:'/client/requests',query:{request:record.id}})
 } catch(error){toast(error.message);Object.assign(errors,Object.fromEntries(Object.entries(error.fields??{}).map(([k,v])=>[k,v[0]])));if(['preferred_datetime','preferred_slot','service_id','client_address','service_district','dropoff_point_id'].some(k=>errors[k]))step.value=1}finally{submitting.value=false}

}
</script>
<template>
 <div class="client-new-request">
  <WorkspaceHero title="Создать заявку" description="Выберите услугу и удобный формат. Мы уточним детали и подберём мастера." eyebrow="ПОМОЖЕМ ВАШЕЙ ТЕХНИКЕ" :image="form.service_mode==='onsite'?clientHeaderMedia.newRequest:clientHeaderMedia.services"><Button to="/client/requests" variant="outline">Мои заявки</Button></WorkspaceHero>
  <div class="new-request-layout"><div class="new-request-main"><div class="new-step-nav" aria-label="Шаг оформления"><button :class="{ active: step === 1 }" @click="step = 1"><span>01</span>Услуга и время</button><i></i><button :class="{ active: step === 2 }" @click="next"><span>02</span>Детали обращения</button></div>
   <Card v-show="step === 1" padding="lg"><h2>Как вам удобнее?</h2><p class="form-intro">Выберите формат обслуживания</p><div class="new-mode-grid"><button v-for="m in [{value:'onsite',label:'Выезд мастера',text:'Приедем по вашему адресу',icon:'home'},{value:'dropoff',label:'Приём в сервисе',text:'Привезите устройство в точку приёма',icon:'store'}]" :key="m.value" :class="{selected:form.service_mode===m.value}" :aria-pressed="form.service_mode===m.value" @click="form.service_mode=m.value"><span><SvgIcon :name="m.icon" :size="24"/></span><strong>{{ m.label }}</strong><small>{{ m.text }}</small><SvgIcon v-if="form.service_mode===m.value" name="checkCircle" :size="18" class="mode-check"/></button></div><div class="new-form-fields"><Select v-model="form.service_id" label="Услуга" :options="serviceOptions" :error="errors.service_id" required/><Input v-if="form.service_mode==='onsite'" v-model="form.client_address" label="Адрес выезда" icon-left="mapPin" :error="errors.client_address" placeholder="Город, улица, дом, квартира" required/><Select v-else v-model="form.dropoff_point_id" label="Точка приёма" :options="servicePoints.filter(p=>p.is_active).map(p=>({value:p.id,label:`${p.name} · ${p.address}`}))" :error="errors.dropoff_point_id" required/><template v-if="form.service_mode==='onsite'"><AddressPicker ref="addressPicker" v-model="form.client_address" @district="value=>{form.service_district=value;delete errors.service_district}" @unavailable="districtFallback=$event"/><Select v-if="districtFallback" v-model="form.service_district" label="Зона обслуживания" :error="errors.service_district" :options="[{value:'',label:'Выберите зону'},'Центральный','Северный','Южный']" required/><p v-else class="new-hint"><SvgIcon name="mapPin" :size="16"/>{{form.service_district ? 'Зона обслуживания: '+form.service_district : 'Зона обслуживания определится по адресу'}}</p><p v-if="!districtFallback && errors.service_district" class="field-error">{{errors.service_district}}</p></template><div class="new-date-grid"><DatePicker v-model="form.preferred_datetime" label="Желаемая дата" :min="today" :error="errors.preferred_datetime"/><Select v-model="form.preferred_slot" label="Временной слот" :options="slots" :error="errors.preferred_slot" required/></div><p class="new-hint"><SvgIcon name="infoCircle" :size="16"/>Подтвердим время при обработке заявки с учётом расписания мастера и дороги.</p><Button variant="primary" @click="next" :disabled="addressPicker?.busy" :loading="checkingAddress">Продолжить<template #iconRight><SvgIcon name="arrowRight" :size="17"/></template></Button></div></Card>
   <Card v-show="step === 2" padding="lg"><h2>Что случилось с устройством?</h2><p class="form-intro">Чем подробнее описание, тем проще подготовиться к ремонту</p><form class="new-form-fields" @submit.prevent="submit" novalidate><Input v-model="form.device_model" label="Марка и модель (необязательно)" placeholder="Например, Samsung Galaxy S23" maxlength="150"/><div><label for="request-description" class="form-label">Описание проблемы <span>*</span></label><textarea id="request-description" v-model="form.description" class="control" rows="5" maxlength="2000" placeholder="Когда появилась неисправность? Что именно не работает?" :aria-invalid="!!errors.description" :aria-describedby="errors.description ? 'description-error' : undefined"></textarea><p v-if="errors.description" id="description-error" class="field-error">{{ errors.description }}</p></div><div class="new-date-grid"><Input v-model="form.contact_person" label="Контактное лицо" :error="errors.contact_person" required/><Input v-model="form.contact_phone" readonly hint="Телефон копируется из профиля. Измените его в профиле до оформления заявки." type="tel" label="Телефон для связи" :error="errors.contact_phone" required/></div><section class="photo-links"><label for="request-photos" class="form-label">Фотографии устройства</label><label class="photo-upload-button" for="request-photos">Выбрать фотографии</label><input class="sr-only" id="request-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple @change="selectPhotos" :disabled="photoBusy"/><p class="new-hint">До 5 фотографий JPEG, PNG или WebP, до 10 МБ каждая. Можно выбрать с телефона.</p><p v-if="errors.photos" role="alert" class="field-error">{{errors.photos}}</p><div class="photo-preview"><figure v-for="(photo,i) in form.photos" :key="photo"><img :src="photo" :alt="'Фото устройства '+(i+1)"/><Button variant="outline" size="sm" @click="form.photos.splice(i,1)">Удалить</Button></figure></div></section><p class="new-hint"><SvgIcon name="shield" :size="16"/>Стоимость согласуем после диагностики. Создание заявки не означает согласия на дополнительные работы.</p><div class="new-submit-actions"><Button variant="outline" @click="step=1"><SvgIcon name="arrowLeft" :size="16"/>Назад</Button><Button variant="primary" type="submit" :loading="submitting" :disabled="photoBusy">Создать заявку<SvgIcon name="arrowRight" :size="17"/></Button></div></form></Card>
  </div><aside class="new-request-aside"><Card padding="lg"><span class="aside-device"><DeviceArt :name="service?.icon ?? 'laptop'"/></span><h2>{{ service?.name ?? 'Всё начинается с заявки' }}</h2><p>{{ service ? 'Базовая стоимость выбранной услуги' : 'Выберите услугу — здесь появится её базовая стоимость.' }}</p><strong v-if="service" class="new-service-price">{{ service.price }}</strong><ul><li><SvgIcon name="checkCircle" :size="16"/>Подтвердим детали обращения</li><li><SvgIcon name="checkCircle" :size="16"/>Подберём подходящего мастера</li><li><SvgIcon name="checkCircle" :size="16"/>Сообщим об изменениях в кабинете</li></ul></Card></aside></div>
 </div>
</template>
<style scoped>
.client-new-request{display:grid;gap:28px}.form-kicker{font-size:12px;letter-spacing:.14em;font-weight:750;color:var(--blue)}.new-page-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:8px 0}.new-page-heading h1{font-size:37px;font-weight:750;line-height:1.14;letter-spacing:-.05em;margin-top:12px}.new-page-heading p{font-size:15px;color:var(--muted);line-height:1.8;margin-top:15px}.new-request-layout{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(260px,1fr);gap:25px;align-items:start}.new-request-main{display:grid;gap:20px}.new-step-nav{display:flex;align-items:center;gap:15px;padding:18px;border:1px solid var(--border);background:var(--surface);border-radius:15px}.new-step-nav>button{display:flex;align-items:center;gap:9px;font-size:14px;color:var(--muted);cursor:pointer;white-space:nowrap}.new-step-nav>button>span{display:grid;place-items:center;width:30px;height:30px;background:var(--surface2);border-radius:10px;font-size:13px;font-weight:700}.new-step-nav>button.active{color:var(--blue);font-weight:650}.new-step-nav>button.active>span{color:white;background:var(--blue)}.new-step-nav>i{height:1px;background:var(--border);flex:1}.client-new-request h2{font-size:22px;font-weight:700;letter-spacing:-.03em;line-height:1.4}.form-intro{font-size:15px;color:var(--muted);line-height:1.8;margin-top:7px}.new-mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:24px}.new-mode-grid>button{position:relative;display:flex;flex-direction:column;align-items:start;text-align:left;padding:20px;border:1px solid var(--border);border-radius:15px;cursor:pointer;background:var(--bg)}.new-mode-grid>button>span:first-child{display:grid;place-items:center;width:40px;height:40px;background:var(--surface2);color:var(--muted);border-radius:12px;margin-bottom:14px}.new-mode-grid strong{font-size:15px;font-weight:650}.new-mode-grid small{font-size:13px;color:var(--muted);line-height:1.7;margin-top:7px}.new-mode-grid>button.selected{border-color:var(--blue);background:color-mix(in srgb,var(--blue) 5%,var(--surface))}.new-mode-grid>button.selected>span:first-child{background:color-mix(in srgb,var(--blue) 10%,transparent);color:var(--blue)}.mode-check{position:absolute;top:18px;right:16px;color:var(--blue)}.new-form-fields{display:grid;gap:21px;margin-top:25px}.new-date-grid{display:grid;grid-template-columns:1fr 1fr;gap:17px}.new-hint{display:flex;align-items:start;gap:8px;color:var(--muted);font-size:13px;line-height:1.85}.new-hint :deep(svg){flex-shrink:0;margin-top:2px;color:var(--blue)}.new-form-fields>:deep(button){justify-self:start}.form-label{display:block;font-size:15px;font-weight:600;margin-bottom:8px}.form-label>span{color:var(--red)}.new-form-fields textarea{font-size:15px;line-height:1.8;resize:vertical}.field-error{font-size:14px;color:var(--red);margin-top:7px}.photo-links{border:1px solid var(--border);border-radius:13px;padding:15px}.photo-links summary{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;font-weight:550;list-style:none}.photo-links summary::-webkit-details-marker{display:none}.photo-links summary>small{margin-left:auto;color:var(--muted);font-size:12px}.photo-chevron{display:grid;place-items:center;width:28px;height:28px;flex-shrink:0;background:var(--surface2);border-radius:8px;transition:transform .2s}.photo-links[open] .photo-chevron{transform:rotate(180deg)}.photo-links summary:focus-visible{outline:2px solid var(--blue);outline-offset:5px;border-radius:5px}.photo-links[open] summary{margin-bottom:20px}.photo-links .new-hint{margin-top:10px}.new-submit-actions{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:22px}.new-request-aside{position:sticky;top:100px;display:grid;gap:18px}.new-service-photo{position:relative;height:190px;border-radius:18px;overflow:hidden}.new-service-photo>img{width:100%;height:100%;object-fit:cover}.new-service-photo:after{content:'';position:absolute;inset:0;background:linear-gradient(transparent 35%,#06152dbb)}.new-service-photo>span{position:absolute;bottom:18px;left:18px;right:15px;z-index:1;display:flex;align-items:center;gap:8px;font-size:13px;color:white}.aside-device{display:block;width:90px;height:90px;padding:10px;border-radius:18px;background:var(--surface2);margin-bottom:20px}.new-request-aside h2{font-size:20px}.new-request-aside p{font-size:14px;color:var(--muted);line-height:1.8;margin-top:10px}.new-service-price{display:block;font-size:25px;font-weight:700;letter-spacing:-.04em;margin-top:15px}.new-request-aside ul{display:grid;gap:13px;border-top:1px solid var(--border);padding-top:20px;margin-top:22px}.new-request-aside li{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted)}.new-request-aside li :deep(svg){color:var(--blue);flex-shrink:0}@media(max-width:900px){.new-request-layout{grid-template-columns:1fr}.new-request-aside{position:static;grid-template-columns:1fr 1fr;align-items:start}.new-service-photo{height:100%;min-height:300px}.new-page-heading h1{font-size:32px}}@media(max-width:520px){.new-page-heading{align-items:start;flex-direction:column}.new-page-heading h1{font-size:32px}.new-page-heading p{font-size:14px}.form-kicker{font-size:11px}.new-step-nav{padding:14px;gap:10px}.new-step-nav>button{font-size:12px;gap:7px}.new-step-nav>button>span{width:26px;height:26px;font-size:12px}.client-new-request h2{font-size:21px}.new-mode-grid{gap:10px}.new-mode-grid>button{padding:15px}.new-mode-grid strong{font-size:14px}.new-mode-grid small{font-size:12px}.new-date-grid{grid-template-columns:1fr}.new-request-aside{grid-template-columns:1fr}.new-service-photo{display:none}.new-request-aside :deep(.card-surface){padding:22px}.photo-links summary{font-size:13px}.photo-links summary>small{display:none}.new-submit-actions>:deep(button){font-size:15px}}
</style>

<style scoped>
/* Keep the accessible file input inside its label area, without contributing to page width. */
.photo-links{position:relative}
.photo-links input.sr-only{width:1px!important;max-width:1px!important;height:1px!important;min-width:0!important}
.new-request-layout,.new-request-layout>*{min-width:0}
@media(max-width:520px){.new-request-layout,.new-request-aside{grid-template-columns:minmax(0,1fr)}.new-step-nav>button{min-width:0;white-space:normal;text-align:left}.new-step-nav>button>span{flex-shrink:0}}
.photo-preview{display:flex;flex-wrap:wrap;gap:12px;margin-top:16px}.photo-preview figure{width:140px;display:grid;gap:8px}.photo-preview img{width:140px;height:100px;object-fit:cover;border-radius:10px}</style>

<style scoped>.photo-upload-button{display:inline-flex;cursor:pointer;align-items:center;padding:12px 18px;border:1px solid var(--blue);background:color-mix(in srgb,var(--blue) 10%,var(--surface));color:var(--blue);border-radius:10px;font-weight:600;font-size:14px}.photo-links:focus-within .photo-upload-button{outline:2px solid var(--blue);outline-offset:3px}</style>