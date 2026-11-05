<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useSession } from '../../composables/useSession'
import { useNotifications } from '../../composables/useNotifications'
import { useMasterNotifications } from '../../composables/useMasterNotifications'
import { useRequestsFilter } from '../../composables/useRequestsFilter'
import { toast } from '../../composables/useToast'
import { adminNotices } from '../../data/adminOperations'
import SvgIcon from '../ui/SvgIcon.vue'
import UserAvatar from '../ui/UserAvatar.vue'
import Select from '../ui/Select.vue'
import logoLight from '../../assets/Общее/logo_light.png'
import logoDark from '../../assets/Общее/logo_dark.png'

const emit = defineEmits(['menu'])

const route = useRoute()
const router = useRouter()
const { role, current, profiles, login, logout: endSession } = useSession()
const { unreadCount: clientUnread } = useNotifications()
const { unreadCount: masterUnread } = useMasterNotifications()
const { search } = useRequestsFilter()

const unreadCount = computed(() =>
  role.value === 'admin' ? adminNotices.filter(n => !n.is_read).length : role.value === 'master' ? masterUnread.value : clientUnread.value,
)

const dropdownOpen = ref(false)

const roles = computed(() =>
  Object.entries(profiles)
    .filter(([value]) => value !== 'guest')
    .map(([value, p]) => ({ value, label: p.caption })),
)

const pageTitle = computed(() => route.meta.title ?? 'TechGURU')
const showSearch = computed(() => route.name === 'client-requests')

async function switchRole(){await logout()}

function goNotifications() {
  dropdownOpen.value = false
  if (role.value === 'client') router.push('/client/notifications')
  else if (role.value === 'master') router.push('/master/notifications')
  else router.push('/admin/notifications')
}

function goSettings() {
  dropdownOpen.value = false
  if (role.value === 'client') router.push('/client/profile')
  else if (role.value === 'master') router.push('/master/profile')
  else router.push('/admin/profile')
}

async function logout() {
  dropdownOpen.value = false
  await endSession()
  toast('Вы вышли из аккаунта')
  router.push('/login')
}

function onDocumentClick(event) {
  if (!event.target.closest('.profile-wrap')) dropdownOpen.value = false
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onUnmounted(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <header
    class="sticky top-0 z-20 flex h-[76px] items-center justify-between gap-4 border-b border-line bg-surface px-4 sm:px-6 lg:px-8"
  >
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <button
        type="button"
        class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-muted hover:bg-surface2 hover:text-content lg:hidden"
        aria-label="Открыть меню"
        @click="emit('menu')"
      >
        <SvgIcon name="menu" :size="20" />
      </button>

      <!-- Логотип (на мобильных, где нет сайдбара) -->
      <div class="flex items-center lg:hidden">
        <RouterLink to="/" aria-label="TechGURU — на главную сайта"><img :src="logoLight" alt="TechGURU" class="h-10 w-auto dark:hidden"/><img :src="logoDark" alt="" class="hidden h-10 w-auto dark:block"/></RouterLink>
      </div>

      <!-- Заголовок страницы (десктоп) -->
      <h1 class="hidden truncate text-[17px] font-bold lg:block">{{ pageTitle }}</h1>

      <!-- Контекстный поиск на странице «Мои заявки» -->
      <div v-if="showSearch" class="relative hidden max-w-sm flex-1 md:block">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <SvgIcon name="search" :size="18" />
        </span>
        <input
          v-model="search"
          type="search"
          class="control pl-10"
          placeholder="Поиск по заявкам…"
          aria-label="Поиск по заявкам"
        />
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        class="relative grid h-10 w-10 place-items-center rounded-xl border border-line text-muted hover:bg-surface2 hover:text-content"
        aria-label="Уведомления"
        @click="goNotifications"
      >
        <SvgIcon name="bell" :size="19" />
        <span
          v-if="unreadCount"
          class="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
        >
          {{ unreadCount }}
        </span>
      </button>

      <div class="profile-wrap relative">
        <button
          type="button"
          class="flex items-center gap-2.5 rounded-xl px-1.5 py-1 transition-colors hover:bg-surface2"
          :aria-expanded="dropdownOpen"
          @click="dropdownOpen = !dropdownOpen"
        >
          <UserAvatar :size="36"/>
          <span class="hidden text-left leading-tight sm:block">
            <strong class="block text-[13px]">{{ current.name }}</strong>
            <small class="block text-[11px] text-muted">{{ current.caption }}</small>
          </span>
          <SvgIcon name="chevronDown" :size="16" class="hidden text-muted sm:block" />
        </button>

        <div
          v-if="dropdownOpen"
          class="absolute right-0 top-[calc(100%+8px)] w-60 rounded-xl border border-line bg-surface p-3 shadow-card"
        >
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-semibold uppercase tracking-wide text-muted">Профиль</span>
          </div>
          <div class="mb-3 flex items-center gap-2.5">
            <UserAvatar :size="36"/>
            <span class="min-w-0 leading-tight">
              <strong class="block truncate text-sm">{{ current.name }}</strong>
              <small class="block text-[11px] text-muted">{{ current.caption }}</small>
            </span>
          </div>

          <button
            type="button"
            class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-muted hover:bg-surface2 hover:text-content"
            @click="goSettings"
          >
            <SvgIcon name="settings" :size="17" />
            Настройки
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-danger hover:bg-danger/10"
            @click="logout"
          >
            <SvgIcon name="logout" :size="17" />
            Выйти из аккаунта
          </button>

          <div class="mt-2 border-t border-line pt-2">
            <div class="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
              Другой аккаунт
            </div>
            <button class="text-sm text-brand p-2" @click="switchRole">Войти в другой аккаунт</button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
