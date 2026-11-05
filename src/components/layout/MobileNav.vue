<script setup>
import { adminNotices } from '../../data/adminOperations'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { navigation } from '../../config/navigation'
import { useSession } from '../../composables/useSession'
import { useTheme } from '../../composables/useTheme'
import { useNotifications } from '../../composables/useNotifications'
import { useMasterNotifications } from '../../composables/useMasterNotifications'
import { toast } from '../../composables/useToast'
import SvgIcon from '../ui/SvgIcon.vue'

const route = useRoute()
const router = useRouter()
const { role } = useSession()
const { isDark, toggleTheme } = useTheme()
const { unreadCount: clientUnread } = useNotifications()
const { unreadCount: masterUnread } = useMasterNotifications()

// На мобильном показываем до 4 ключевых пунктов текущей роли.
// Если для роли отмечены primary-пункты — берём их, иначе первые 4.
const items = computed(() => {
  const list = navigation[role.value] ?? []
  const primary = list.filter((item) => item.primary)
  return (primary.length ? primary : list).slice(0, 4)
})

function badgeFor(item) {
  if (item.badge !== 'notifications') return 0
  return role.value === 'admin' ? adminNotices.filter(n=>!n.is_read).length : role.value === 'master' ? masterUnread.value : clientUnread.value
}

function handleNav(item) {
  if (item.to) router.push(item.to)
  else toast(`Раздел «${item.label}» добавим на следующем этапе.`)
}
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-line bg-surface px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 lg:hidden"
  >
    <button
      v-for="item in items"
      :key="item.label"
      type="button"
      class="relative grid justify-items-center gap-1 px-1.5 py-1 text-[9px] font-medium transition-colors"
      :class="item.to && route.path === item.to ? 'text-brand' : 'text-muted'"
      @click="handleNav(item)"
    >
      <span class="relative">
        <SvgIcon :name="item.icon" :size="19" />
        <span
          v-if="badgeFor(item)"
          class="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[8px] font-bold text-white"
        >
          {{ badgeFor(item) }}
        </span>
      </span>
      {{ item.label }}
    </button>

    <button
      type="button"
      class="grid justify-items-center gap-1 px-1.5 py-1 text-[9px] font-medium text-muted"
      aria-label="Переключить тему"
      @click="toggleTheme"
    >
      <span
        class="relative inline-flex h-5 w-9 items-center rounded-full p-[2px] transition-colors"
        :class="isDark ? 'bg-brand' : 'bg-slate-400'"
      >
        <span
          class="h-4 w-4 rounded-full bg-white shadow transition-transform"
          :class="isDark ? 'translate-x-4' : 'translate-x-0'"
        ></span>
      </span>
      Тема
    </button>
  </nav>
</template>
