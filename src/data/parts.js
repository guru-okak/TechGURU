import { reactive } from 'vue'
import { withDelay } from './mockApi'

// Каталог запчастей (таблица parts по схеме БД).
// Поля parts: id, name, sku, description, unit_price, supplier_id, min_stock, is_active.
export const parts = reactive([])

// Склады (таблица warehouses по схеме БД).
// Дополнительное поле kind — презентационное (central | mobile).
export const warehouses = reactive([])

// Мобильный склад (запас «на руках» у мастера) — демо warehouse_id = 2.
export const MOBILE_WAREHOUSE_ID = 2

// Остатки (таблица stock по схеме БД).
// Поля stock: id, part_id, warehouse_id, quantity, reserved_quantity.
export const stock = reactive([])

// Доступно к выдаче с центрального склада.
export function availabilityOf(partId) {
  return stock
    .filter((s) => s.part_id === partId && s.warehouse_id === warehouses.find(w=>w.type==='central')?.id)
    .reduce((sum, s) => sum + s.quantity - s.reserved_quantity, 0)
}

export function partById(partId) {
  return parts.find((p) => p.id === partId) ?? null
}

export function fetchParts() {
  return withDelay(parts)
}

// Запас «на руках» у мастера: остатки мобильного склада с данными каталога.
export function fetchMasterStock(warehouseId = warehouses.find(w=>w.type==='master')?.id) {
  const rows = stock
    .filter((s) => s.warehouse_id === warehouseId)
    .map((s) => {
      const part = partById(s.part_id)
      return {
        id: s.id,
        part_id: s.part_id,
        name: part?.name ?? `Запчасть #${s.part_id}`,
        sku: part?.sku ?? '—',
        unit_price: part?.unit_price ?? 0,
        quantity: s.quantity,
        reserved_quantity: s.reserved_quantity,
        min_stock: part?.min_stock ?? 0,
      }
    })
  return withDelay(rows)
}

export function formatPartPrice(value) {
  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}
