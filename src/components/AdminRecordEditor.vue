<script setup>
import {api,mutate,saveRecord} from '../api/client'
import {bindWorkModes} from '../data/masterWorkModes'
import {computed,reactive,ref,watch} from 'vue'
import Modal from './ui/Modal.vue'
import Input from './ui/Input.vue'
import Select from './ui/Select.vue'
import Button from './ui/Button.vue'
import {adminClients,adminMasters,adminMasterUsers,adminMasterRecords,adminSkills,adminServices,adminParts,adminStock} from '../data/admin'
import {adminSuppliers,adminPoints,nextId,logAdmin} from '../data/adminOperations'
import {toast} from '../composables/useToast'
const props=defineProps({modelValue:Boolean,entity:String,record:{type:Object,default:null}})
const emit=defineEmits(['update:modelValue'])
const form=reactive({}),error=ref(''),skillIds=ref([])
const active=[{value:1,label:'Активен'},{value:0,label:'В архиве'}],yesNo=[{value:1,label:'Да'},{value:0,label:'Нет'}]
const titles={clients:'клиента',masters:'мастера',warehouse:'запчасть',points:'точку приёма',suppliers:'поставщика'}
const fields=computed(()=>({
 clients:[['full_name','ФИО'],['email','Email','email'],['phone','Телефон','tel'],['address','Адрес'],['is_active','Статус','select',active]],
 masters:[['full_name','ФИО'],['email','Email','email'],['phone','Телефон','tel'],['experience_years','Опыт, лет','number'],['max_daily_requests','Лимит заявок на день','number'],['service_area','Районы через запятую'],['is_available','Доступен для заявок','select',yesNo],['is_onsite','Работает на выезде','select',yesNo],['is_dropoff','Работает в сервисе','select',yesNo]],
 warehouse:[['name','Название'],['sku','Артикул'],['description','Описание'],['unit_price','Цена за единицу, ₽','number'],['min_stock','Минимальный остаток','number'],['supplier_id','Поставщик','select',adminSuppliers.filter(s=>s.is_active).map(s=>({value:s.id,label:s.name}))],['is_active','Статус','select',active]],
 suppliers:[['name','Название'],['contact_person','Контактное лицо'],['email','Email','email'],['phone','Телефон','tel'],['is_active','Статус','select',active]],
 points:[['name','Название'],['address','Адрес'],['working_hours','Режим работы'],['is_active','Статус','select',active]]
})[props.entity]??[])
watch(()=>[props.modelValue,props.record],()=>{if(!props.modelValue)return;Object.keys(form).forEach(k=>delete form[k]);Object.assign(form,{name:'',full_name:'',email:'',phone:'',address:'',contact_person:'',description:'',sku:'',unit_price:0,min_stock:0,supplier_id:1,is_active:1,experience_years:0,max_daily_requests:4,is_available:1,is_onsite:1,is_dropoff:1,service_area:'Центральный',...props.record});if(props.entity==='masters'){try{form.service_area=JSON.parse(form.service_area).join(', ')}catch{form.service_area=''}skillIds.value=adminSkills.filter(s=>s.master_id===props.record?.id).map(s=>s.service_id)}error.value=''},{immediate:true})
async function save(){
 error.value=''
 const e=props.entity,name=(e==='clients'||e==='masters'?form.full_name:form.name)?.trim()
 if(!name||name.length<3){error.value='Укажите полное имя или название (не менее 3 символов).';return}
 if((e==='clients'||e==='masters'||form.email)&&!/^\S+@\S+\.\S+$/.test(form.email?.trim())){error.value='Проверьте email.';return}
 if((e==='clients'||e==='masters')&&form.phone.replace(/\D/g,'').length<10){error.value='Укажите корректный телефон.';return}
 if(e==='clients'&&adminClients.some(c=>c.id!==props.record?.id&&c.email.toLowerCase()===form.email.trim().toLowerCase())){error.value='Клиент с этим email уже существует.';return}
 if(e==='warehouse'&&(!form.sku.trim()||adminParts.some(p=>p.id!==(props.record?.part_id??props.record?.id)&&p.sku===form.sku.trim()))){error.value='Укажите уникальный артикул.';return}
 const numeric=e==='warehouse'?['unit_price','min_stock']:e==='masters'?['experience_years','max_daily_requests']:[]
 if(numeric.some(k=>!Number.isFinite(Number(form[k]))||Number(form[k])<0||k!=='unit_price'&&!Number.isInteger(Number(form[k])))||(e==='masters'&&Number(form.max_daily_requests)<1)){error.value='Проверьте числовые значения.';return}
 if(e==='points'&&form.address.trim().length<5){error.value='Укажите полный адрес.';return}
 if(e==='masters'&&!form.is_onsite&&!form.is_dropoff){error.value='Выберите хотя бы один формат работы.';return}
 const data=Object.fromEntries(fields.value.map(([k])=>[k,typeof form[k]==='string'?form[k].trim():form[k]]));numeric.forEach(k=>data[k]=Number(data[k]))
 try {
 const id=props.record?.part_id??props.record?.id
 if(e==='masters'){
  const {full_name,email,phone,...rest}=data
  let masterId=id
  if(!id){if(!form.password)throw Error('Укажите начальный пароль');const u=await saveRecord('users',null,{full_name,email,phone,role:'master',is_active:1,password:form.password});masterId=adminMasters.find(m=>m.user_id===u.id)?.id}
  else await saveRecord('users',props.record.user_id,{full_name,email,phone})
  await mutate('/masters/'+masterId,{experience_years:Number(rest.experience_years),max_daily_requests:Number(rest.max_daily_requests),is_available:Number(rest.is_available),is_onsite:Number(rest.is_onsite),is_dropoff:Number(rest.is_dropoff),service_area:form.service_area.split(',').map(z=>z.trim()).filter(Boolean),skills:skillIds.value.map(service_id=>({service_id,skill_level:adminServices.find(s=>s.id===service_id)?.required_skill_level??1}))},'PATCH')
 }else{
  const entity={clients:'users',warehouse:'parts',points:'points',suppliers:'suppliers'}[e]
  if(e==='clients'){data.role='client';if(!id)data.password=form.password}
  if(e==='warehouse'){data.unit_price_cents=Math.round(Number(data.unit_price)*100);delete data.unit_price;data.supplier_id=Number(data.supplier_id)}
  for(const k of ['is_active'])if(data[k]!==undefined)data[k]=Number(data[k])
  await saveRecord(entity,id,data)
 }
 toast('Запись сохранена');emit('update:modelValue',false)
 } catch(e){error.value=e.message}

}
</script>
<template><Modal :model-value="modelValue" @update:model-value="emit('update:modelValue',$event)" :title="(record?'Редактировать ':'Добавить ')+titles[entity]" size="lg" description="Справочник сервисного центра"><form id="admin-record-form" class="grid gap-5 sm:grid-cols-2" @submit.prevent="save" novalidate><template v-for="[key,label,type,options] in fields" :key="key"><Select v-if="type==='select'" v-model="form[key]" :label="label" :options="options"/><Input v-else v-model="form[key]" :label="label" :type="type??'text'" :min="type==='number'?0:undefined"/></template><Input v-if="!record&&['masters','clients'].includes(entity)" v-model="form.password" label="Начальный пароль" type="password" minlength="8"/><div v-if="entity==='masters'" class="sm:col-span-2"><h3 class="font-semibold">Навыки по услугам</h3><div class="admin-skill-options"><label v-for="s in adminServices.filter(s=>s.is_active)" :key="s.id"><input v-model="skillIds" type="checkbox" :value="s.id"/><span>{{s.name}}</span></label></div></div><p v-if="entity==='warehouse'" class="sm:col-span-2 text-sm text-muted">Остаток и резерв не редактируются здесь. Приход оформляется через получение заказа поставщика.</p><p v-if="error" class="sm:col-span-2 text-sm text-danger" role="alert">{{error}}</p></form><template #footer><Button variant="outline" @click="emit('update:modelValue',false)">Отмена</Button><Button variant="primary" type="submit" form="admin-record-form">Сохранить запись</Button></template></Modal></template>

