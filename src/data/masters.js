import { reactive } from 'vue'
// Профили мастеров (таблица masters по схеме БД).
// Поля: id, user_id, experience_years, service_area, max_daily_requests, rating.
// Навыки и расписание вынесены в master_skills / master_schedule.
export const masters = reactive([])

export function getMasterById(id) {
  return masters.find((m) => m.id === id) ?? null
}
