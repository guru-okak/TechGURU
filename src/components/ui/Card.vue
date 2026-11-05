<script setup>
import { computed } from 'vue'

const props = defineProps({
  as: { type: String, default: 'div' }, // div | article | section | button | a
  padding: { type: String, default: 'md' }, // none | sm | md | lg
  hover: { type: Boolean, default: false },
  interactive: { type: Boolean, default: false },
  bordered: { type: Boolean, default: true },
  // bare — без фона/тени/рамки: для карточек с собственным фоном (градиенты, фото).
  bare: { type: Boolean, default: false },
  // accent — тонкая синяя рамка (вместо нейтральной).
  accent: { type: Boolean, default: false },
  // glow — мягкое синее свечение при наведении.
  glow: { type: Boolean, default: false },
})

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

const paddingClass = computed(() => PADDING[props.padding] ?? PADDING.md)

const borderClass = computed(() => {
  if (props.bare || !props.bordered) return ''
  return props.accent ? 'border border-brand/25' : 'border border-line'
})

const classes = computed(() => [
  'min-w-0 rounded-2xl',
  paddingClass.value,
  props.bare ? '' : 'card-surface',
  borderClass.value,
  props.glow ? 'card-glow' : '',
  props.hover ? 'card-lift' : '',
  props.interactive ? 'text-left' : '',
])
</script>

<template>
  <component
    :is="as"
    :class="classes"
    :type="as === 'button' ? 'button' : undefined"
  >
    <header v-if="$slots.header" class="mb-4 flex flex-wrap items-start justify-between gap-3">
      <slot name="header" />
    </header>
    <slot />
    <footer v-if="$slots.footer" class="mt-4 border-t border-line pt-4">
      <slot name="footer" />
    </footer>
  </component>
</template>

<style scoped>
.card-surface {
  background: var(--surface);
  box-shadow: var(--shadow);
}

.card-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease,
    background-color var(--motion);
}

.card-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lift);
  border-color: color-mix(in srgb, var(--blue) 30%, var(--border));
}

.card-lift:active {
  transform: translateY(-1px) scale(0.995);
}

.card-glow {
  transition: transform 0.2s ease, box-shadow 0.25s ease, border-color 0.2s ease;
}

.card-glow:hover {
  transform: translateY(-3px);
  border-color: color-mix(in srgb, var(--blue) 55%, var(--border));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--blue) 28%, transparent),
    0 14px 34px -14px color-mix(in srgb, var(--blue) 55%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .card-lift,
  .card-lift:hover,
  .card-lift:active,
  .card-glow,
  .card-glow:hover {
    transition: none;
    transform: none;
  }
}
</style>
