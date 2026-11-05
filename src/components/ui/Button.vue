<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  variant: { type: String, default: 'secondary' }, // primary | secondary | outline | danger | ghost | inverse
  size: { type: String, default: 'md' }, // sm | md | lg | icon
  type: { type: String, default: 'button' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  to: { type: [String, Object], default: null },
  href: { type: String, default: '' },
})

const VARIANTS = {
  primary:
    'border-brand bg-brand text-white hover:bg-brand/90 hover:shadow-[0_6px_18px_color-mix(in_srgb,var(--blue)_35%,transparent)]',
  secondary:
    'border-line bg-surface text-content hover:border-muted/50 hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)]',
  outline:
    'border-line bg-transparent text-content hover:border-brand/50 hover:bg-brand/5 hover:text-brand',
  danger:
    'border-danger bg-danger text-white hover:bg-danger/90 hover:shadow-[0_6px_18px_color-mix(in_srgb,var(--red)_30%,transparent)]',
  ghost:
    'border-transparent bg-transparent text-muted hover:bg-surface2 hover:text-content',
  inverse:
    'border-white/30 bg-white/15 text-white backdrop-blur-sm hover:bg-white/25',
  outlineInverse:
    'border-white/40 bg-white/5 text-white backdrop-blur-sm hover:border-white/60 hover:bg-white/15',
}

const SIZES = {
  sm: 'gap-1.5 px-3 py-1.5 text-[13px]',
  md: 'gap-2 px-3.5 py-2.5 text-sm',
  lg: 'gap-2 px-5 py-3 text-[15px]',
  icon: 'h-10 w-10 p-0',
}

const isDisabled = computed(() => props.disabled || props.loading)

const classes = computed(() => [
  'btn-base',
  VARIANTS[props.variant] ?? VARIANTS.secondary,
  SIZES[props.size] ?? SIZES.md,
  props.block ? 'w-full' : '',
])

const tag = computed(() => {
  if (props.to) return RouterLink
  if (props.href) return 'a'
  return 'button'
})

const attrs = computed(() => {
  if (props.to) return { to: props.to, 'aria-disabled': isDisabled.value || undefined }
  if (props.href) return { href: isDisabled.value ? undefined : props.href }
  return { type: props.type, disabled: isDisabled.value, 'aria-busy': props.loading || undefined }
})
</script>

<template>
  <component :is="tag" :class="classes" v-bind="attrs">
    <span
      v-if="loading"
      class="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    ></span>
    <slot v-else name="iconLeft" />
    <slot />
    <slot name="iconRight" />
  </component>
</template>

<style scoped>
.btn-base {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-width: 1px;
  border-radius: 10px;
  font-weight: 650;
  white-space: nowrap;
  transition: background-color 0.18s ease, border-color 0.18s ease,
    color 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease;
}
.btn-base:active:not(:disabled):not([aria-disabled='true']) {
  transform: scale(0.97);
}
.btn-base:disabled,
.btn-base[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.55;
  box-shadow: none;
}
</style>
