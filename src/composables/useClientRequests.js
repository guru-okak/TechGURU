import { computed, onMounted, ref } from 'vue'
import { fetchClientRequests } from '../data/requests'

// Загрузка заявок текущего клиента со состояниями loading/error
// и производной статистикой для клиентских экранов.
// Фильтры по поиску/статусу/периоду живут в useRequestsFilter
// (общие с поиском в Header).
export function useClientRequests() {
  const requests = ref([])
  const loading = ref(true)
  const error = ref(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      requests.value = await fetchClientRequests()
    } catch (e) {
      error.value = e
      requests.value = []
    } finally {
      loading.value = false
    }
  }

  const stats = computed(() => {
    const list = requests.value
    const by = (code) => list.filter((r) => r.status === code).length
    const total = list.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0)
    return {
      total: list.length,
      active: list.filter((r) =>
        [
          'new',
          'confirmed',
          'assigned',
          'in_progress',
          'waiting_parts',
          'ready_for_pickup',
        ].includes(r.status),
      ).length,
      newCount: by('new'),
      assigned: by('assigned'),
      in_progress: by('in_progress'),
      waiting_parts: by('waiting_parts'),
      ready_for_pickup: by('ready_for_pickup'),
      completed: by('completed'),
      closed: by('closed'),
      cancelled: by('cancelled') + by('rejected'),
      totalPrice: total,
    }
  })

  onMounted(load)

  return { requests, loading, error, stats, load }
}
