import { ref } from 'vue'

export const toasts = ref([])

let counter = 0

export function toast(message) {
  const id = ++counter
  toasts.value.push({ id, message })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 3200)
}
