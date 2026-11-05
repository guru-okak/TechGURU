<script setup>
import { computed } from 'vue'
import Badge from './Badge.vue'
import { statusLabel, statusTone } from '../../config/statuses'

const props = defineProps({
  // Принимает код статуса ('in_progress') или русскую подпись ('В работе').
  status: { type: String, required: true },
})

const tone = computed(() => statusTone(props.status))
const label = computed(() => statusLabel(props.status))
</script>

<template>
  <Badge :tone="tone" class="shrink-0">{{ label }}</Badge>
</template>
