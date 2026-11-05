<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: undefined },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="label"
    class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-[3px] transition-colors"
    :class="modelValue ? 'bg-brand' : 'bg-slate-400'"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span
      class="h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200"
      :class="modelValue ? 'translate-x-5' : 'translate-x-0'"
    ></span>
  </button>
</template>
