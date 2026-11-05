import { computed, onMounted, ref } from 'vue'
import { CURRENT_MASTER_ID, fetchMasterRequests } from '../data/requests'

// Активные для мастера статусы: заявка назначена и ещё не завершена.
export const MASTER_ACTIVE_STATUSES = [
  'assigned',
  'in_progress',
  'waiting_parts',
  'ready_for_pickup',
]

// Хронологический порядок: сначала самые ранние работы,
// при совпадении даты — по возрастанию номера заявки.
function byDesiredAsc(a, b) {
  const byDate = String(a.desired_datetime ?? '').localeCompare(
    String(b.desired_datetime ?? ''),
  )
  if (byDate !== 0) return byDate
  return Number(a.number) - Number(b.number)
}

// Загрузка заявок текущего мастера со состояниями loading/error
// и производной статистикой для кабинета мастера.
export function useMasterRequests(masterId = CURRENT_MASTER_ID) {
  const requests = ref([])
  const loading = ref(true)
  const error = ref(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      requests.value = await fetchMasterRequests(masterId)
    } catch (e) {
      error.value = e
      requests.value = []
    } finally {
      loading.value = false
    }
  }

  const sortedRequests = computed(() => [...requests.value].sort(byDesiredAsc))

  const activeRequests = computed(() =>
    sortedRequests.value.filter((r) => MASTER_ACTIVE_STATUSES.includes(r.status)),
  )

  const stats = computed(() => {
    const list = requests.value
    const by = (code) => list.filter((r) => r.status === code).length
    return {
      total: list.length,
      active: activeRequests.value.length,
      inProgress: by('in_progress'),
      waitingParts: by('waiting_parts'),
      closed: by('completed') + by('closed'),
    }
  })

  onMounted(load)

  return { requests, sortedRequests, activeRequests, loading, error, stats, load }
}
