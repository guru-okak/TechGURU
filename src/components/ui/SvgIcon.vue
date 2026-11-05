<script setup>
import { computed } from 'vue'
import { icons } from '../../config/icons'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
})

const markup = computed(() => icons[props.name] ?? '')
</script>

<template>
  <span
    class="inline-flex shrink-0 [&>svg]:h-full [&>svg]:w-full"
    :style="{ width: size + 'px', height: size + 'px' }"
    aria-hidden="true"
    v-html="markup"
  ></span>
</template>
