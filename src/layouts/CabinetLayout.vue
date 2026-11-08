<script setup>
import { ref, watch,onMounted,onBeforeUnmount } from 'vue'
import '../assets/client-shell.css'
import '../assets/master-shell.css'
import '../assets/admin-shell.css'
import { useRoute,useRouter } from 'vue-router'
import { useSession } from '../composables/useSession'
import Sidebar from '../components/layout/Sidebar.vue'
import Header from '../components/layout/Header.vue'
import MobileNav from '../components/layout/MobileNav.vue'
import { toasts } from '../composables/useToast'

import {refreshWorkspace,clearWorkspace} from '../api/workspace'
const cabinetRouter=useRouter()
let refreshTimer
onMounted(()=>{refreshTimer=setInterval(()=>{if(document.visibilityState==='visible')refreshWorkspace().catch(error=>{if(error.status===401){useSession().accept(null);clearWorkspace();cabinetRouter.push('/login')}})},60000)})
onBeforeUnmount(()=>clearInterval(refreshTimer))
const route = useRoute()
const { role } = useSession()
const sidebarOpen = ref(false)

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  },
)
</script>

<template>
  <div class="min-h-screen bg-app text-content" :class="{ 'client-cabinet': role === 'client', 'master-cabinet': role === 'master', 'admin-cabinet': role === 'admin' }">
    <!-- Левое меню: фиксируется к вьюпорту на десктопе (position: fixed),
         поэтому при скролле не двигается вообще. Контент сдвигается отступом. -->
    <Sidebar :open="sidebarOpen" @close="sidebarOpen = false" />

    <!-- Контентная область -->
    <div class="min-w-0 lg:pl-[248px]">
      <Header @menu="sidebarOpen = true" />
      <main class="mx-auto w-full max-w-[1600px] px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
        <footer class="cabinet-support"><div><strong>Нужна помощь?</strong><p>Напишите в сервис — поможем с обращением.</p></div><a href="mailto:guruzavoz@gmail.com">guruzavoz@gmail.com <span aria-hidden="true">↗</span></a></footer>
      </main>
    </div>

    <!-- Оверлей для мобильного меню -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
      @click="sidebarOpen = false"
    ></div>

    <MobileNav />

    <!-- Тост-уведомления -->
    <div class="pointer-events-none fixed bottom-24 right-4 z-[60] flex flex-col gap-2 lg:bottom-6">
      <div v-for="t in toasts" :key="t.id" class="toast">{{ t.message }}</div>
    </div>
  </div>
</template>

<style>
.cabinet-support{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-top:36px;padding:24px;border:1px solid var(--border);border-radius:18px;background:var(--surface)}.cabinet-support p{margin-top:6px;color:var(--muted);font-size:14px}.cabinet-support a{color:var(--blue);overflow-wrap:anywhere;align-self:center}
@media(max-width:650px){.master-page-intro,.master-page-intro-large{display:flex!important;flex-direction:column!important;align-items:stretch!important;min-height:0!important}.master-page-intro .master-intro-photo{position:relative!important;inset:auto!important;order:2;height:150px;opacity:1!important;width:100%!important}.master-page-intro .master-intro-photo:after{display:none!important}.master-page-intro .master-intro-photo img{width:100%;height:100%;object-fit:cover}.master-page-intro .master-intro-copy{max-width:100%!important;width:100%;padding:24px!important;position:relative;z-index:1;background:var(--surface)}.master-page-intro .master-intro-copy h1{font-size:28px!important;overflow-wrap:anywhere}.master-page-intro .master-intro-copy>p{color:var(--muted);opacity:1}.client-cabinet main,.master-cabinet main,.admin-cabinet main{padding-bottom:calc(110px + env(safe-area-inset-bottom))}.new-request-main,.new-form-fields,.new-form-fields>*,.photo-links{min-width:0;max-width:100%}.new-form-fields input,.new-form-fields textarea{max-width:100%;min-width:0}.new-hint{overflow-wrap:anywhere}.new-submit-actions{display:grid!important;grid-template-columns:1fr!important}.new-submit-actions>button{width:100%;justify-content:center}.photo-links input[type=file]{width:100%;font-size:13px}.cabinet-support{padding:20px}}


@media(max-width:650px){.client-welcome{display:flex!important;flex-direction:column!important;min-height:0!important;padding:0!important}.client-welcome .welcome-photo{position:relative!important;inset:auto!important;order:2;height:180px;width:100%;opacity:1!important}.client-welcome .welcome-photo:after{display:none!important}.client-welcome .welcome-photo img{height:100%;width:100%;object-fit:cover}.client-welcome .welcome-copy{position:relative!important;max-width:100%!important;padding:24px!important;background:var(--surface)}.client-welcome .welcome-copy h1{font-size:34px!important}.client-welcome .welcome-notice{position:relative!important;inset:auto!important;order:3;margin:16px!important}.welcome-actions{display:flex!important;flex-wrap:wrap!important;gap:10px}.welcome-actions>a{flex:1;white-space:normal}.client-channel{min-width:0}}
</style>


