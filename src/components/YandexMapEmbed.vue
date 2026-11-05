<script setup>
import { computed } from 'vue'

// Встраиваемая карта Яндекс.Карт без API-ключа (виджет map-widget/v1).
// points: [{ lat, lng }] — первая точка используется как центр карты,
// все точки выводятся метками.
const props = defineProps({
  points: { type: Array, default: () => [] },
  zoom: { type: Number, default: 12 },
})

const src = computed(() => {
  const list = props.points.filter((p) => p.lat != null && p.lng != null)
  const center = list[0] ?? { lat: 55.7558, lng: 37.6173 }
  const params = new URLSearchParams()
  params.set('ll', `${center.lng},${center.lat}`)
  params.set('z', String(props.zoom))
  params.set('l', 'map')
  const marks = list.map((p) => `${p.lng},${p.lat},pm2rdm`).join('~')
  if (marks) params.set('pt', marks)
  return `https://yandex.ru/map-widget/v1/?${params.toString()}`
})
</script>

<template>
  <iframe
    :src="src"
    class="h-full w-full border-0"
    title="Карта точек приёма TechGURU"
    loading="lazy"
    allowfullscreen
    referrerpolicy="no-referrer-when-downgrade"
  ></iframe>
</template>
