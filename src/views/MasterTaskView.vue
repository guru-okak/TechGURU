<script setup>
import Select from '../components/ui/Select.vue'
import RequestPhotos from '../components/RequestPhotos.vue'
import {mutate} from '../api/client'
import Modal from '../components/ui/Modal.vue'
import StatusArt from '../components/illustrations/StatusArt.vue'
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import DeviceArt from '../components/illustrations/DeviceArt.vue'
import MasterCompleteModal from '../components/MasterCompleteModal.vue'
import MasterPartsRequestModal from '../components/MasterPartsRequestModal.vue'
import Badge from '../components/ui/Badge.vue'
import Button from '../components/ui/Button.vue'
import Card from '../components/ui/Card.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import StatusBadge from '../components/ui/StatusBadge.vue'
import SvgIcon from '../components/ui/SvgIcon.vue'
import { useMasterTask } from '../composables/useMasterTask'
import { toast } from '../composables/useToast'
import { formatPartPrice } from '../data/parts'
import { formatDateTime } from '../data/requests'

const route = useRoute()
const router = useRouter()
const { task, loading, error, history, parts, load, accept, resume, markWaitingParts, closeRequest, completeRepair } =
  useMasterTask(route.params.id)

const reportOpen=ref(false),reportCategory=ref('qualification'),reportText=ref(''),reportError=ref(''),reportBusy=ref(false),estimateReport=ref(false),suggestedPrice=ref('')
function openReport(estimate=false){estimateReport.value=estimate;suggestedPrice.value='';reportText.value='';reportError.value='';reportOpen.value=true}
async function sendReport(){reportError.value='';reportBusy.value=true;try{await mutate('/business/requests/'+task.value.id+'/report',{category:estimateReport.value?'other':reportCategory.value,message:estimateReport.value?'Изменение сметы. Предлагаемая стоимость: '+suggestedPrice.value+' ₽. '+reportText.value:reportText.value});reportOpen.value=false;reportText.value='';toast('Обращение отправлено администратору')}catch(e){reportError.value=e.message}finally{reportBusy.value=false}}
const tab = ref('info')
const partsModal = ref(false)
const completeModal = ref(false)

const tabs = computed(() => [
  { value: 'info', label: 'Информация' },
  { value: 'history', label: 'История', count: history.value.length },
  { value: 'parts', label: 'Запчасти', count: parts.value.length },
])

const infoItems = computed(() => {
  const t = task.value
  if (!t) return []
  const onsite = t.service_mode === 'onsite'
  return [
    { label: 'Клиент', value: t.client, icon: 'user' },
    {
      label: 'Телефон',
      value: t.clientPhone,
      icon: 'phone',
      href: `tel:${String(t.clientPhone).replace(/[^+\d]/g, '')}`,
    },
    { label: 'Канал', value: onsite ? 'Выезд к клиенту' : 'Приём в сервисе', icon: onsite ? 'truck' : 'store' },
    {
      label: onsite ? 'Адрес выезда' : 'Точка приёма',
      value: onsite ? (t.address ?? '—') : (t.service_point ?? '—'),
      icon: onsite ? 'mapPin' : 'store',
    },
    { label: 'Время', value: t.desiredDate, icon: 'clock' },
    { label: 'Стоимость', value: t.price, icon: 'box' },
    { label: 'Создана', value: t.date, icon: 'calendar' },
    { label: 'Исполнитель', value: t.master, icon: 'wrench' },
  ]
})

const isFinished = computed(() =>
  ['completed', 'closed', 'cancelled', 'rejected'].includes(task.value?.status),
)

const PART_STATUS = {
  reserved: { label: 'Зарезервировано', tone: 'blue' },
  used: { label: 'Израсходовано', tone: 'green' },
  returned: { label: 'Возвращено', tone: 'gray' },
}

function partLabel(status) {
  return PART_STATUS[status]?.label ?? status
}

function partTone(status) {
  return PART_STATUS[status]?.tone ?? 'gray'
}

async function onAccept() {
  await accept()
  toast('Заявка принята в работу')
}

async function onResume() {
  await resume()
  toast('Работа по заявке возобновлена')
}

