import { reactive } from 'vue'
// Только локальное состояние интерфейса; одна оценка на request_id.
export const clientRatings = reactive([])
export const requestPhases = ['Заявка', 'Мастер', 'Ремонт', 'Результат']
export function requestPhase(status) { return ({ new: 0, confirmed: 0, assigned: 1, in_progress: 2, waiting_parts: 2, ready_for_pickup: 3, completed: 3, closed: 3 })[status] ?? -1 }
export const requestHints = { new: 'Проверяем детали вашего обращения', confirmed: 'Заявка подтверждена. Подбираем специалиста', assigned: 'Мастер назначен и готовится к работе', in_progress: 'Мастер работает над вашим устройством', waiting_parts: 'Ожидаем необходимые детали. Обновление придёт в уведомления', ready_for_pickup: 'Ремонт окончен. Устройство можно получить в сервисе', completed: 'Работы завершены. Можно оценить мастера', closed: 'Обращение закрыто. Спасибо, что выбрали TechGURU', cancelled: 'Заявка отменена', rejected: 'Обращение отклонено администратором' }
