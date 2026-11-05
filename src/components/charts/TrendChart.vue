<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTheme } from '../../composables/useTheme'

const { isDark } = useTheme()

const periods = [
  { days: 7, label: '7 дней' },
  { days: 30, label: '30 дней' },
  { days: 90, label: '90 дней' },
]

const DATA = {
  7: {
    values: [22, 31, 42, 39, 51, 67, 72],
    labels: ['12 окт', '13 окт', '14 окт', '15 окт', '16 окт', '17 окт', '18 окт'],
  },
  30: {
    values: [96, 120, 112, 138, 151, 147, 168],
    labels: ['19 сен', '24 сен', '29 сен', '4 окт', '9 окт', '14 окт', '18 окт'],
  },
  90: {
    values: [620, 705, 660, 780, 845, 910, 1030],
    labels: ['нач. июл', 'кон. июл', 'сер. авг', 'кон. авг', 'сер. сен', 'нач. окт', '18 окт'],
  },
}

const active = ref(7)
const canvas = ref(null)
let observer

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function draw() {
  const el = canvas.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  const dpr = window.devicePixelRatio || 1
  el.width = rect.width * dpr
  el.height = rect.height * dpr

  const ctx = el.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, rect.width, rect.height)

  const w = rect.width
  const h = rect.height
  const muted = cssVar('--muted') || '#64748b'
  const border = cssVar('--border') || '#e2e8f0'
  const pad = { l: 34, r: 10, t: 12, b: 26 }
  const cw = w - pad.l - pad.r
  const ch = h - pad.t - pad.b

  const { values, labels } = DATA[active.value]
  const max = Math.ceil((Math.max(...values) * 1.15) / 10) * 10

  // Сетка + подписи оси Y
  ctx.font = '10px Inter, system-ui, sans-serif'
  ctx.lineWidth = 1
  ctx.strokeStyle = border
  ctx.fillStyle = muted
  for (let i = 0; i <= 4; i++) {
    const y = pad.t + (ch * i) / 4
    ctx.beginPath()
    ctx.moveTo(pad.l, y)
    ctx.lineTo(w - pad.r, y)
    ctx.stroke()
    ctx.fillText(String(Math.round(max - (max * i) / 4)), 4, y + 3)
  }

  const points = values.map((v, i) => ({
    x: pad.l + (cw * i) / (values.length - 1),
    y: pad.t + ch * (1 - v / max),
  }))

  // Заливка под линией
  const grad = ctx.createLinearGradient(0, pad.t, 0, h - pad.b)
  grad.addColorStop(0, 'rgba(37, 99, 235, 0.27)')
  grad.addColorStop(1, 'rgba(37, 99, 235, 0)')
  ctx.beginPath()
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  ctx.lineTo(points[points.length - 1].x, h - pad.b)
  ctx.lineTo(points[0].x, h - pad.b)
  ctx.closePath()
  ctx.fillStyle = grad
  ctx.fill()

  // Линия
  ctx.beginPath()
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.stroke()

  // Точки
  points.forEach((p) => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
    ctx.fillStyle = '#3b82f6'
    ctx.fill()
  })

  // Подписи оси X
  ctx.fillStyle = muted
  labels.forEach((label, i) => {
    const x = pad.l + (cw * i) / (labels.length - 1)
    ctx.textAlign = i === 0 ? 'left' : i === labels.length - 1 ? 'right' : 'center'
    ctx.fillText(label, x, h - 8)
  })
  ctx.textAlign = 'start'
}

onMounted(async () => {
  await nextTick()
  draw()
  observer = new ResizeObserver(() => draw())
  observer.observe(canvas.value)
})

onBeforeUnmount(() => observer?.disconnect())

watch(active, () => nextTick(draw))
watch(isDark, () => nextTick(draw))
</script>

<template>
  <article class="card min-w-0 p-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold">Динамика заявок</h2>
        <div class="text-xs text-muted">Количество созданных заявок</div>
      </div>
      <div class="inline-flex rounded-lg border border-line p-0.5">
        <button
          v-for="p in periods"
          :key="p.days"
          type="button"
          class="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors"
          :class="active === p.days ? 'bg-brand text-white' : 'text-muted hover:text-content'"
          @click="active = p.days"
        >
          {{ p.label }}
        </button>
      </div>
    </div>
    <div class="mt-4 h-64 w-full">
      <canvas ref="canvas" class="h-full w-full" aria-label="График динамики заявок"></canvas>
    </div>
  </article>
</template>
