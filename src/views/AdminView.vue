<script setup>
import { moscowDate } from '../../shared/domain/reportDates'
import {masterReports} from '../api/workspace'
import DraftOrderEditor from '../components/DraftOrderEditor.vue'
import {downloadApi,mutate} from '../api/client'
import DeviceArt from '../components/illustrations/DeviceArt.vue'
import {equipmentArt} from '../data/equipmentPresentation'
import AdminAttentionQueue from '../components/AdminAttentionQueue.vue'
import ServiceChannels from '../components/charts/ServiceChannels.vue'
import PersonAvatar from '../components/ui/PersonAvatar.vue'
import {workModeLabel} from '../data/masterWorkModes'
import WorkspaceHero from '../components/WorkspaceHero.vue'
import Select from '../components/ui/Select.vue'
import StatusArt from '../components/illustrations/StatusArt.vue'
import PartArt from '../components/illustrations/PartArt.vue'
import {adminMedia} from '../data/adminMedia'
import {advanceOrder,downloadCsv,auditLabel,auditTarget,adminPartKind} from '../data/adminOperations'
import { computed, ref } from 'vue'
import Modal from '../components/ui/Modal.vue'
import { toast } from '../composables/useToast'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import Badge from '../components/ui/Badge.vue'
import SvgIcon from '../components/ui/SvgIcon.vue'
import PageState from '../components/ui/PageState.vue'
import RequestDynamics from '../components/charts/RequestDynamics.vue'
import { useMockPage } from '../composables/useMockPage'
import { useSession } from '../composables/useSession'
import { adminRequests, adminClients, adminServices, adminMasters, adminStock, auditEvents, requestView, stockView, masterLoad, dayOffset, today, shortDate, activeStatuses, purchaseOrders, purchaseItems, adminParts, money, statusLabels } from '../data/admin'
const { current } = useSession()
const { loading, error, empty, retry } = useMockPage()
const period = ref(30)
const orderOpen = ref(false)
const freeDailyCapacity=computed(()=>adminMasters.filter(m=>m.is_available).reduce((sum,m)=>sum+Math.max(0,m.max_daily_requests-masterLoad(m)),0))
const plannedToday=computed(()=>adminRequests.filter(r=>r.status==='assigned'&&moscowDate(r.preferred_datetime)===moscowDate()).slice().sort((a,b)=>a.preferred_datetime.localeCompare(b.preferred_datetime)).slice(0,3).map(requestView))
async function confirmOrder(){try{if(draftOrder.value)await advanceOrder(draftOrder.value.id);orderOpen.value=false;toast('Закупка подтверждена')}catch(e){toast(e.message)}}
const since = computed(() => dayOffset(1 - period.value))
const requests = computed(() => adminRequests.filter(r => moscowDate(r.created_at) >= since.value))
const series = computed(() => Array.from({ length: period.value }, (_, i) => {
  const date = dayOffset(i - period.value + 1)
  return { date, label: shortDate(date + 'T12:00:00+03:00'), value: requests.value.filter(r => moscowDate(r.created_at) === date).length }
}))
const complete = computed(() => adminRequests.filter(r =>
  ['completed', 'closed'].includes(r.status) && r.completed_at && moscowDate(r.completed_at) >= since.value))
function repairHours(rows) {
  const durations = rows
    .map(r => (Date.parse(r.repair_finished_at) - Date.parse(r.started_at)) / 3600000)
    .filter(hours => Number.isFinite(hours) && hours >= 0)
  return durations.length ? durations.reduce((sum, hours) => sum + hours, 0) / durations.length : null
}
const average = computed(() => repairHours(complete.value)?.toFixed(1).replace('.', ',') ?? '—')
const onsite = computed(() => requests.value.filter(r => r.service_mode === 'onsite').length)
const onsitePercent = computed(() => requests.value.length ? Math.round(onsite.value / requests.value.length * 100) : 0)
const attention = computed(() => adminRequests.filter(r => r.status === 'new' || r.needs_manual_review).map(requestView))
const critical = computed(() => adminStock.map(stockView).filter(r => r.is_active && r.available < r.min_stock))
const kpis = computed(() => [
  { label: 'Всего заявок', value: requests.value.length, icon: 'clipboard', tone: 'brand', caption: `За последние ${period.value} дней`, values: series.value.slice(-10).map(s => s.value) },
  { label: 'В работе', value: requests.value.filter(r => activeStatuses.includes(r.status)).length, icon: 'wrench', tone: 'warn', caption: 'Назначены, ремонт и выдача', values: series.value.slice(-10).map(s => adminRequests.filter(r => moscowDate(r.created_at) === s.date && activeStatuses.includes(r.status)).length) },
  { label: 'Завершено', value: complete.value.length, icon: 'checkCircle', tone: 'ok', caption: 'Выполнены и закрыты', values: series.value.slice(-10).map(s => complete.value.filter(r => moscowDate(r.completed_at) === s.date).length) },
  { label: 'Среднее время ремонта', value: average.value, unit: 'ч', icon: 'clock', tone: 'accent', caption: 'От начала работ до завершения', values: series.value.slice(-10).map(s => repairHours(complete.value.filter(r => moscowDate(r.completed_at) === s.date)) ?? 0) },
])
function spark(values) { const max = Math.max(1, ...values); return values.map((v, i) => `${i / Math.max(1, values.length - 1) * 112},${34 - v / max * 30}`).join(' ') }
const reportType=ref('requests')
const reportOptions=[{value:'requests',label:'Заявки за период'},{value:'revenue',label:'Выручка по категориям'},{value:'top',label:'Топ-5 услуг'},{value:'repair',label:'Среднее время ремонта'},{value:'masters',label:'Загрузка мастеров'},{value:'stock',label:'Остатки склада'},{value:'audit',label:'Журнал аудита'}]
const draftOrder=computed(()=>purchaseOrders.find(o=>o.status==='draft'))
const draftItems=computed(()=>purchaseItems.filter(i=>i.purchase_order_id===draftOrder.value?.id))
async function exportReport(){await downloadApi('/admin/reports/'+reportType.value+'?days='+period.value,'TechGURU-'+reportType.value+'.csv')}

