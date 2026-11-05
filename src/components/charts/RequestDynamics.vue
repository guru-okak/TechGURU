<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
const props = defineProps({ series: { type: Array, default: () => [] } })
const selected = ref(null)
const container = ref(null), width = ref(760)
let observer
onMounted(() => { observer = new ResizeObserver(entries => { width.value = Math.max(260, entries[0].contentRect.width) }); observer.observe(container.value) })
onBeforeUnmount(() => observer?.disconnect())
const max = computed(() => Math.max(4, Math.ceil(Math.max(0, ...props.series.map(s => s.value)) / 4) * 4))
const points = computed(() => props.series.map((s, i) => ({ ...s, x: 44 + i / Math.max(1, props.series.length - 1) * (width.value - 64), y: 222 - s.value / max.value * 190 })))
const line = computed(() => points.value.map((p,i)=>{if(!i)return `M${p.x},${p.y}`;const prev=points.value[i-1],mid=(prev.x+p.x)/2;return `C${mid},${prev.y} ${mid},${p.y} ${p.x},${p.y}`}).join(' '))
const dailyAverage=computed(()=>props.series.length?props.series.reduce((sum,s)=>sum+s.value,0)/props.series.length:0)
const peak=computed(()=>points.value.reduce((best,p)=>p.value>best.value?p:best,{value:-1}))
const area = computed(() => line.value ? `${line.value} L${width.value - 20},222 L44,222 Z` : '')
const active = computed(() => points.value[selected.value] ?? null)
function select(event) { const rect = event.currentTarget.getBoundingClientRect(); selected.value = Math.max(0, Math.min(points.value.length - 1, Math.round(((event.clientX - rect.left) / rect.width * width.value - 44) / (width.value - 64) * (points.value.length - 1)))) }
</script>
<template>
  <div ref="container" class="relative mt-4" tabindex="0" role="img" :aria-label="`Динамика заявок по дням. Всего ${series.reduce((s, d) => s + d.value, 0)}. Стрелки влево и вправо — просмотр дней.`" @keydown.right.prevent="selected = Math.min(series.length - 1, (selected ?? -1) + 1)" @keydown.left.prevent="selected = Math.max(0, (selected ?? series.length) - 1)" @blur="selected = null">
    <div class="chart-insights"><div><span>В среднем за день</span><strong>{{dailyAverage.toFixed(1).replace('.',',')}} <small>заявки</small></strong></div><div><span>Самый активный день</span><strong>{{peak.value<0?'—':peak.value}} <small>{{peak.label}}</small></strong></div></div>
    <svg :viewBox="`0 0 ${width} 265`" class="h-[265px] w-full overflow-visible" @pointermove="select" @pointerleave="selected = null" aria-hidden="true">
      <defs><linearGradient id="request-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--blue)" stop-opacity=".34"/><stop offset="100%" stop-color="var(--blue)" stop-opacity=".01"/></linearGradient></defs>
      <g v-for="i in 5" :key="i"><line x1="44" :x2="width - 20" :y1="222 - (i - 1) * 47.5" :y2="222 - (i - 1) * 47.5" stroke="var(--border)" stroke-dasharray="4 5"/><text x="30" :y="226 - (i - 1) * 47.5" text-anchor="end" fill="var(--muted)" font-size="11">{{ Math.round((i - 1) * max / 4) }}</text></g>
      <line x1="44" :x2="width-20" :y1="222-dailyAverage/max*190" :y2="222-dailyAverage/max*190" stroke="var(--purple)" stroke-opacity=".6" stroke-dasharray="3 6"/>
      <path :key="'a' + line" :d="area" fill="url(#request-area)" class="area"/><path :key="line" :d="line" fill="none" stroke="var(--blue)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" class="draw"/>
      <template v-for="(p, i) in points" :key="i"><text v-if="i === 0 || i === points.length - 1 || i % Math.ceil(points.length / (width < 450 ? 3 : 6)) === 0" :x="p.x" y="251" :text-anchor="i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'" fill="var(--muted)" font-size="11">{{ p.label }}</text></template>
      <circle v-if="peak.x" :cx="peak.x" :cy="peak.y" r="5" fill="var(--surface)" stroke="var(--blue)" stroke-width="3"/>
      <g v-if="active"><line :x1="active.x" :x2="active.x" y1="28" y2="222" stroke="var(--blue)" stroke-dasharray="4 4"/><circle :cx="active.x" :cy="active.y" r="6" fill="var(--surface)" stroke="var(--blue)" stroke-width="3"/></g>
    </svg>
    <div v-if="active" class="pointer-events-none absolute right-3 top-0 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-card"><span class="text-muted">{{ active.label }}</span><strong class="ml-3">{{ active.value }} заявок</strong></div>
  </div>
</template>
<style scoped>.chart-insights{display:flex;gap:32px;margin:22px 0 6px}.chart-insights>div{display:grid;gap:7px}.chart-insights span{font-size:12px;color:var(--muted)}.chart-insights strong{font-size:25px;letter-spacing:-.04em}.chart-insights small{font-size:12px;font-weight:400;color:var(--muted);letter-spacing:0}@media(max-width:450px){.chart-insights{gap:16px}.chart-insights strong{font-size:22px}}.draw,.area{transition:opacity .3s}@keyframes draw{from{stroke-dashoffset:1}}@keyframes appear{from{opacity:0}}@media(prefers-reduced-motion:reduce){.draw,.area{animation:none}}</style>
