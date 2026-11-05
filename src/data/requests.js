import { reactive } from 'vue'
import {serviceMedia} from '../api/presentation'
import { statusFilterOptions } from '../config/statuses'
import { users, DEMO_CLIENT_ID } from './users'
import { services } from './services'
import { masters } from './masters'
import { servicePoints } from './servicePoints'
import { withDelay } from './mockApi'

// Заявки (таблица requests по схеме БД).
// Поля строго соответствуют SQL:
// id, user_id, service_id, master_id, service_mode, dropoff_point_id,
// client_address, preferred_datetime, description, status, total_price,
// created_at, updated_at.
//
// Презентационные поля (модель устройства, иконка) в БД не хранятся —
// они лежат отдельно в requestPresentation и добавляются при чтении.
export const requests = reactive([])

for (const row of requests) {
  row.request_number = `TGR-${row.created_at.slice(0, 4)}-${String(row.id).padStart(5, '0')}`
  const hour = Number(row.preferred_datetime.slice(11, 13))
  row.preferred_slot = `${String(hour).padStart(2, '0')}:00-${String(hour + 2).padStart(2, '0')}:00`
  row.needs_manual_review = 0
}

// Презентационные поля, отсутствующие в таблице requests.
const requestPresentation = {
  2496: { device: 'Ноутбук Acer Aspire 5', icon: 'laptop' },
  2495: { device: 'Смартфон Xiaomi 13', icon: 'smartphone' },
  2494: { device: 'Ноутбук Apple MacBook Air', icon: 'laptop' },
  2493: { device: 'Телевизор LG OLED', icon: 'tv' },
  2492: { device: 'Стиральная машина Samsung', icon: 'washer' },
  2491: { device: 'Планшет Lenovo Tab M10', icon: 'tablet' },
  2490: { device: 'Холодильник Beko', icon: 'fridge' },
  2489: { device: 'Смартфон Google Pixel 7', icon: 'smartphone' },
  2488: { device: 'Принтер HP LaserJet', icon: 'printer' },
  2487: { device: 'Смартфон Samsung Galaxy S23', icon: 'smartphone' },
  2486: { device: 'Ноутбук Lenovo IdeaPad', icon: 'laptop' },
  2485: { device: 'Стиральная машина Bosch', icon: 'washer' },
  2484: { device: 'Телевизор LG', icon: 'tv' },
  2483: { device: 'Холодильник Samsung', icon: 'fridge' },
  2482: { device: 'Планшет iPad Air', icon: 'tablet' },
  2481: { device: 'Смартфон iPhone 14', icon: 'smartphone' },
  2480: { device: 'Телевизор Samsung QLED', icon: 'tv' },
  2479: { device: 'Ноутбук ASUS VivoBook', icon: 'laptop' },
  2478: { device: 'Холодильник LG', icon: 'fridge' },
  2477: { device: 'Планшет Samsung Tab S8', icon: 'tablet' },
  2464: { device: 'Стиральная машина LG', icon: 'washer' },
}

const MONTHS = [
  'янв',
  'фев',
  'мар',
  'апр',
  'мая',
  'июн',
  'июл',
  'авг',
  'сен',
  'окт',
  'ноя',
  'дек',
]

export function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value))
}

// Длительность работ услуги: 150 → «2 ч 30 мин».
export function formatDuration(minutes) {
  if (!minutes) return '—'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours && rest) return `${hours} ч ${rest} мин`
  if (hours) return `${hours} ч`
  return `${rest} мин`
}

