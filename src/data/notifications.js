import { withDelay } from './mockApi'
import { DEMO_CLIENT_ID } from './users'

// Уведомления (таблица notifications по схеме БД).
// БД-поля: id, user_id, request_id, message, is_read, created_at.
// Презентационные поля (type, title, group) добавлены отдельно для UI.
export const notifications = [
  {
    id: 1,
    user_id: DEMO_CLIENT_ID,
    request_id: 2495,
    message: 'Ваша заявка на ремонт смартфона Xiaomi 13 принята. Ожидаем поступления запчасти.',
    is_read: 0,
    created_at: '2026-04-26 10:07:00',
  },
  {
    id: 6,
    user_id: DEMO_CLIENT_ID,
    request_id: 2495,
    message: 'Требуется модуль связи для смартфона Xiaomi 13. Мы сообщим, когда деталь поступит.',
    is_read: 0,
    created_at: '2026-04-26 09:32:00',
  },
  {
    id: 2,
    user_id: DEMO_CLIENT_ID,
    request_id: 2494,
    message: 'На заявку #2494 (ноутбук Apple MacBook Air) назначен мастер Константин Петров.',
    is_read: 0,
    created_at: '2026-04-25 18:15:00',
  },
  {
    id: 4,
    user_id: DEMO_CLIENT_ID,
    request_id: 2492,
    message: 'Мастер приступил к ремонту стиральной машины по заявке #2492.',
    is_read: 0,
    created_at: '2026-04-25 17:10:00',
  },
  {
    id: 7,
    user_id: DEMO_CLIENT_ID,
    request_id: 2489,
    message: 'Вы отменили заявку на ремонт Google Pixel 7. Если это ошибка — создайте новую.',
    is_read: 1,
    created_at: '2026-04-25 14:35:00',
  },
  {
    id: 3,
    user_id: DEMO_CLIENT_ID,
    request_id: 2493,
    message: 'Мастер согласовал выезд по адресу: г. Москва, ул. Ленина, д. 12.',
    is_read: 0,
    created_at: '2026-04-23 12:20:00',
  },
  {
    id: 5,
    user_id: DEMO_CLIENT_ID,
    request_id: 2491,
    message: 'Экран планшета Lenovo Tab M10 заменён. Приходите забирать или оформите выезд.',
    is_read: 1,
    created_at: '2026-04-21 15:40:00',
  },
  {
    id: 8,
    user_id: DEMO_CLIENT_ID,
    request_id: 2488,
    message: 'Принтер HP LaserJet не подлежит ремонту: повреждён механизм подачи бумаги.',
    is_read: 1,
    created_at: '2026-04-19 10:02:00',
  },
  {
    id: 9,
    user_id: DEMO_CLIENT_ID,
    request_id: 2483,
    message: 'Заявка на ремонт холодильника Samsung закрыта. Спасибо, что выбрали TechGURU!',
    is_read: 1,
    created_at: '2026-04-12 14:17:00',
  },
  {
    id: 10,
    user_id: DEMO_CLIENT_ID,
    request_id: 2491,
    message: 'Мастер приедет 21 апреля в интервале 10:00–12:00 по вашей заявке.',
    is_read: 1,
    created_at: '2026-04-20 08:00:00',
  },
  {
    id: 11,
    user_id: DEMO_CLIENT_ID,
    request_id: 2481,
    message: 'Пожалуйста, оцените работу мастера по заявке #2481 — это займёт минуту.',
    is_read: 1,
    created_at: '2026-04-10 09:20:00',
  },
  {
    id: 12,
    user_id: DEMO_CLIENT_ID,
    request_id: null,
    message: 'Спасибо за регистрацию. Теперь вы можете создавать заявки и следить за их статусом.',
    is_read: 1,
    created_at: '2026-04-01 10:15:00',
  },
]

