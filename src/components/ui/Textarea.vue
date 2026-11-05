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
  rows: { type: [String, Number], default: 4 },
  iconLeft: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const attrs = useAttrs()
const uid = useId()
const inputId = computed(() => attrs.id || `textarea-${uid}`)

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
        class="pointer-events-none absolute left-3 top-3 text-muted"
      >
        <SvgIcon :name="iconLeft" :size="18" />
      </span>
      <textarea
        :id="inputId"
        v-bind="attrs"
        :value="modelValue"
        :rows="rows"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        class="control-base w-full resize-y text-sm"
        :class="[iconLeft ? 'pl-10' : 'pl-3', 'pr-3', error ? 'is-error' : '']"
        @input="onInput"
      ></textarea>
    </div>
  </Field>
</template>

<style scoped>
.control-base {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  padding-top: 0.6rem;
  padding-bottom: 0.6rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
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
