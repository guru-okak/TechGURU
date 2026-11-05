import { computed, onMounted, ref } from 'vue'
import { fetchMasterStock } from '../data/parts'
import { useRoute } from 'vue-router'
import { masterRequests } from '../data/requests'
import { requestParts } from '../data/requestParts'

// Запас мастера «на руках»: остатки мобильного склада + счётчик «в заявке»
// (сколько единиц детали закреплено за активными заявками мастера).
export function useMasterStock() {
  const route = useRoute()
  let attempts = 0
  const rows = ref([])
  const loading = ref(true)
  const error = ref(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const result = await fetchMasterStock()
      const state = attempts++ === 0 ? route.query.state : null
      if (state === 'loading') return
      if (state === 'error') throw new Error('Preview error')
      rows.value = state === 'empty' ? [] : result
    } catch (e) {
      error.value = e
      rows.value = []
    } finally {
      if (!(route.query.state === 'loading' && attempts === 1)) loading.value = false
    }
  }

  const inRequests = computed(() => {
    const ids = new Set(masterRequests.map((r) => r.id))
    const counts = {}
    requestParts.forEach((item) => {
      if (item.status !== 'reserved' || !ids.has(item.request_id)) return
      counts[item.part_id] = (counts[item.part_id] ?? 0) + item.quantity
    })
    return counts
  })

  const items = computed(() =>
    rows.value.map((row) => ({
      ...row,
      inRequests: inRequests.value[row.part_id] ?? 0,
    })),
  )

  const stats = computed(() => ({
    positions: items.value.length,
    units: items.value.reduce((sum, r) => sum + r.quantity, 0),
    low: items.value.filter((r) => r.quantity < r.min_stock).length,
  }))

  onMounted(load)

  return { rows: items, loading, error, stats, load }
}
