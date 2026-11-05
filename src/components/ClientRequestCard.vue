<script setup>
import BaseRequestCard from './BaseRequestCard.vue'

defineProps({
  request: { type: Object, required: true },
})

defineEmits(['open'])
</script>

<template>
  <BaseRequestCard
    :number="request.number"
    :device="request.device"
    :icon="request.icon"
    :status="request.status"
    action-label="Подробнее"
    @action="$emit('open', request)"
  >
    <span class="mt-0.5 block truncate text-xs text-muted">{{ request.description }}</span>
    <span class="mt-1 block text-[11px] text-muted">{{ request.date }}</span>
  </BaseRequestCard>
</template>
