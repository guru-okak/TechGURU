import { reactive } from 'vue'
// Точки приёма (таблица service_points по схеме БД).
// Поля: id, name, address, is_active.
// Дополнительные поля (phone, working_hours, lat, lng) — презентационные, для UI
// (координаты нужны для отображения точек на Яндекс.Картах).
export const servicePoints = reactive([])

export function getServicePointById(id) {
  return servicePoints.find((p) => p.id === id) ?? null
}
