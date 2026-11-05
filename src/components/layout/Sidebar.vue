<script setup>
import { adminNotices } from '../../data/adminOperations'
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { navigation } from '../../config/navigation'
import { useSession } from '../../composables/useSession'
import { useTheme } from '../../composables/useTheme'
import { useNotifications } from '../../composables/useNotifications'
import { useMasterNotifications } from '../../composables/useMasterNotifications'
import { toast } from '../../composables/useToast'
import SvgIcon from '../ui/SvgIcon.vue'
import logoLight from '../../assets/Общее/logo_light.png'
import logoDark from '../../assets/Общее/logo_dark.png'

defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const route = useRoute()
const router = useRouter()
const { role } = useSession()
const { isDark, toggleTheme } = useTheme()
const { unreadCount: clientUnread } = useNotifications()
const { unreadCount: masterUnread } = useMasterNotifications()

const menu = computed(() => navigation[role.value] ?? navigation.admin)

function badgeFor(item) {
  if (item.badge !== 'notifications') return 0
  return role.value === 'admin' ? adminNotices.filter(n=>!n.is_read).length : role.value === 'master' ? masterUnread.value : clientUnread.value
}

function isActive(item) {
  return item.to && route.path === item.to
}

function handleNav(item) {
  if (item.to) router.push(item.to)
  else toast(`Раздел «${item.label}» добавим на следующем этапе.`)
  emit('close')
}

</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-50 flex w-[248px] shrink-0 flex-col gap-6 border-r border-line bg-sidebar p-4 transition-transform duration-300 lg:z-30 lg:[will-change:transform]"
    :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
  >
    <!-- Бренд -->
    <div class="flex items-center justify-between px-2">
      <RouterLink to="/" aria-label="TechGURU — на главную сайта" class="block rounded-lg focus-visible:outline-2 focus-visible:outline-brand" @click="emit('close')">
        <img :src="logoLight" alt="TechGURU" class="h-12 w-auto dark:hidden"/>
        <img :src="logoDark" alt="" class="hidden h-12 w-auto dark:block"/>
      </RouterLink>
      <button
        type="button"
        class="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface2 hover:text-content lg:hidden"
        aria-label="Закрыть меню"
        @click="emit('close')"
      >
        <SvgIcon name="chevronRight" :size="18" class="rotate-180" />
      </button>
    </div>

    <!-- Навигация -->
    <nav class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <div class="grid gap-1">
        <button
          v-for="item in menu"
          :key="item.label"
          type="button"
          class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors"
          :class="
            isActive(item)
              ? 'bg-brand/15 text-brand shadow-sm'
              : 'text-muted hover:bg-surface2 hover:text-content'
          "
          @click="handleNav(item)"
        >
          <SvgIcon :name="item.icon" :size="19" class="shrink-0" />
          <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
          <span
            v-if="badgeFor(item)"
            class="grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white"
          >
            {{ badgeFor(item) }}
          </span>
        </button>
      </div>
    </nav>

    <!-- Футер: тема + профиль -->
    <div class="border-t border-line pt-3">
      <button
        type="button"
        role="switch"
        :aria-checked="isDark"
        class="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface2 hover:text-content"
        @click="toggleTheme"
      >
        <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted">
          <SvgIcon :name="isDark ? 'moon' : 'sun'" :size="19" />
        </span>
        <span class="min-w-0 flex-1 whitespace-nowrap text-left">
          {{ isDark ? 'Темная' : 'Светлая' }}
        </span>
        <span
          class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-[3px] transition-colors"
          :class="isDark ? 'bg-brand' : 'bg-slate-400'"
        >
          <span
            class="h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200"
            :class="isDark ? 'translate-x-5' : 'translate-x-0'"
          ></span>
        </span>
      </button>

    </div>
  </aside>
</template>
