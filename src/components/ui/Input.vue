<script setup>
import { computed, useAttrs, useId } from 'vue'
import SvgIcon from './SvgIcon.vue'
import Field from './Field.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  type: { type: String, default: 'text' },
  iconLeft: { type: String, default: '' },
  iconRight: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const attrs = useAttrs()
const uid = useId()
const inputId = computed(() => attrs.id || `input-${uid}`)

const sizeClass = computed(() =>
  props.size === 'sm' ? 'py-1.5 text-[13px]' : 'py-2.5 text-sm',
)

// В Chromium (Яндекс.Браузер, Chrome, Edge) поля type="password" получают
// встроенную браузерную кнопку показа пароля и значок менеджера паролей,
// которые накладываются на нашу кнопку-«глаз». Там, где поддерживается
// -webkit-text-security, рисуем обычный text и маскируем его сами.
const canMaskText = computed(
  () =>
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('-webkit-text-security', 'disc'),
)

const isMasked = computed(() => props.type === 'password')
const htmlType = computed(() =>
  isMasked.value && canMaskText.value ? 'text' : props.type,
)
const maskClass = computed(() =>
  isMasked.value && canMaskText.value ? 'is-masked' : '',
)

const describedBy = computed(() => {
  if (props.error) return `${inputId.value}-error`
  if (props.hint) return `${inputId.value}-hint`
  return undefined
})

function onInput(event) {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <Field
    :id="inputId"
    :label="label"
    :hint="hint"
    :error="error"
    :required="required"
  >
    <div class="relative">
      <span
        v-if="iconLeft"
        class="pointer-events-none absolute left-3 top-[calc(50%+2px)] -translate-y-1/2 text-muted"
      >
        <SvgIcon :name="iconLeft" :size="18" />
      </span>
      <input
        :id="inputId"
        v-bind="attrs"
        :type="htmlType"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        class="control-base w-full"
        :class="[
          sizeClass,
          iconLeft ? 'pl-10' : 'pl-3',
          iconRight || $slots.iconRight ? 'pr-12' : 'pr-3',
          maskClass,
          error ? 'is-error' : '',
        ]"
        @input="onInput"
      />
      <span
        v-if="iconRight || $slots.iconRight"
        class="absolute right-1.5 top-1/2 -translate-y-1/2"
        :class="$slots.iconRight ? '' : 'pointer-events-none text-muted'"
      >
        <slot name="iconRight">
          <SvgIcon :name="iconRight" :size="18" />
        </slot>
      </span>
    </div>
  </Field>
</template>

<style scoped>
.control-base {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.is-masked {
  -webkit-text-security: disc;
  text-security: disc;
}
/* Прячем встроенные браузерные украшения полей пароля (Chrome/Edge/IE),
   чтобы не было наложения на нашу кнопку «глаз». */
.control-base::-ms-reveal,
.control-base::-ms-clear {
  display: none;
}
.control-base::-webkit-credentials-auto-fill-button,
.control-base::-webkit-contacts-auto-fill-button {
  visibility: hidden;
  display: none !important;
  pointer-events: none;
}
.control-base::placeholder {
  color: color-mix(in srgb, var(--muted) 75%, transparent);
}
.control-base:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--muted) 40%, var(--border));
}
.control-base:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--blue) 20%, transparent);
}
.control-base.is-error {
  border-color: var(--red);
}
.control-base.is-error:focus {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--red) 20%, transparent);
}
.control-base:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
