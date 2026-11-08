<script setup>
import BrandLoader from './components/ui/BrandLoader.vue'
import {navigationBusy} from './composables/navigationProgress'
import { useSiteMotion } from './composables/useSiteMotion'
import { useTheme } from './composables/useTheme'
import {connectionError} from './api/client'
function retryConnection(){location.reload()}

// Гарантируем применение темы при старте приложения.
useTheme()
useSiteMotion()
</script>

<template>
  <Transition name="fade"><div v-if="navigationBusy" class="navigation-loader"><BrandLoader class="page-loader" label="Открываем страницу…" /></div></Transition>
  <section v-if="connectionError" class="m-8 rounded-xl border border-line bg-surface p-8 text-center" role="alert"><h1 class="text-xl font-bold">Не удалось связаться с сервисом</h1><p class="my-4 text-muted">Проверьте соединение и повторите загрузку.</p><button class="rounded-lg bg-brand px-5 py-3 text-white" @click="retryConnection">Повторить загрузку</button></section>
  <router-view />
</template>

<style>
.navigation-loader{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:24px;background:var(--bg);border:0;border-radius:0;box-shadow:none}
.navigation-loader .page-loader{padding:0;gap:24px;max-width:100%}
.navigation-loader .page-loader .loader-orbit{--uib-size:100px;height:48px}
.navigation-loader .page-loader .brand-loader-copy{gap:10px}
.navigation-loader .page-loader .brand-loader-copy strong{font-size:30px}
.navigation-loader .page-loader .brand-loader-copy>span{font-size:14px;color:var(--muted)}
@media(max-width:480px){.navigation-loader .page-loader .loader-orbit{--uib-size:84px;height:42px}.navigation-loader .page-loader .brand-loader-copy strong{font-size:26px}}
</style>
