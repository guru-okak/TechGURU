<script setup>
import { computed } from 'vue'
import Button from './ui/Button.vue'
import Card from './ui/Card.vue'
import StatusBadge from './ui/StatusBadge.vue'
import SvgIcon from './ui/SvgIcon.vue'
import DeviceArt from './illustrations/DeviceArt.vue'
import { statusTone } from '../config/statuses'

const props = defineProps({
  number: { type: [Number, String], required: true },
  device: { type: String, required: true },
  icon: { type: String, default: 'laptop' },
  status: { type: String, required: true },
  to: { type: [String, Object], default: null },
  actionLabel: { type: String, default: 'Подробнее' },
})

defineEmits(['action'])

const TONE_BAR = {
  green: 'bg-ok',
  blue: 'bg-brand',
  amber: 'bg-warn',
  orange: 'bg-orange',
  purple: 'bg-accent',
  gray: 'bg-muted',
  red: 'bg-danger',
}

const barClass = computed(() => TONE_BAR[statusTone(props.status)] ?? TONE_BAR.gray)
</script>

<template>
  <Card
    as="article"
    padding="sm"
    class="request-card group flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center"
  >
    <div class="flex min-w-0 flex-1 items-stretch gap-3">
      <span class="w-1.5 shrink-0 rounded-full" :class="barClass"></span>

      <span class="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface2 p-1.5">
        <DeviceArt :name="icon" />
      </span>

      <div class="min-w-0 flex-1">
        <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <span class="shrink-0 text-xs font-semibold text-brand">#{{ number }}</span>
          <strong class="min-w-0 truncate text-sm font-semibold" :title="device">
            {{ device }}
          </strong>
        </div>
        <slot />
      </div>
    </div>

    <div class="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:justify-end sm:gap-2.5">
      <div class="flex flex-col items-start gap-1 sm:items-end">
        <StatusBadge :status="status" class="whitespace-nowrap" />
        <slot name="badge-extra" />
      </div>

      <Button
        v-if="actionLabel"
        :to="to"
        size="md"
        variant="primary"
        class="shrink-0"
        @click="$emit('action')"
      >
        {{ actionLabel }}
        <template #iconRight><SvgIcon name="arrowRight" :size="15" /></template>
      </Button>

      <slot name="actions" />
    </div>
  </Card>
</template>

<style scoped>
.request-card {
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.request-card:hover {
  border-color: color-mix(in srgb, var(--blue) 40%, var(--border));
  background: color-mix(in srgb, var(--surface2) 35%, var(--surface));
  box-shadow: 0 8px 24px -18px color-mix(in srgb, var(--blue) 45%, transparent);
}

.request-card:focus-within {
  border-color: color-mix(in srgb, var(--blue) 45%, var(--border));
}

@media (prefers-reduced-motion: reduce) {
  .request-card {
    transition: none;
  }
}
</style>
