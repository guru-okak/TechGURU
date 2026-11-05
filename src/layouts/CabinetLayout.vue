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

</style>