</script>
<template>
 <div class="grid gap-6 admin-overview">
  <WorkspaceHero :title="'Добрый день, '+current.name.split(' ')[0]+'.'" description="Операционная картина сервиса: обращения клиентов, работа команды и готовность ресурсов." eyebrow="ПАНЕЛЬ АДМИНИСТРАТОРА" :image="adminMedia.overview" large><Button variant="primary" to="/admin/requests?attention=1">Разобрать обращения</Button><Button variant="outline" to="/admin/orders">Проверить закупки</Button></WorkspaceHero>
  <div class="flex flex-wrap gap-3"><Button variant="outline" @click="downloadApi('/admin/backup','TechGURU-backup.sql')">Резервная копия БД</Button><Button variant="outline" @click="async()=>{await mutate('/admin/jobs');toast('Регламентные проверки выполнены')}">Проверить сроки и остатки</Button></div><PageState :loading="loading" :error="error" :empty="empty" @retry="retry" title="Обзор появится с первой заявкой" description="Здесь будут динамика обращений, загрузка команды и состояние склада.">

   <div class="admin-report-controls"><Select v-model="reportType" label="Отчёт" :options="reportOptions"/><Button variant="outline" @click="exportReport">Скачать CSV</Button></div>
   <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="text-base font-bold">Сервис в цифрах <span class="ml-2 text-xs font-normal text-muted">за период</span></h2><div class="inline-flex rounded-xl border border-line bg-surface p-1" aria-label="Период отчёта"><button v-for="days in [7, 30, 90]" :key="days" class="rounded-lg px-3 py-2 text-xs font-semibold transition-colors" :class="period === days ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-surface2'" :aria-pressed="period === days" @click="period = days">{{ days }} дней</button></div></div>
   <section class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Ключевые показатели"><Card v-for="k in kpis" :key="k.label" padding="sm" hover class="relative overflow-hidden"><div class="flex items-center justify-between gap-2"><span class="min-h-8 text-[11px] font-medium text-muted sm:text-xs">{{ k.label }}</span><span class="grid h-8 w-8 shrink-0 place-items-center rounded-xl" :style="{ color: `var(--${k.tone === 'brand' ? 'blue' : k.tone === 'warn' ? 'amber' : k.tone === 'ok' ? 'green' : 'purple'})`, background: `color-mix(in srgb, var(--${k.tone === 'brand' ? 'blue' : k.tone === 'warn' ? 'amber' : k.tone === 'ok' ? 'green' : 'purple'}) 10%, transparent)` }"><SvgIcon :name="k.icon" :size="19"/></span></div><div class="mt-4 flex items-end justify-between gap-3"><strong class="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">{{ k.value }}<small v-if="k.unit" class="ml-1 text-base text-muted">{{ k.unit }}</small></strong><svg viewBox="0 0 112 38" class="hidden h-9 w-24 text-brand sm:block" aria-hidden="true"><polyline :points="spark(k.values)" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></div><p class="mt-3 text-[11px] text-muted">{{ k.caption }}</p></Card></section>
   <Card padding="md"><RouterLink to="/admin/notifications" class="font-semibold text-brand">Обращения мастеров: {{masterReports.filter(r=>r.status==='open').length}} открыто →</RouterLink><p class="text-sm text-muted mt-2">Навыки: {{masterReports.filter(r=>r.status==='open'&&r.category==='qualification').length}} · Диагностика: {{masterReports.filter(r=>r.status==='open'&&r.category==='diagnosis').length}} · Ошибки системы: {{masterReports.filter(r=>r.status==='open'&&r.category==='system').length}}</p></Card>
   <div class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Статусы заявок"><RouterLink v-for="st in ['new', 'in_progress', 'waiting_parts', 'ready_for_pickup']" :key="st" :to="`/admin/requests?status=${st}`" class="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3 transition-colors hover:border-brand/40"><StatusArt :status="st" :size="32"/><span class="text-xs text-muted flex-1">{{ statusLabels[st] }}</span><strong class="text-sm tabular-nums">{{ adminRequests.filter(r => r.status === st).length }}</strong></RouterLink></div>
   <section class="grid gap-5 xl:grid-cols-[minmax(0,1.9fr)_minmax(280px,1fr)]">
    <Card padding="lg"><div class="flex flex-wrap items-start justify-between gap-2"><div><h2 class="font-bold">Динамика заявок</h2><p class="mt-1 text-xs text-muted">Новые обращения по дате создания</p></div><span class="flex items-center gap-2 text-xs text-muted"><span class="h-2 w-2 rounded-full bg-brand"></span>Заявки</span></div><RequestDynamics :series="series"/><div class="flex items-center justify-between border-t border-line pt-3 text-xs text-muted"><span>{{ shortDate(dayOffset(1 - period) + 'T12:00:00') }} — {{ shortDate(today + 'T12:00:00') }}</span><span><strong class="text-content">{{ requests.length }}</strong> за период</span></div></Card>
    <Card padding="lg"><h2 class="font-bold">Каналы обращений</h2><p class="mt-1 text-xs text-muted">Как клиенты выбирают ремонт</p><ServiceChannels :total="requests.length" :onsite="onsite"/></Card>
   </section>
   <section class="grid gap-5 xl:grid-cols-2">
    <AdminAttentionQueue :requests="attention"/>
    <Card padding="none" class="overflow-hidden"><div class="flex flex-wrap items-center justify-between gap-2 border-b border-line p-5"><div><h2 class="font-bold">Загрузка мастеров</h2><p class="mt-1 text-xs text-muted">Заявки на сегодня, включая выполненные</p></div><Button size="sm" variant="ghost" to="/admin/masters">Команда <SvgIcon name="arrowRight" :size="15"/></Button></div><div class="divide-y divide-line"><div v-for="m in adminMasters" :key="m.id" class="flex items-center gap-3 px-5 py-4"><PersonAvatar :name="m.full_name" :src="m.avatar" :size="42"/><div class="min-w-0 flex-1"><div class="flex justify-between gap-3"><strong class="truncate text-xs">{{ m.full_name }}</strong><span class="shrink-0 text-xs text-muted">{{ masterLoad(m) }} / {{ m.max_daily_requests }}</span></div><div class="mt-2 h-1.5 overflow-hidden rounded-full bg-surface2" role="progressbar" :aria-label="`Загрузка ${m.full_name}`" :aria-valuenow="masterLoad(m)" :aria-valuemax="m.max_daily_requests" aria-valuemin="0"><div class="h-full rounded-full transition-all duration-700" :class="masterLoad(m) >= m.max_daily_requests ? 'bg-warn' : 'bg-brand'" :style="{ width: Math.min(100, masterLoad(m) / m.max_daily_requests * 100) + '%' }"></div></div><p class="mt-1 text-[10px] text-muted">{{ workModeLabel(m) }}</p></div></div></div><footer class="admin-team-today"><div class="admin-team-capacity"><div><strong>{{freeDailyCapacity}}</strong><span>заявок до дневного лимита<br/>у доступных мастеров</span></div><SvgIcon name="calendar" :size="25"/></div><div class="admin-team-plan-title"><h3>Назначено на сегодня</h3><span>По времени заявки</span></div><RouterLink v-for="r in plannedToday" :key="r.id" :to="'/admin/requests?request='+r.id" class="admin-team-appointment"><time>{{r.preferred_slot.slice(0,5)}}</time><span><DeviceArt :name="equipmentArt(r.service?.equipment_category)"/></span><div><strong>{{r.master?.full_name}}</strong><p>{{r.service?.name}}</p></div><SvgIcon name="chevronRight" :size="14"/></RouterLink><p v-if="!plannedToday.length" class="text-sm text-muted">Назначений на сегодня пока нет.</p></footer></Card>
   </section>
   <Card v-if="draftOrder" padding="md" class="border-warn/25"><div class="flex flex-wrap items-center gap-4"><span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-warn/10 text-warn"><SvgIcon name="truck" :size="23"/></span><div class="min-w-0 flex-1 basis-[200px]"><h2 class="text-sm font-bold">Черновик закупки {{ draftOrder.order_number }}</h2><p class="mt-1 text-xs text-muted">{{ draftItems.length }} позиций ниже доступного минимума · ожидает подтверждения</p></div><Button size="sm" variant="outline" class="w-full sm:w-auto" @click="orderOpen = true">Проверить заказ<SvgIcon name="arrowRight" :size="15"/></Button></div></Card>
   <section class="grid gap-5 xl:grid-cols-2">
    <Card padding="lg"><div class="flex flex-wrap items-center justify-between gap-2"><div><h2 class="font-bold">Критичные остатки</h2><p class="mt-1 text-xs text-muted">Центральный склад · доступный остаток ниже минимума</p></div><Button size="sm" variant="ghost" to="/admin/warehouse?critical=1">На склад <SvgIcon name="arrowRight" :size="15"/></Button></div><div class="mt-4 grid gap-2"><div v-for="s in critical" :key="s.id" class="flex items-center gap-3 rounded-xl border border-danger/15 bg-danger/5 p-3"><span class="admin-part-art"><PartArt :kind="adminPartKind(s.part_id).kind"/></span><div class="min-w-0 flex-1"><strong class="block truncate text-xs">{{ s.name }}</strong><span class="text-[10px] text-muted">{{ s.sku }} · минимум {{ s.min_stock }} шт.</span></div><Badge tone="red">{{ s.available }} шт.</Badge></div><p v-if="!critical.length" class="py-8 text-center text-sm text-muted">Все остатки в норме</p></div><p class="mt-4 text-[11px] leading-relaxed text-muted">Доступный остаток с учётом резервов показан в разделе «Склад».</p></Card>
    <Card padding="lg"><div class="flex items-center gap-2"><SvgIcon name="analytics" class="text-brand" :size="18"/><h2 class="font-bold">Последние действия</h2></div><p class="mt-1 text-xs text-muted">Журнал аудита · последние 10 событий</p><div class="audit-list mt-5 max-h-80 overflow-y-auto pr-2"><div v-for="(event, i) in auditEvents.slice(0,10)" :key="event.id" class="relative flex gap-3 pb-5"><span v-if="i < auditEvents.length - 1" class="absolute bottom-0 left-[14px] top-8 w-px bg-line"></span><span class="z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full" :class="event.action === 'request.created' ? 'bg-brand/10 text-brand' : 'bg-ok/10 text-ok'"><SvgIcon :name="event.action === 'request.created' ? 'plus' : 'check'" :size="14"/></span><div class="min-w-0 flex-1"><div class="flex justify-between gap-2"><strong class="text-xs">{{auditLabel(event)}}</strong><time class="shrink-0 text-[10px] text-muted">{{ new Date(event.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }) }}</time></div><RouterLink :to="auditTarget(event)" class="mt-1 block text-xs text-brand hover:underline">{{JSON.parse(event.details).request_number??JSON.parse(event.details).order_number??'Запись #'+event.entity_id}}</RouterLink><span class="text-[10px] text-muted">{{ ({admin:'Администратор',master:'Мастер',client:'Клиент',system:'Система'})[event.role] ?? 'Неизвестная роль' }}</span></div></div></div></Card>
   </section>
  </PageState>
  <Modal v-model="orderOpen" title="Проверка закупки" :description="draftOrder?.order_number??'Закупка'"><p class="mb-4 text-xs text-muted">Центральный склад</p><div class="grid gap-3"><div v-for="item in draftItems" :key="item.id" class="flex items-center justify-between gap-4 rounded-xl bg-surface2 p-3"><div class="min-w-0"><strong class="block text-xs">{{ adminParts.find(p => p.id === item.part_id)?.name }}</strong><span class="text-xs text-muted">{{ item.quantity }} шт.</span></div><span class="shrink-0 text-xs font-semibold">{{ money(item.quantity * item.unit_price) }}</span></div></div><DraftOrderEditor :order="draftOrder" :items="draftItems" :parts="adminParts"/><p class="mt-4 text-sm font-bold">Итого: {{ money(draftItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)) }}</p><template #footer><Button variant="outline" @click="orderOpen = false">Закрыть</Button><Button variant="primary" @click="confirmOrder">Подтвердить закупку</Button></template></Modal>
 </div>
</template>
<style scoped>.overview-hero{background:radial-gradient(ellipse at 70% 10%,color-mix(in srgb,var(--blue) 13%,transparent),transparent 70%),var(--surface)}.donut-fill{animation:donut-in 1s ease both}@keyframes donut-in{from{stroke-dasharray:0 100}}@media(prefers-reduced-motion:reduce){.donut-fill{animation:none}}</style>
