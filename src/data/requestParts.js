import { reactive } from 'vue'
import { partById, parts } from './parts'

// Позиции запчастей по заявке (таблица request_parts по схеме БД).
// Основные поля: id, request_id, part_id, quantity, status, unit_price.
// status: reserved (зарезервировано) | used (израсходовано) | returned (возвращено).
// Дополнительные поля used_quantity / returned_quantity — презентационные,
// для экрана завершения ремонта.
export const requestParts = reactive([])

let seq = 100

export function partsForRequest(requestId) {
  return requestParts.filter((r) => r.request_id === requestId)
}

// Позиции с подтянутыми данными каталога для UI.
export function partsWithCatalog(requestId) {
  return partsForRequest(requestId).map((item) => ({
    ...item,
    part: partById(item.part_id),
  }))
}

// Кол-во позиций, ожидающих выдачу (для статистики на карточке).
export function reservedCount(requestId) {
  return partsForRequest(requestId).filter((r) => r.status === 'reserved').length
}

export const PARTS_CATALOG = parts
