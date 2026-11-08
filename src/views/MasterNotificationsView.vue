<script setup>
import Modal from '../components/ui/Modal.vue'
const selectedNotice=ref(null)
function openNotice(n){selectedNotice.value=n;markRead(n.id)}
import WorkspaceHero from '../components/WorkspaceHero.vue'
import { masterMedia } from '../data/masterMedia'
import { computed, ref } from 'vue'
import Button from '../components/ui/Button.vue'
import PageState from '../components/ui/PageState.vue'
import { useMockPage } from '../composables/useMockPage'
import SvgIcon from '../components/ui/SvgIcon.vue'
import { useMasterNotifications } from '../composables/useMasterNotifications'

const { notifications, unreadCount, markAllRead, markRead } = useMasterNotifications()

const typeMeta = {
  assignment: { icon: 'user', classes: 'bg-brand/10 text-brand' },
  status: { icon: 'clock', classes: 'bg-warn/15 text-warn' },
  success: { icon: 'checkCircle', classes: 'bg-ok/15 text-ok' },
  warning: { icon: 'alertTriangle', classes: 'bg-warn/15 text-warn' },
  info: { icon: 'infoCircle', classes: 'bg-brand/10 text-brand' },
}

function meta(type) {
  return typeMeta[type] ?? typeMeta.info
}

const filter = ref('all')
const { loading, error, empty, retry } = useMockPage()

const filters = computed(() => [
  { value: 'all', label: 'Все', count: notifications.value.length },
  { value: 'unread', label: 'Непрочитанные', count: unreadCount.value },
  {
    value: 'assignment',
    label: 'Новые назначения',
    count: notifications.value.filter((n) => n.type === 'assignment').length,
  },
  {
    value: 'status',
    label: 'Изменения статусов',
    count: notifications.value.filter((n) => n.type === 'status').length,
  },
])

const filtered = computed(() =>
  filter.value === 'all'
    ? notifications.value
    : notifications.value.filter((n) => filter.value === 'unread' ? n.unread : n.type === filter.value),
)

const GROUPS = [
  { key: 'today', label: 'Активные' },
  { key: 'yesterday', label: 'Вчера' },
  { key: 'earlier', label: 'Ранее' },
]

const grouped = computed(() =>
  GROUPS.map((g) => ({
    ...g,
    items: filtered.value.filter((n) => (n.group ?? 'earlier') === g.key),
  })).filter((g) => g.items.length),
)
</script>

<template>
  <div class="grid gap-6">
    <Modal :model-value="!!selectedNotice" @update:model-value="v=>{if(!v)selectedNotice=null}" :title="selectedNotice?.title??'Уведомление'"><p class="whitespace-pre-wrap break-words leading-relaxed">{{selectedNotice?.text}}</p><p class="mt-4 text-sm text-muted">{{selectedNotice?.time}}</p><template #footer><Button v-if="selectedNotice?.request_id" variant="primary" :to="'/master/task/'+selectedNotice.request_id">Открыть заявку</Button><Button variant="outline" @click="selectedNotice=null">Закрыть</Button></template></Modal>
    <WorkspaceHero title="Уведомления" description="Новые назначения, изменения по заявкам и события склада." eyebrow="ДЕРЖИМ В КУРСЕ" :image="masterMedia.workUpdates"/>
    <div class="flex flex-wrap items-center justify-between gap-4">
      <Button variant="outline" :disabled="!unreadCount || loading || error || empty" @click="markAllRead">
        <SvgIcon name="checkCircle" :size="18" class="text-muted" />
        Прочитать все
      </Button>
    </div>

    <PageState :loading="loading" :error="error" :empty="empty" @retry="retry" title="Уведомлений пока нет" icon="bell">
    <div
      class="inline-flex flex-wrap rounded-xl border border-line bg-surface2 p-1"
      role="tablist"
      aria-label="Фильтр уведомлений"
    >
      <button
        v-for="f in filters"
        :key="f.value"
        type="button"
        role="tab"
        :aria-selected="filter === f.value"
        class="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors"
        :class="
          filter === f.value ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-content'
        "
        @click="filter = f.value"
      >
        {{ f.label }}
        <span class="text-[11px] font-bold opacity-70">{{ f.count }}</span>
      </button>
    </div>

    <div class="grid gap-7">
      <section v-for="group in grouped" :key="group.key" class="grid gap-3">
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
            @click="openNotice(n)"
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
              <span class="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                <template v-if="n.request_id">
                  <span class="font-semibold text-brand">Заявка #{{ n.request_id }}</span>
                </template>
                <span>{{ n.time }}</span>
              </span>
            </span>
          </button>
        </div>
      </section>

      <div
        v-if="!filtered.length"
        class="grid place-items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-14 text-center"
      >
        <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
          <SvgIcon name="bell" :size="24" />
        </span>
        <div>
          <h2 class="text-base font-bold">Уведомлений нет</h2>
          <p class="mx-auto mt-1 max-w-md text-sm text-muted">
            {{
              notifications.length
                ? 'В этой категории пока ничего нет — выберите другой фильтр.'
                : 'Как только появятся события по заявкам, вы увидите их здесь.'
            }}
          </p>
        </div>
      </div>
    </div>
    </PageState>
  </div>
</template>
