<script setup>
import WorkspaceHero from '../components/WorkspaceHero.vue'
import { masterMedia } from '../data/masterMedia'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useMockPage } from '../composables/useMockPage'
import MasterRequestCard from '../components/MasterRequestCard.vue'
import Button from '../components/ui/Button.vue'
import Card from '../components/ui/Card.vue'
import Input from '../components/ui/Input.vue'
import Select from '../components/ui/Select.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import SvgIcon from '../components/ui/SvgIcon.vue'
import { requestStatuses } from '../data/requests'
import { MASTER_ACTIVE_STATUSES, useMasterRequests } from '../composables/useMasterRequests'

const { requests: sourceRequests, sortedRequests: sourceSorted, loading: sourceLoading, error: sourceError, load: reload } = useMasterRequests()
const page=useMockPage()
const requests=computed(()=>page.empty.value?[]:sourceRequests.value)
const sortedRequests=computed(()=>page.empty.value?[]:sourceSorted.value)
const loading=computed(()=>sourceLoading.value||page.loading.value)
const error=computed(()=>sourceError.value||page.error.value)
function load(){page.retry();reload()}

const tab = ref('today')
const search = ref('')
const status = ref('all')
const channel = ref('all')
const route=useRoute()
watch(()=>route.query,q=>{status.value=requestStatuses.some(s=>s.value===q.status)?q.status:'all';tab.value=q.scope==='all'?'all':'today'},{immediate:true})

const channelOptions = [
  { value: 'all', label: 'Все каналы' },
  { value: 'onsite', label: 'Выезд к клиенту' },
  { value: 'dropoff', label: 'Приём в сервисе' },
]

const todayCount = computed(
  () => requests.value.filter((r) => MASTER_ACTIVE_STATUSES.includes(r.status)).length,
)

const tabs = computed(() => [
  { value: 'today', label: 'Активные', count: todayCount.value },
  { value: 'all', label: 'Все', count: requests.value.length },
])

const totalForTab = computed(() =>
  tab.value === 'today' ? todayCount.value : requests.value.length,
)

const filteredRequests = computed(() => {
  const base =
    tab.value === 'today'
      ? sortedRequests.value.filter((r) => MASTER_ACTIVE_STATUSES.includes(r.status))
      : sortedRequests.value

  const query = search.value.trim().toLowerCase()

  return base.filter((r) => {
    const matchesQuery =
      !query ||
      String(r.number).includes(query) ||
      (r.request_number ?? '').toLowerCase().includes(query) ||
      r.device.toLowerCase().includes(query) ||
      r.client.toLowerCase().includes(query) ||
      r.service.toLowerCase().includes(query) ||
      (r.description ?? '').toLowerCase().includes(query)
    const matchesStatus = status.value === 'all' || r.status === status.value
    const matchesChannel = channel.value === 'all' || r.service_mode === channel.value
    return matchesQuery && matchesStatus && matchesChannel
  })
})

const emptyTitle = computed(() => {
  if (!requests.value.length) return 'Заявок пока нет'
  if (tab.value === 'today') return 'Активных задач нет'
  return 'Заявки не найдены'
})

const emptyText = computed(() => {
  if (!requests.value.length) {
    return 'Как только администратор назначит вам заявку, она появится здесь.'
  }
  if (tab.value === 'today') {
    return 'Активных заявок нет. Посмотрите все заявки или измените фильтры.'
  }
  return 'Попробуйте изменить фильтры или выбрать другую вкладку.'
})

function resetFilters() {
  search.value = ''
  status.value = 'all'
  channel.value = 'all'
}
</script>

<template>
  <div class="grid gap-6">
    <WorkspaceHero title="Мои заявки" description="Очередь работ, назначенных вам. Выберите обращение, чтобы начать ремонт или запросить детали." eyebrow="ВАШИ РЕМОНТЫ" :image="masterMedia.fieldService"/>
    <div class="flex flex-wrap items-center justify-between gap-4">

      <div
        class="inline-flex rounded-xl border border-line bg-surface2 p-1"
        role="tablist"
        aria-label="Группа заявок"
      >
        <button
          v-for="t in tabs"
          :key="t.value"
          type="button"
          role="tab"
          :aria-selected="tab === t.value"
          class="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors"
          :class="
            tab === t.value
              ? 'bg-brand text-white shadow-sm'
              : 'text-muted hover:text-content'
          "
          @click="tab = t.value"
        >
          {{ t.label }}
          <span class="text-[11px] font-bold opacity-70">{{ t.count }}</span>
        </button>
      </div>
    </div>

    <Card padding="md">
      <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_180px_auto] md:items-end">
        <Input
          v-model="search"
          type="search"
          icon-left="search"
          placeholder="Поиск по номеру, устройству, клиенту…"
        />
        <Select v-model="status" :options="requestStatuses" />
        <Select v-model="channel" :options="channelOptions" />
        <Button variant="ghost" @click="resetFilters">
          <template #iconLeft><SvgIcon name="xCircle" :size="17" /></template>
          Сбросить
        </Button>
      </div>

      <p class="mt-3 text-[12px] text-muted">
        Найдено: <strong class="text-content">{{ filteredRequests.length }}</strong>
        из {{ totalForTab }}
      </p>
    </Card>

    <div class="grid gap-2">
      <div class="stagger grid gap-2" :aria-busy="loading">
        <template v-if="loading">
          <div
            v-for="i in 4"
            :key="i"
            class="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4"
          >
            <Skeleton variant="rect" width="44px" height="44px" rounded="12px" />
            <div class="flex-1">
              <Skeleton variant="text" :lines="2" height="0.6rem" />
            </div>
            <Skeleton width="84px" height="22px" rounded="8px" />
          </div>
        </template>

        <div
          v-else-if="error"
          class="rounded-2xl border border-line bg-surface px-6 py-12 text-center"
        >
          <p class="text-sm text-danger">Не удалось загрузить заявки.</p>
          <Button class="mt-3" size="sm" variant="outline" @click="load">Повторить</Button>
        </div>

        <div
          v-else-if="!filteredRequests.length"
          class="grid place-items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-14 text-center"
        >
          <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
            <SvgIcon name="clipboard" :size="24" />
          </span>
          <div>
            <h2 class="text-base font-bold">{{ emptyTitle }}</h2>
            <p class="mx-auto mt-1 max-w-md text-sm text-muted">{{ emptyText }}</p>
          </div>
          <Button
            v-if="requests.length"
            size="sm"
            variant="outline"
            @click="resetFilters"
          >
            <template #iconLeft><SvgIcon name="xCircle" :size="16" /></template>
            Сбросить фильтры
          </Button>
        </div>

        <template v-else>
          <MasterRequestCard
            v-for="(request, i) in filteredRequests"
            :key="request.number"
            :style="{ '--i': i }"
            :request="request"
          />
        </template>
      </div>
    </div>
  </div>
</template>