// Презентация: тип уведомления и короткий заголовок.
const notificationPresentation = {
  1: { type: 'success', title: 'Заявка #2495 принята' },
  6: { type: 'warning', title: 'Ожидание запчастей #2495' },
  2: { type: 'info', title: 'Мастер назначен' },
  4: { type: 'info', title: 'Ремонт начат' },
  7: { type: 'warning', title: 'Заявка #2489 отменена' },
  3: { type: 'success', title: 'Заявка #2493 подтверждена' },
  5: { type: 'success', title: 'Заявка #2491 выполнена' },
  8: { type: 'warning', title: 'Заявка #2488 отклонена' },
  9: { type: 'success', title: 'Ремонт завершён #2483' },
  10: { type: 'info', title: 'Напоминание о визите' },
  11: { type: 'info', title: 'Оцените мастера' },
  12: { type: 'success', title: 'Добро пожаловать в TechGURU!' },
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

// Опорная дата демо-данных: «сегодня» = 26 апреля 2026.
const REFERENCE_DATE = new Date('2026-04-26T00:00:00')

function groupOf(value) {
  const date = new Date(value.replace(' ', 'T'))
  const dayMs = 86400000
  const diff = Math.floor((REFERENCE_DATE - new Date(date.getFullYear(), date.getMonth(), date.getDate())) / dayMs)
  if (diff <= 0) return 'today'
  if (diff === 1) return 'yesterday'
  return 'earlier'
}

function formatTime(value) {
  const date = new Date(value.replace(' ', 'T'))
  const group = groupOf(value)
  const time = value.slice(11, 16)
  if (group === 'today') return `Сегодня, ${time}`
  if (group === 'yesterday') return `Вчера, ${time}`
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${time}`
}

export function toNotificationView(item, presentation = notificationPresentation) {
  const meta = presentation[item.id] ?? { type: 'info', title: 'Уведомление' }
  return {
    ...item,
    ...meta,
    text: item.message,
    unread: item.is_read === 0,
    time: formatTime(item.created_at),
    group: groupOf(item.created_at),
  }
}

export const notificationsView = notifications.map(item => toNotificationView(item))

export function fetchNotifications(userId = DEMO_CLIENT_ID) {
  return withDelay(notificationsView.filter((n) => n.user_id === userId))
}

// --- Уведомления мастера ---------------------------------------------------

// users.id мастера демо-сессии (Сергей Иванов).
const MASTER_USER_ID = 3

// Типы: assignment (новое назначение) | status (изменение статуса заявки).
export const masterNotifications = [
  {
    id: 1,
    user_id: MASTER_USER_ID,
    request_id: 2496,
    message: 'Вам назначена новая заявка #2496 (ноутбук Acer Aspire 5). Выезд 26 апреля, 16:00.',
    is_read: 0,
    created_at: '2026-04-26 09:20:00',
  },
  {
    id: 2,
    user_id: MASTER_USER_ID,
    request_id: 2496,
    message: 'Заявка #2496 ожидает вашего принятия в работу.',
    is_read: 0,
    created_at: '2026-04-26 09:22:00',
  },
  {
    id: 3,
    user_id: MASTER_USER_ID,
    request_id: 2495,
    message: 'Заявка #2495 (смартфон Xiaomi 13) переведена в ожидание запчастей.',
    is_read: 0,
    created_at: '2026-04-26 09:32:00',
  },
  {
    id: 4,
    user_id: MASTER_USER_ID,
    request_id: 2495,
    message: 'Напоминание: по заявке #2495 ожидается поставка модуля связи.',
    is_read: 1,
    created_at: '2026-04-25 09:00:00',
  },
  {
    id: 5,
    user_id: MASTER_USER_ID,
    request_id: 2495,
    message: 'Новая заявка #2495 (смартфон Xiaomi 13) назначена вам.',
    is_read: 1,
    created_at: '2026-04-25 08:10:00',
  },
  {
    id: 6,
    user_id: MASTER_USER_ID,
    request_id: 2491,
    message: 'Заявка #2491 завершена. Ожидает выдачи клиенту.',
    is_read: 1,
    created_at: '2026-04-21 15:40:00',
  },
  {
    id: 7,
    user_id: MASTER_USER_ID,
    request_id: 2477,
    message: 'Заявка #2477 закрыта клиентом. Спасибо за работу!',
    is_read: 1,
    created_at: '2026-04-22 12:00:00',
  },
  {
    id: 8,
    user_id: MASTER_USER_ID,
    request_id: 2487,
    message: 'Новая заявка #2487 (Apple MacBook Air) назначена вам.',
    is_read: 0,
    created_at: '2026-04-19 08:30:00',
  },
  {
    id: 9,
    user_id: MASTER_USER_ID,
    request_id: 2487,
    message: 'Клиент подтвердил выезд по заявке #2487 на 19 апреля, 10:00.',
    is_read: 1,
    created_at: '2026-04-18 17:05:00',
  },
  {
    id: 10,
    user_id: MASTER_USER_ID,
    request_id: 2482,
    message: 'Заявка #2482 (стиральная машина Haier) переведена в работу.',
    is_read: 1,
    created_at: '2026-04-17 11:40:00',
  },
  {
    id: 11,
    user_id: MASTER_USER_ID,
    request_id: 2482,
    message: 'Новая заявка #2482 (стиральная машина Haier) назначена вам.',
    is_read: 1,
    created_at: '2026-04-17 09:15:00',
  },
  {
    id: 12,
    user_id: MASTER_USER_ID,
    request_id: 2491,
    message: 'Новая заявка #2491 (планшет Lenovo Tab M10) назначена вам.',
    is_read: 1,
    created_at: '2026-04-11 08:20:00',
  },
]

const masterNotificationPresentation = {
  1: { type: 'assignment', title: 'Новое назначение #2496' },
  2: { type: 'status', title: 'Заявка #2496 ждёт принятия' },
  3: { type: 'status', title: 'Заявка #2495 на ожидании' },
  4: { type: 'status', title: 'Напоминание по заявке #2495' },
  5: { type: 'assignment', title: 'Новое назначение #2495' },
  6: { type: 'status', title: 'Заявка #2491 выполнена' },
  7: { type: 'status', title: 'Заявка #2477 закрыта' },
  8: { type: 'assignment', title: 'Новое назначение #2487' },
  9: { type: 'status', title: 'Клиент подтвердил выезд #2487' },
  10: { type: 'status', title: 'Заявка #2482 в работе' },
  11: { type: 'assignment', title: 'Новое назначение #2482' },
  12: { type: 'assignment', title: 'Новое назначение #2491' },
}

export const masterNotificationsView = masterNotifications.map((n) =>
  toNotificationView(n, masterNotificationPresentation),
)

export function fetchMasterNotifications(userId = MASTER_USER_ID) {
  return withDelay(masterNotificationsView.filter((n) => n.user_id === userId), undefined, false)
}