async function onCloseRequest() {
  await closeRequest()
  toast('Техника выдана — заявка завершена')
}

async function onWaitingParts() {
  await markWaitingParts()
  partsModal.value = false
  toast('Данные запчастей обновлены')
}

async function onComplete(payload) {
  const target = await completeRepair(payload)
  toast(target === 'completed' ? 'Ремонт завершён' : 'Заявка готова к выдаче')
  router.push('/master/requests')
}

const actions = computed(() => {
  const status = task.value?.status
  if (status === 'assigned') {
    return [{ key: 'accept', label: 'Принять в работу', icon: 'wrench', variant: 'primary', run: onAccept }, { key: 'decline', label: 'Отказаться от назначения', icon: 'infoCircle', variant: 'outline', run: () => (declineOpen.value = true) }]
  }
  if (status === 'in_progress') {
    return [
      { key: 'parts', label: 'Запросить запчасть', icon: 'box', variant: 'outline', run: () => (partsModal.value = true) },
      { key: 'complete', label: 'Завершить ремонт', icon: 'checkCircle', variant: 'primary', run: () => (completeModal.value = true) },
    ]
  }
  if (status === 'waiting_parts') {
    return [{ key: 'resume', label: 'Возобновить работу', icon: 'arrowRight', variant: 'primary', run: onResume }]
  }
  if (status === 'ready_for_pickup') {
    return [] // Выдачу подтверждает клиент или администратор.
  }
  return []
})
const declineOpen = ref(false)
const declineReason = ref('')
</script>

