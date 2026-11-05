<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps({
  // Легаси-режим: доля выездных заявок (проценты).
  onsite: { type: Number, default: 48 },
  total: { type: Number, default: 248 },
  // Новый режим: произвольные сегменты [{ value, color }].
  segments: { type: Array, default: null },
  label: { type: String, default: 'заявок' },
  // sm — компактный (для узких колонок), md — базовый.
  size: { type: String, default: 'md' },
})

const SIZES = {
  sm: { outer: 'h-[120px] w-[120px]', inner: 'h-[72px] w-[72px]', value: 'text-xl', label: 'text-[10px]' },
  md: { outer: 'h-40 w-40', inner: 'h-24 w-24', value: 'text-2xl', label: 'text-[11px]' },
}

const dims = computed(() => SIZES[props.size] ?? SIZES.md)

const donut = ref(null)

function paintLegacy(deg) {
  const el = donut.value
  if (!el) return
  const blue = 'var(--blue)'
  const green = 'var(--green)'
  el.style.background = `conic-gradient(${blue} 0deg ${deg}deg, ${green} ${deg}deg 360deg)`
}

function paintSegments() {
  const el = donut.value
  if (!el) return
  const segs = (props.segments ?? []).filter((s) => s.value > 0)
  const sum = segs.reduce((acc, s) => acc + s.value, 0)
  if (!sum) {
    el.style.background = 'conic-gradient(var(--surface2) 0deg 360deg)'
    return
  }
  let acc = 0
  const stops = segs.map((s) => {
    const from = (acc / sum) * 360
    acc += s.value
    const to = (acc / sum) * 360
    return `${s.color} ${from}deg ${to}deg`
  })
  el.style.background = `conic-gradient(${stops.join(', ')})`
}

function animateLegacy() {
  const el = donut.value
  if (!el) return
  const targetDeg = (props.onsite / 100) * 360
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    paintLegacy(targetDeg)
    return
  }
  const start = performance.now()
  const duration = 1350
  function tick(now) {
    const progress = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    paintLegacy(targetDeg * eased)
    if (progress < 1) requestAnimationFrame(tick)
    else paintLegacy(targetDeg)
  }
  requestAnimationFrame(tick)
}

function render() {
  if (props.segments) paintSegments()
  else animateLegacy()
}

onMounted(render)
watch(() => props.segments, () => props.segments && paintSegments(), { deep: true })
</script>

<template>
  <div class="grid shrink-0 place-items-center">
    <div ref="donut" class="grid place-items-center rounded-full" :class="dims.outer">
      <div class="grid place-items-center rounded-full bg-surface" :class="dims.inner">
        <div class="text-center leading-tight">
          <div class="font-extrabold" :class="dims.value">{{ total }}</div>
          <small class="text-muted" :class="dims.label">{{ label }}</small>
        </div>
      </div>
    </div>
  </div>
</template>