function formatMoney(value) {
  if (!value) return '—'
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

function initialsOf(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
}

export function toRequestView(request) {
  const service = services.find((s) => s.id === request.service_id)
  const client = users.find((u) => u.id === request.user_id)
  const master = masters.find((m) => m.id === request.master_id)
  const masterUser = master ? users.find((u) => u.id === master.user_id) : null
  const point = servicePoints.find((p) => p.id === request.dropoff_point_id)
  const presentation = requestPresentation[request.id] ?? {}

  return {
    ...request,
    number: request.id,
    address: request.client_address,
    desired_datetime: request.preferred_datetime,
    client: request.client_name ?? client?.full_name ?? 'Клиент',
    clientPhone: request.contact_phone ?? client?.phone ?? '—',
    clientEmail: client?.email ?? null,
    initials: initialsOf(client?.full_name),
    service: request.service_name ?? service?.name ?? 'Услуга',
    service_name: request.service_name ?? service?.name ?? 'Услуга',
    device: request.description,
    icon: serviceMedia(service??{}).icon,
    photos: typeof request.photos==='string'?JSON.parse(request.photos):request.photos??[],
    description: request.description,
    channel: request.service_mode === 'onsite' ? 'Onsite' : 'Dropoff',
    master: request.master_name ?? masterUser?.full_name ?? 'Не назначен',
    service_point: point?.name ?? null,
    date: formatDateTime(request.created_at),
    dateISO: new Date(request.created_at).toLocaleDateString('en-CA',{timeZone:'Europe/Moscow'}),
    desiredDate: formatDateTime(request.preferred_datetime),
    desiredDateISO: request.preferred_datetime ? new Date(request.preferred_datetime).toLocaleDateString('en-CA',{timeZone:'Europe/Moscow'}) : null,
    time: request.preferred_datetime ? new Date(request.preferred_datetime).toLocaleTimeString('en-GB',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'}) : '—',
    serviceDuration: formatDuration(service?.average_duration_minutes),
    price: formatMoney(request.total_price),
  }
}

// Готовые view-модели для существующих экранов.
// reactive: статус заявки меняется мастером — список, дашборд и админка
// должны обновляться без перезагрузки.
export const requestsView = reactive(requests.map(toRequestView))

// Демо-клиент: заявки Анны Смирновой.
export const clientRequests = reactive([])

// Демо-мастер: Сергей Иванов (masters.id = 1, users.id = 3).
export let CURRENT_MASTER_ID = 0
export function setCurrentMaster(id){CURRENT_MASTER_ID=id}
export const masterRequests = reactive([])

// Опции фильтра по статусу (источник — src/config/statuses.js).
export const requestStatuses = statusFilterOptions

export const requestPeriods = [
  'Последние 7 дней',
  'Последние 30 дней',
  'Последние 90 дней',
  'За всё время',
]

// --- Асинхронный мок-API (с имитацией задержки) ---

export function fetchRequests() {
  return withDelay(requestsView)
}

export function fetchClientRequests(userId = DEMO_CLIENT_ID) {
  return Promise.resolve(clientRequests)
}

export function fetchMasterRequests(){return Promise.resolve(masterRequests)}

export function fetchRequestById(id) {
  return withDelay(requestsView.find((r) => r.id === id) ?? null, undefined, false)
}

// Заявка мастера: id + проверка принадлежности (RBAC на уровне данных).
export function fetchMasterRequestById(id, masterId = CURRENT_MASTER_ID) {
  return withDelay(
    requestsView.find((r) => r.id === id && r.master_id === masterId) ?? null,
    undefined,
    false,
  )
}

// Популярные услуги (дашборд)
export const popularServices = [
  {
    label: 'Ремонт смартфонов',
    icon: 'smartphone',
    note: 'Замена экрана, батареи',
    price: 'от 1 500 ₽',
    features: ['Оригинальные дисплеи', 'Замена за 1–2 часа', 'Гарантия до 12 месяцев'],
  },
  {
    label: 'Ремонт ноутбуков',
    icon: 'laptop',
    note: 'Чистка, клавиатура',
    price: 'от 1 200 ₽',
    features: ['Чистка охлаждения', 'Замена термопасты', 'Установка Windows'],
  },
  {
    label: 'Ремонт планшетов',
    icon: 'tablet',
    note: 'Замена дисплея',
    price: 'от 3 500 ₽',
    features: ['Дисплей в сборе', 'Калибровка сенсора', 'Гарантия до 12 месяцев'],
  },
]

// Преимущества (дашборд / создание заявки)
export const advantages = [
  { title: 'Быстрое обслуживание', text: 'Среднее время ремонта — 1–3 дня', icon: 'bolt' },
  { title: 'Гарантия на работы', text: 'До 12 месяцев', icon: 'shield' },
  { title: 'Опытные мастера', text: 'Более 5 лет опыта', icon: 'star' },
]
