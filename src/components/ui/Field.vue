<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
})
</script>

<template>
  <div class="min-w-0">
    <label v-if="label" :for="id" class="mb-1.5 block text-[13px] font-semibold text-content">
      {{ label }}
      <span v-if="required" class="text-danger" aria-hidden="true">*</span>
    </label>

    <slot />

    <p v-if="error" :id="`${id}-error`" class="mt-1 text-[11px] font-medium text-danger">
      {{ error }}
    </p>
    <p v-else-if="hint" :id="`${id}-hint`" class="mt-1 text-[11px] text-muted">
      {{ hint }}
    </p>
  </div>
</template>
