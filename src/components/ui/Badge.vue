<script setup>
import { computed } from 'vue'

const props = defineProps({
  tone: { type: String, default: 'gray' }, // gray | blue | green | amber | purple | orange | red
  size: { type: String, default: 'sm' }, // sm | md
  dot: { type: Boolean, default: true },
})

const TONES = {
  gray: 'text-muted bg-muted/15',
  blue: 'text-brand bg-brand/15',
  green: 'text-ok bg-ok/15',
  amber: 'text-warn bg-warn/15',
  purple: 'text-accent bg-accent/15',
  orange: 'text-orange bg-orange/15',
  red: 'text-danger bg-danger/15',
}

const toneClass = computed(() => TONES[props.tone] ?? TONES.gray)

const sizeClass = computed(() =>
  props.size === 'md'
    ? 'gap-1.5 px-2.5 py-1 text-[11px]'
    : 'gap-1.5 px-2 py-[3px] text-[10px]',
)
</script>

<template>
  <span
    class="inline-flex max-w-full items-center rounded-md font-bold leading-tight transition-colors"
    :class="[toneClass, sizeClass]"
  >
    <span
      v-if="dot"
      class="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
      aria-hidden="true"
    ></span>
    <span class="min-w-0 overflow-wrap-anywhere"><slot /></span>
  </span>
</template>

<style scoped>
.overflow-wrap-anywhere {
  overflow-wrap: anywhere;
}
</style>
