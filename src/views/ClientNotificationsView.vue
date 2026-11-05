<script setup>
import WorkspaceHero from '../components/WorkspaceHero.vue'
import { clientHeaderMedia } from '../data/clientHeaderMedia'
import { computed, ref } from 'vue'
import PageState from '../components/ui/PageState.vue'
import Button from '../components/ui/Button.vue'
import { useMockPage } from '../composables/useMockPage'
import SvgIcon from '../components/ui/SvgIcon.vue'
import { useNotifications } from '../composables/useNotifications'

const { notifications, unreadCount, markAllRead, markRead } = useNotifications()

const typeMeta = {
  success: { icon: 'checkCircle', classes: 'bg-ok/15 text-ok' },
  info: { icon: 'infoCircle', classes: 'bg-brand/10 text-brand' },
  warning: { icon: 'alertTriangle', classes: 'bg-warn/15 text-warn' },
}

function meta(type) {
  return typeMeta[type] ?? typeMeta.info
}

const page = useMockPage()
const unreadOnly = ref(false)
const visible = computed(() => unreadOnly.value ? notifications.value.filter(n => n.unread) : notifications.value)
const GROUPS = [
  { key: 'today', label: 'Сегодня' },
  { key: 'yesterday', label: 'Вчера' },
  { key: 'earlier', label: 'Ранее' },
]

const grouped = computed(() =>
  GROUPS.map((g) => ({
    ...g,
    items: visible.value.filter((n) => (n.group ?? 'earlier') === g.key),
  })).filter((g) => g.items.length),
)
</script>

<template>
  <div class="grid gap-6">
    <WorkspaceHero title="Уведомления" description="Следите за назначением мастера, поступлением запчастей и готовностью техники." eyebrow="НОВОСТИ ВАШЕГО РЕМОНТА" :image="clientHeaderMedia.notifications"/>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <button type="button" class="btn" :disabled="!unreadCount" @click="markAllRead">
        <SvgIcon name="checkCircle" :size="18" class="text-muted" />
        Отметить все как прочитанные
      </button>
    </div>

    <PageState :loading="page.loading.value" :error="page.error.value" :empty="page.empty.value" @retry="page.retry" title="Уведомлений пока нет" icon="bell">
    <div class="flex flex-wrap gap-2"><Button :variant="unreadOnly ? 'outline' : 'primary'" size="sm" @click="unreadOnly = false">Все</Button><Button :variant="unreadOnly ? 'primary' : 'outline'" size="sm" @click="unreadOnly = true">Непрочитанные · {{ unreadCount }}</Button></div>
    <div class="grid gap-7">
      <section v-for="group in grouped" :key="group.key" class="grid gap-3">
        <!-- «Липкий» заголовок группы -->
        <h2
          class="sticky top-[76px] z-10 -mx-1 flex items-center gap-2 bg-app/90 px-1 py-2 text-[11px] font-bold uppercase tracking-wide text-muted backdrop-blur"
        >
          {{ group.label }}
          <span class="rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-semibold">
            {{ group.items.length }}
          </span>
        </h2>

        <div class="stagger grid gap-3">
          <button
            v-for="(n, i) in group.items"
            :key="n.id"
            :style="{ '--i': i }"
            type="button"
            class="card card-hover flex w-full items-start gap-3 p-4 text-left"
            :class="n.unread ? 'border-brand/30 bg-brand/5' : ''"
            @click="markRead(n.id)"
          >
            <span
              class="grid h-10 w-10 shrink-0 place-items-center rounded-full"
              :class="meta(n.type).classes"
            >
              <SvgIcon :name="meta(n.type).icon" :size="20" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <strong class="min-w-0 break-words text-sm">{{ n.title }}</strong>
                <span v-if="n.unread" class="h-2 w-2 shrink-0 rounded-full bg-danger"></span>
              </span>
              <span class="mt-1 block break-words text-[13px] text-muted">{{ n.text }}</span>
              <span class="mt-1 block text-[11px] text-muted">{{ n.time }}</span>
            </span>
          </button>
        </div>
      </section>

    </div>
    <div v-if="!visible.length" class="card grid justify-items-center gap-3 px-5 py-12 text-center"><SvgIcon name="checkCircle" :size="30" class="text-brand"/><h2 class="text-lg font-semibold">{{ notifications.length ? 'Всё прочитано' : 'Уведомлений пока нет' }}</h2><p class="text-sm text-muted">Новые события по заявкам появятся здесь.</p></div>
    </PageState>
  </div>
</template>
