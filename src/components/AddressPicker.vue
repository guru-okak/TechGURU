<script setup>
import { ref, watch } from 'vue'
import YandexMap from './YandexMap.vue'
import SvgIcon from './ui/SvgIcon.vue'
import Button from './ui/Button.vue'
import Modal from './ui/Modal.vue'
import { isCompleteAddress, isMoscowAddress } from '../../shared/domain/address'
import { api } from '../api/client'

const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue', 'district', 'unavailable'])
const map = ref(null)
const message = ref('')
const busy = ref(false)
const outsideArea = ref(false)
let verified = ''
let lookup = 0
const building = address => address.split(',').slice(0,3).map(part=>part.trim()).join(', ')
watch(()=>building(props.modelValue),address=>{
  if(address===verified)return
  verified=''
  ++lookup
  busy.value=false
  message.value=''
  emit('district','')
  emit('unavailable',false)
})
async function search() {
  if (!isCompleteAddress(props.modelValue)) {
    message.value = 'Укажите город, улицу и номер дома через запятую.'
    return false
  }
  if (!checkCity()) return false
  const address = building(props.modelValue)
  if(address===verified)return true
  return locate({address},false)
}
function checkCity() {
  if (isMoscowAddress(props.modelValue)) return true
  emit('district','')
  emit('unavailable',false)
  outsideArea.value = true
  message.value = 'Выезд доступен только по Москве.'
  return false
}
async function locate(input, fromMap) {
  const operation = ++lookup
  busy.value=true
  if (fromMap) {
    verified=''
    emit('district','')
    emit('unavailable',false)
  }
  message.value = 'Проверяем адрес…'
  try {
    const result = await api('/geocoding',{method:'POST',body:input})
    if(operation!==lookup)return false
    verified=fromMap?result.address:input.address
    if(fromMap)emit('update:modelValue',result.address)
    emit('district',result.district)
    emit('unavailable',false)
    map.value?.showAddress(result,!fromMap)
    message.value=fromMap?'Подставлен ближайший дом. Проверьте номер и добавьте квартиру при необходимости.':'Адрес найден, зона обслуживания определена.'
    return true
  } catch(error) {
    if(operation!==lookup)return false
    const outside = error.code === 'OUTSIDE_SERVICE_AREA'
    if (fromMap || outside) {
      verified=''
      emit('update:modelValue','')
    }
    if (outside) outsideArea.value=true
    emit('district','')
    emit('unavailable',error.status!==422)
    message.value=error.status===422?error.message:'Сервис проверки адресов недоступен. Укажите зону вручную.'
    return false
  } finally {
    if(operation===lookup)busy.value=false
  }
}
function choose([latitude,longitude]) {
  return locate({latitude,longitude},true)
}
defineExpose({search,busy,checkCity})
</script>

<template>
  <section class="grid min-w-0 gap-3" aria-label="Выбор адреса на карте">
    <h3 class="flex items-center gap-2 text-sm font-semibold"><SvgIcon name="mapPin" :size="18" class="text-brand"/>Место приезда мастера</h3>
    <YandexMap ref="map" @point="choose"/>
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" :loading="busy" @click="search">Проверить адрес на карте</Button>
      <p class="text-xs text-muted" role="status">{{ message || 'Нажмите на карте рядом с домом или введите адрес вручную.' }}</p>
    </div>
    <Modal v-model="outsideArea" title="Выезд только по Москве" description="Выберите другой адрес в Москве или привезите устройство в точку приёма." size="sm" compact>
      <template #icon>
        <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand" aria-hidden="true">
          <SvgIcon name="mapPin" :size="21"/>
        </span>
      </template>
      <template #footer><Button variant="primary" @click="outsideArea=false">Понятно</Button></template>
    </Modal>
  </section>
</template>
