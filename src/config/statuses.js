// Единый источник истины по статусам заявки.
// Список из 10 кодов строго по ТЗ (п. 4.3.2), совпадает с CHECK-ограничением
// в схеме БД (таблица requests).
export const STATUSES = [
  { code: 'new', label: 'Новая', tone: 'purple', badge: 'badge-purple' },
  { code: 'confirmed', label: 'Подтверждена', tone: 'green', badge: 'badge-green' },
  { code: 'assigned', label: 'Назначена', tone: 'blue', badge: 'badge-blue' },
  { code: 'in_progress', label: 'В работе', tone: 'amber', badge: 'badge-amber' },
  { code: 'waiting_parts', label: 'Ожидание запчастей', tone: 'orange', badge: 'badge-orange' },
  { code: 'ready_for_pickup', label: 'Готово к выдаче', tone: 'orange', badge: 'badge-orange' },
  { code: 'completed', label: 'Завершена', tone: 'green', badge: 'badge-green' },
  { code: 'closed', label: 'Закрыта', tone: 'gray', badge: 'badge-gray' },
  { code: 'cancelled', label: 'Отменена', tone: 'gray', badge: 'badge-gray' },
  { code: 'rejected', label: 'Отклонена', tone: 'red', badge: 'badge-red' },
]

const byCode = Object.fromEntries(STATUSES.map((s) => [s.code, s]))
const byLabel = Object.fromEntries(STATUSES.map((s) => [s.label, s]))

// Допускаем и код ('in_progress'), и русскую подпись ('В работе').
function resolve(status) {
  return byCode[status] ?? byLabel[status] ?? null
}

export function statusLabel(status) {
  return resolve(status)?.label ?? status
}

// Тон для компонента Badge (Badge.vue).
export function statusTone(status) {
  return resolve(status)?.tone ?? 'gray'
}

// Устаревший API для страниц, ещё не переведённых на Badge.
export function statusBadgeClass(status) {
  return resolve(status)?.badge ?? 'badge-gray'
}

// Статусы, из которых клиент может отменить заявку действием cancel
// (ТЗ: new → cancelled, confirmed → cancelled).
export const CLIENT_CANCELLABLE = ['new', 'confirmed']

// Опции для фильтра «Мои заявки» (с пунктом «Все статусы»).
export const statusFilterOptions = [
  { value: 'all', label: 'Все статусы' },
  ...STATUSES.map((s) => ({ value: s.code, label: s.label })),
]
