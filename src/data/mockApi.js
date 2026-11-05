// Имитация сетевой задержки для мок-слоя.
// Позволяет заранее проектировать состояния загрузки (Skeleton) в интерфейсе.
export const MOCK_DELAY = 300

// clone = false возвращает исходные ссылки без копирования.
// Нужно для реактивных разделов (кабинет мастера), где изменение статуса
// должно сразу отражаться в уже загруженных данных.
export function withDelay(value, ms = MOCK_DELAY, clone = true) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!clone) {
        resolve(value)
        return
      }
      try {
        resolve(structuredClone(value))
      } catch (e) {
        resolve(value)
      }
    }, ms)
  })
}
