<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import Card from './Card.vue'
import SvgIcon from './SvgIcon.vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: Number, default: null },
  display: { type: String, default: null },
  suffix: { type: String, default: '' },
  trend: { type: String, default: '' },
  trendUp: { type: Boolean, default: true },
  sub: { type: String, default: '' },
  // Опциональная иконка в цветной плитке (как в кабинете мастера).
  icon: { type: String, default: '' },
  tone: { type: String, default: 'blue' }, // blue | green | amber | orange | red | purple
})

const TONES = {
  blue: 'bg-brand/10 text-brand',
  green: 'bg-ok/15 text-ok',
  amber: 'bg-warn/15 text-warn',
  orange: 'bg-orange/15 text-orange',
  red: 'bg-danger/15 text-danger',
  purple: 'bg-accent/15 text-accent',
}

const toneClass = computed(() => TONES[props.tone] ?? TONES.blue)

const shown = ref(props.display ? null : 0)

function animate() {
  if (props.display != null || props.value == null) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    shown.value = props.value
    return
  }
  const start = performance.now()
  const duration = 1250
  const target = props.value
  function tick(now) {
    const progress = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    shown.value = Math.round(target * eased)
    if (progress < 1) requestAnimationFrame(tick)
    else shown.value = target
  }
  requestAnimationFrame(tick)
}

onMounted(animate)
watch(() => props.value, animate)
</script>

<template>
  <Card as="article" padding="md" hover>
    <div class="flex items-center gap-4">
      <span
        v-if="icon"
        class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
        :class="toneClass"
      >
        <SvgIcon :name="icon" :size="24" />
      </span>
      <div class="min-w-0 flex-1">
        <div class="text-[13px] text-muted">{{ label }}</div>
        <div class="mt-2 text-3xl font-extrabold tracking-tight">
          <template v-if="display">{{ display }}</template>
          <template v-else>
            {{ shown }}<span v-if="suffix" class="ml-1 text-[15px] font-bold">{{ suffix }}</span>
          </template>
        </div>
        <div class="mt-1 text-[11px] text-muted">
          <span class="font-semibold" :class="trendUp ? 'text-ok' : 'text-danger'">{{ trend }}</span>
          {{ sub }}
        </div>
      </div>
    </div>
  </Card>
</template>