<template>
 <Modal v-model="reportOpen"  :title="estimateReport ? 'Предложить изменение сметы' : 'Обращение администратору'" description="Опишите проблему. Администратор увидит категорию и номер заявки."><form id="master-report-form" @submit.prevent="sendReport" class="grid gap-4"><Select v-if="!estimateReport" v-model="reportCategory" label="Категория" :options="[{value:'qualification',label:'Недостаточно навыков'},{value:'diagnosis',label:'Сложная диагностика'},{value:'system',label:'Ошибка системы'},{value:'other',label:'Другое'}]"/><label v-else>Предлагаемая общая стоимость, ₽<input v-model="suggestedPrice" type="number" min="0" max="1000000" step="0.01" class="control" required/></label><label>{{estimateReport ? 'Причина, работы и детали' : 'Описание'}}<textarea v-model="reportText" class="control" rows="4" minlength="5" maxlength="1850" required/></label><p v-if="reportError" role="alert" class="text-danger">{{reportError}}</p></form><template #footer><Button variant="outline" @click="reportOpen=false">Отмена</Button><Button type="submit" form="master-report-form" variant="primary" :loading="reportBusy">Отправить</Button></template></Modal>
 <RequestPhotos v-if="task" :photos="task.photos"/><div v-if="task&&['assigned','in_progress','waiting_parts'].includes(task.status)" class="mb-5"><div class="flex flex-wrap gap-2"><Button variant="outline" @click="openReport()">Сообщить администратору</Button><Button variant="outline" @click="openReport(true)">Предложить изменение сметы</Button></div><p v-if="task.estimate_proposal" class="mt-2 text-sm text-muted">Клиент рассматривает новую смету.</p></div>
  <Modal v-model="declineOpen" title="Отказ от назначения" description="Обращение вернётся администратору для повторного назначения."><label class="grid gap-2">Причина отказа<textarea v-model="declineReason" class="control" rows="3" required></textarea></label><template #footer><Button variant="outline" @click="declineOpen=false">Отмена</Button><Button variant="primary" :disabled="!declineReason.trim()" @click="async()=>{await mutate('/business/requests/'+task.id+'/decline',{comment:declineReason});declineOpen=false;router.push('/master/requests')}">Подтвердить отказ</Button></template></Modal>
  <div class="grid gap-6">
    <!-- Шапка -->
    <div>
      <RouterLink
        to="/master/requests"
        class="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        <SvgIcon name="arrowLeft" :size="16" />
        Назад к списку
      </RouterLink>

      <div v-if="loading" class="mt-3 grid gap-2">
        <Skeleton width="220px" height="1.6rem" />
        <Skeleton width="160px" height="0.9rem" />
      </div>

      <div v-else-if="task" class="mt-3 flex flex-wrap items-center gap-3">
        <h1 class="text-2xl font-bold">Заявка #{{ task.number }}</h1>
        <StatusBadge :status="task.status" />
        <Badge :tone="task.service_mode === 'onsite' ? 'blue' : 'gray'">{{task.service_mode==='onsite'?'Выезд к клиенту':'Приём в сервисе'}}</Badge>
      </div>
    </div>

    <!-- Ошибка / не найдено -->
    <Card v-if="error" padding="lg" class="grid place-items-center gap-3 py-14 text-center">
      <p class="text-sm text-danger">Не удалось загрузить заявку.</p>
      <Button size="sm" variant="outline" @click="load">Повторить</Button>
    </Card>

    <Card
      v-else-if="!loading && !task"
      padding="lg"
      class="grid place-items-center gap-3 py-14 text-center"
    >
      <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
        <SvgIcon name="clipboard" :size="24" />
      </span>
      <h2 class="text-base font-bold">Заявка не найдена</h2>
      <p class="max-w-md text-sm text-muted">Возможно, она удалена или назначена другому мастеру.</p>
      <Button to="/master/requests" variant="primary" size="sm">К списку заявок</Button>
    </Card>

    <div v-else-if="task" class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <!-- Основная колонка -->
      <div class="grid content-start gap-4 xl:order-1">
        <!-- Hero -->
        <Card padding="lg">

          <div class="flex flex-wrap items-start gap-4">
            <span class="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand/10 p-2.5">
              <DeviceArt :name="task.icon" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="text-lg font-bold">{{ task.device }}</div>
              <div class="mt-0.5 text-sm text-muted">{{ task.service }}</div>
              <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted">
                <span class="inline-flex items-center gap-1.5">
                  <SvgIcon name="user" :size="14" />{{ task.client }}
                </span>
                <span class="inline-flex items-center gap-1.5">
                  <SvgIcon name="clock" :size="14" />{{ task.desiredDate }}
                </span>
              </div>
            </div>
          </div>
        </Card>

        <!-- Вкладки -->
        <Card padding="none" class="overflow-hidden">
          <div class="flex overflow-x-auto border-b border-line px-2">
            <button
              v-for="t in tabs"
              :key="t.value"
              type="button"
              class="inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 text-sm font-semibold transition-colors"
              :class="
                tab === t.value
                  ? 'border-brand text-brand'
                  : 'border-transparent text-muted hover:text-content'
              "
              @click="tab = t.value"
            >
              {{ t.label }}
              <span
                v-if="t.count != null"
                class="rounded-full bg-surface2 px-1.5 py-0.5 text-[10px] font-bold text-muted"
              >
                {{ t.count }}
              </span>
            </button>
          </div>

          <!-- Информация -->
          <div v-if="tab === 'info'" class="grid gap-5 p-5">
            <div class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div v-for="item in infoItems" :key="item.label" class="flex items-start gap-3">
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface2 text-muted">
                  <SvgIcon :name="item.icon" :size="17" />
                </span>
                <div class="min-w-0">
                  <div class="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {{ item.label }}
                  </div>
                  <a
                    v-if="item.href"
                    :href="item.href"
                    class="block truncate text-sm font-semibold text-brand hover:underline"
                  >
                    {{ item.value }}
                  </a>
                  <div v-else class="text-sm font-semibold">{{ item.value }}</div>
                </div>
              </div>
            </div>

            <div class="rounded-2xl bg-surface2 p-4">
              <div class="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Описание проблемы
              </div>
              <p class="mt-1.5 text-sm">{{ task.description }}</p>
            </div>
          </div>

          <!-- История -->
          <div v-else-if="tab === 'history'" class="p-5">
            <ol v-if="history.length" class="grid">
              <li v-for="(entry, i) in history" :key="entry.id" class="flex gap-3">
                <span class="flex flex-col items-center">
                  <StatusArt :status="entry.status" :size="36"/>
                  <span v-if="i < history.length - 1" class="w-px flex-1 bg-line"></span>
                </span>
                <div class="min-w-0 pb-5">
                  <div class="flex flex-wrap items-center gap-2">
                    <StatusBadge :status="entry.status" />
                    <span class="text-[11px] text-muted">{{ formatDateTime(entry.created_at) }}</span>
                  </div>
                  <p v-if="entry.comment" class="mt-1 text-sm">{{ entry.comment }}</p>
                  <p class="mt-0.5 text-[11px] text-muted">{{ entry.changed_by }}</p>
                </div>
              </li>
            </ol>
            <p v-else class="py-8 text-center text-sm text-muted">История изменений пуста.</p>
          </div>

          <!-- Запчасти -->
          <div v-else class="p-5">
            <div v-if="parts.length" class="grid gap-2">
              <div
                v-for="item in parts"
                :key="item.id"
                class="flex items-center gap-3 rounded-xl border border-line px-3 py-3"
              >
                <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface2 text-muted">
                  <SvgIcon name="box" :size="18" />
                </span>
                <div class="min-w-0 flex-1">
                  <div class="truncate text-sm font-semibold">
                    {{ item.part?.name ?? `Запчасть #${item.part_id}` }}
                  </div>
                  <div class="text-[11px] text-muted">
                    {{ item.quantity }} шт · {{ formatPartPrice(item.unit_price) }}
                  </div>
                  <div v-if="item.used_quantity || item.returned_quantity" class="text-[11px] text-muted">
                    Использовано {{ item.used_quantity ?? 0 }} шт · возвращено {{ item.returned_quantity ?? 0 }} шт
                  </div>
                </div>
                <Badge :tone="partTone(item.status)">{{ partLabel(item.status) }}</Badge>
              </div>
            </div>

            <div v-else class="grid place-items-center gap-2 py-10 text-center">
              <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand">
                <SvgIcon name="box" :size="24" />
              </span>
              <p class="text-sm font-semibold">Запчасти не привязаны</p>
              <p class="max-w-sm text-[13px] text-muted">
                Запросите детали на вкладке «Действия» — они появятся здесь.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <!-- Действия -->
      <div class="grid content-start gap-4 xl:order-2">
        <Card padding="lg">
          <h2 class="text-lg font-bold">Действия</h2>

          <div v-if="actions.length" class="mt-4 grid gap-2.5">
            <Button
              v-for="action in actions"
              :key="action.key"
              :variant="action.variant"
              block
              @click="action.run"
            >
              <template #iconLeft><SvgIcon :name="action.icon" :size="18" /></template>
              {{ action.label }}
            </Button>
          </div>

          <div
            v-else-if="isFinished"
            class="mt-4 flex items-start gap-2 rounded-xl bg-ok/10 px-3 py-3 text-[13px] font-medium text-ok"
          >
            <SvgIcon name="checkCircle" :size="17" class="mt-0.5 shrink-0" />
            Заявка завершена. Действия недоступны.
          </div>

          <p v-else class="mt-4 text-sm text-muted">{{ task.status==='ready_for_pickup' ? 'Ремонт окончен. Выдачу техники подтверждает клиент или администратор.' : 'Для текущего статуса действий нет.' }}</p><p v-if="task.status==='completed'" class="mt-3 text-sm text-muted">Автоматическое закрытие — через 3 дня после завершения.</p>
        </Card>

        <Card padding="lg">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-bold">Статус заявки</h2>
              <p class="text-xs text-muted">Текущее состояние ремонта</p>
            </div>
            <StatusBadge :status="task.status" />
          </div>
          <p class="mt-3 text-[12px] leading-relaxed text-muted">
            {{
              task.service_mode === 'onsite'
                ? 'Выезд к клиенту. После завершения ремонта заявка станет «Завершена».'
                : 'Приём в сервисном центре. После завершения заявка станет «Готово к выдаче».'
            }}
          </p>
        </Card>
      </div>
    </div>

    <!-- Модалки -->
    <MasterPartsRequestModal
      v-if="task"
      v-model="partsModal"
      :request="task"
      @waiting="onWaitingParts"
    />
    <MasterCompleteModal
      v-if="task"
      v-model="completeModal"
      :request="task"
      :parts="parts"
      @submit="onComplete"
    />
  </div>
</template>
