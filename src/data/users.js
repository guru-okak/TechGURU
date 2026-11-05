import { reactive } from 'vue'
// Пользователи (таблица users по схеме БД).
// Поля строго соответствуют SQL: id, full_name, phone, email, role, address,
// password_hash, is_active, created_at.
export const users = reactive([])

// Демо-клиент, от имени которого работают клиентские экраны.
export let DEMO_CLIENT_ID = 0
export function setCurrentClient(id){DEMO_CLIENT_ID=id}

export function getUserById(id) {
  return users.find((u) => u.id === id) ?? null
}
