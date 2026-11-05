<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'text' }, // text | rect | circle
  width: { type: [String, Number], default: '' },
  height: { type: [String, Number], default: '' },
  lines: { type: Number, default: 1 },
  rounded: { type: String, default: '' },
})

function toSize(value) {
  if (value === '' || value == null) return ''
  return typeof value === 'number' ? `${value}px` : value
}

const rootStyle = computed(() => ({
  width: toSize(props.width),
  height: props.variant === 'text' ? '' : toSize(props.height),
}))

const lineStyle = computed(() => ({
  height: props.variant === 'text' ? toSize(props.height) || '0.75rem' : '100%',
  borderRadius:
    props.rounded ||
    (props.variant === 'circle' ? '9999px' : props.variant === 'rect' ? '12px' : '6px'),
}))
</script>

<template>
  <div
    class="grid gap-2"
    :style="rootStyle"
    aria-hidden="true"
    role="presentation"
  >
    <template v-if="variant === 'text' && lines > 1">
      <span
        v-for="i in lines"
        :key="i"
        class="skeleton-shimmer block bg-surface2"
        :style="{
          ...lineStyle,
          width: i === lines ? '70%' : '100%',
        }"
      ></span>
    </template>
    <span
      v-else
      class="skeleton-shimmer block bg-surface2"
      :class="variant === 'circle' ? 'aspect-square' : ''"
      :style="lineStyle"
    ></span>
  </div>
</template>

<style scoped>
.skeleton-shimmer {
  position: relative;
  overflow: hidden;
}
.skeleton-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--surface) 55%, transparent),
    transparent
  );
  animation: skeleton-wave 1.4s ease-in-out infinite;
}

@keyframes skeleton-wave {
  100% {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-shimmer::after {
    animation: none;
  }
}
</style>
