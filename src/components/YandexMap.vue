<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  center: { type: Array, default: () => [55.751244, 37.618423] },
  zoom: { type: Number, default: 14 },
})

const emit = defineEmits(['point'])

// Ключ берём из .env (VITE_YANDEX_MAPS_API_KEY). Можно передать и пропом.
const API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || ''

const container = ref(null)
const state = ref(API_KEY ? 'loading' : 'no-key') // loading | ready | no-key | error

let ymapsApi
let map
let placemark
let lookup = 0
let disposed = false

function loadYandexApi(key) {
  return new Promise((resolve, reject) => {
    if (window.ymaps?.Map) return resolve(window.ymaps)

    const existing = document.getElementById('yandex-maps-api')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.ymaps))
      existing.addEventListener('error', () => reject(new Error('yandex load error')))
      return
    }

    const script = document.createElement('script')
    script.id = 'yandex-maps-api'
    script.async = true
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${key}&lang=ru_RU`
    script.onload = () => resolve(window.ymaps)
    script.onerror = () => reject(new Error('yandex load error'))
    document.head.appendChild(script)
  })
}

function showAddress({ latitude, longitude }, center = false) {
  const coords = [latitude, longitude]
  placemark?.geometry.setCoordinates(coords)
  if (center) map?.setCenter(coords, props.zoom, { duration: 300 })
}

onMounted(async () => {
  if (!API_KEY) return
  try {
    ymapsApi = await loadYandexApi(API_KEY)
    await ymapsApi.ready()
    if (!disposed) {
      map = new ymapsApi.Map(
        container.value,
        {
          center: props.center,
          zoom: props.zoom,
          controls: ['zoomControl', 'geolocationControl'],
        },
        { suppressMapOpenBlock: true },
      )

      placemark = new ymapsApi.Placemark(
        props.center,
        {},
        { preset: 'islands#blueIcon', draggable: true },
      )
      map.geoObjects.add(placemark)

      placemark.events.add('dragend', () =>
        emit('point', placemark.geometry.getCoordinates()),
      )
      map.events.add('click', (event) => {
        const coords = event.get('coords')
        placemark.geometry.setCoordinates(coords)
        emit('point', coords)
      })

      state.value = 'ready'
      emit('ready')
    }
  } catch (e) {
    state.value = 'error'
  }
})

onBeforeUnmount(() => {
  disposed = true
  map?.destroy()
  map = undefined
})

defineExpose({ showAddress })
</script>

<template>
  <div class="relative overflow-hidden rounded-xl border border-line">
    <div ref="container" class="h-[300px] w-full bg-surface2"></div>

    <div
      v-if="state !== 'ready'"
      class="absolute inset-0 grid place-items-center bg-surface2/85 p-6 text-center"
    >
      <div class="max-w-xs text-xs text-muted">
        <template v-if="state === 'loading'">Загрузка карты…</template>
        <template v-else-if="state === 'no-key'">
          Карта недоступна. Введите адрес вручную.
        </template>
        <template v-else>
          Не удалось загрузить карту. Введите адрес вручную.
        </template>
      </div>
    </div>
  </div>
</template>
