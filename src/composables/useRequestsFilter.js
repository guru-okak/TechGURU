import { ref } from 'vue'

// Общее состояние фильтров страницы «Мои заявки».
// Используется и в Header (поиск), и в самой странице.
const search = ref('')
const status = ref('all')
const period = ref('Последние 30 дней')

export function useRequestsFilter() {
  function reset() {
    search.value = ''
    status.value = 'all'
    period.value = 'Последние 30 дней'
  }

  return { search, status, period, reset }
}
