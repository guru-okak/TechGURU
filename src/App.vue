<script setup>
import { useSiteMotion } from './composables/useSiteMotion'
import { useTheme } from './composables/useTheme'
import {connectionError} from './api/client'
function retryConnection(){location.reload()}

// Гарантируем применение темы при старте приложения.
useTheme()
useSiteMotion()
</script>

<template>
  <section v-if="connectionError" class="m-8 rounded-xl border border-line bg-surface p-8 text-center" role="alert"><h1 class="text-xl font-bold">Не удалось связаться с сервисом</h1><p class="my-4 text-muted">Проверьте соединение и повторите загрузку.</p><button class="rounded-lg bg-brand px-5 py-3 text-white" @click="retryConnection">Повторить загрузку</button></section>
  <router-view />
</template>
