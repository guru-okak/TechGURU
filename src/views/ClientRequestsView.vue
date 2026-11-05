<script setup>
import { reportDay } from '../../shared/domain/reportDates'
import WorkspaceHero from '../components/WorkspaceHero.vue'
import { clientHeaderMedia } from '../data/clientHeaderMedia'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ClientRequestDetails from '../components/ClientRequestDetails.vue'
import ClientRequestCard from '../components/ClientRequestCard.vue'
import Button from '../components/ui/Button.vue'
import Card from '../components/ui/Card.vue'
import Input from '../components/ui/Input.vue'
import Select from '../components/ui/Select.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import SvgIcon from '../components/ui/SvgIcon.vue'
import { requestPeriods, requestStatuses } from '../data/requests'
import { useClientRequests } from '../composables/useClientRequests'
import { useRequestsFilter } from '../composables/useRequestsFilter'
import { statusLabel } from '../config/statuses'
import { toast } from '../composables/useToast'

const { requests, loading, error, load } = useClientRequests()
const { search, status, period } = useRequestsFilter()
const route = useRoute(), selected = ref(null), activeOnly = ref(false), doneOnly = ref(false)
watch(() => route.query, q => {
 activeOnly.value = q.active === '1'; doneOnly.value = q.done === '1'
 if (q.status || activeOnly.value || doneOnly.value || q.request) { search.value = ''; period.value = 'За всё время'; status.value = requestStatuses.some(s => s.value === q.status) ? q.status : 'all' }
}, { immediate: true })
watch([requests, () => route.query.request], () => { if (route.query.request) selected.value = requests.value.find(r => r.id === Number(route.query.request)) ?? null }, { immediate: true })

function withinPeriod(request) {
  const days = {
    'Последние 7 дней': 7,
    'Последние 30 дней': 30,
    'Последние 90 дней': 90,
  }[period.value]
  if (!days) return true // За всё время
  return request.dateISO >= reportDay(1 - days) && request.dateISO <= reportDay(0)
}

const filteredRequests = computed(() => {
  const query = search.value.trim().toLowerCase()
  return requests.value.filter((r) => {
    const matchesQuery =
      !query ||
      String(r.number).includes(query) ||
      (r.request_number ?? '').toLowerCase().includes(query) ||
      r.device.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query)
    const matchesStatus = status.value === 'all' || r.status === status.value
    return matchesQuery && matchesStatus && withinPeriod(r) && (!activeOnly.value || ['new','confirmed','assigned','in_progress','waiting_parts','ready_for_pickup'].includes(r.status)) && (!doneOnly.value || ['completed','closed'].includes(r.status))
  })
})

const periodOptions = requestPeriods.map((p) => ({ value: p, label: p }))

function openRequest(request) {
  selected.value = request
}

function exportCsv() {
  const header = [
    'Номер',
    'Устройство',
    'Описание',
    'Канал',
    'Мастер',
    'Статус',
    'Дата',
    'Сумма',
  ]
  const rows = filteredRequests.value.map((r) => [
    `#${r.number}`,
    r.device,
    r.description,
    r.channel,
    r.master,
    statusLabel(r.status),
    r.date,
    r.price,
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/^(?=\s*[=+@\-\t\r\n])/,"'").replace(/"/g, '""')}"`).join(';'))
    .join('\n')

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'techguru-requests.csv'
  link.click()
  URL.revokeObjectURL(url)
  toast('Отчёт CSV сформирован')
}
</script>

<template>
  <div class="grid gap-6">
    <WorkspaceHero title="Мои заявки" description="Ваши обращения, этапы ремонта и история обслуживания техники." eyebrow="ВСЁ ПОД КОНТРОЛЕМ" :image="clientHeaderMedia.requests"><Button to="/client/requests/new" variant="primary">Создать заявку</Button></WorkspaceHero>

    <Card padding="md" class="min-w-0">
      <!-- Панель фильтров -->
      <div class="flex flex-wrap items-end gap-3">
        <div class="min-w-0 flex-1 basis-full md:hidden">
          <Input
            v-model="search"
            type="search"
            icon-left="search"
            placeholder="Поиск по заявкам…"
          />
        </div>

        <Select
          v-model="status"
          :options="requestStatuses"
          class="w-auto min-w-[160px]"
        />

        <Select
          v-model="period"
          :options="periodOptions"
          class="w-auto min-w-[180px]"
        />

        <Button class="ml-auto" @click="exportCsv">
          <template #iconLeft><SvgIcon name="download" :size="18" class="text-muted" /></template>
          Экспорт в CSV
        </Button>
      </div>

      <p class="mt-3 text-[12px] text-muted">
        Найдено: <strong class="text-content">{{ filteredRequests.length }}</strong>
        из {{ requests.length }}
      </p>
    </Card>

    <div v-if="activeOnly || doneOnly" class="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-xs text-muted"><span>{{ activeOnly ? 'Показаны активные обращения' : 'Показаны завершённые обращения' }}</span><Button size="sm" variant="ghost" @click="activeOnly = false; doneOnly = false">Показать все</Button></div>
    <!-- Список -->
    <div class="stagger grid gap-3">
      <template v-if="loading">
        <div v-for="i in 4" :key="i" class="flex items-center gap-3 rounded-2xl border border-line p-4">
          <Skeleton variant="rect" width="48px" height="48px" rounded="12px" />
          <div class="flex-1">
            <Skeleton variant="text" :lines="2" height="0.6rem" />
          </div>
          <Skeleton width="84px" height="22px" rounded="8px" />
        </div>
      </template>

      <ClientRequestCard
        v-for="(request, i) in loading ? [] : filteredRequests"
        :key="request.number"
        :style="{ '--i': i }"
        :request="request"
        @open="openRequest"
      />

      <p
        v-if="error"
        class="py-12 text-center text-sm text-danger"
      >
        Не удалось загрузить заявки.
        <button type="button" class="font-semibold underline" @click="load">Повторить</button>
      </p>

      <div
        v-else-if="!loading && !filteredRequests.length"
        class="py-12 text-center text-sm text-muted"
      >
        Заявки не найдены. Попробуйте изменить фильтры.
      </div>
    </div>
    <ClientRequestDetails :request="selected" @close="selected = null" @changed="load" />
  </div>
</template>
