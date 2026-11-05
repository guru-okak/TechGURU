<script setup>
import { computed, reactive, ref, watch } from 'vue'
import Modal from './ui/Modal.vue'
import Button from './ui/Button.vue'
import Textarea from './ui/Textarea.vue'
import SvgIcon from './ui/SvgIcon.vue'
import { formatPartPrice } from '../data/parts'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  request: { type: Object, default: null },
  parts: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'close', 'submit'])

const usage = reactive({})
const comment = ref('')

const isDropoff = computed(() => props.request?.service_mode === 'dropoff')

const usedTotal = computed(() =>
  props.parts.reduce((sum, item) => sum + (usage[item.id]?.used || 0), 0),
)
const returnedTotal = computed(() =>
  props.parts.reduce((sum, item) => sum + (usage[item.id]?.returned || 0), 0),
)

function resetState() {
  comment.value = ''
  Object.keys(usage).forEach((key) => delete usage[key])
  props.parts.forEach((item) => {
    usage[item.id] = { used: outstandingQuantity(item), returned: 0 }
  })
}

function clamp(value, max) {
  const next = Number(value)
  if (!Number.isFinite(next)) return 0
  return Math.max(0, Math.min(Math.round(next), max))
}

function outstandingQuantity(item) {
  return Math.max(0, (item.issued_quantity ?? 0) - (item.used_quantity ?? 0) - (item.returned_quantity ?? 0))
}

function setQuantity(item, field, input) {
  const available = outstandingQuantity(item)
  const quantity = clamp(input.value, available)
  const otherField = field === 'used' ? 'returned' : 'used'
  usage[item.id] = { [field]: quantity, [otherField]: available - quantity }
  input.value = quantity
}

function confirm() {
  const snapshot = {}
  props.parts.forEach((item) => {
    snapshot[item.id] = { ...usage[item.id] }
  })
  emit('submit', { usage: snapshot, comment: comment.value.trim() })
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) resetState()
  },
)
</script>

<template>
  <Modal
    :model-value="modelValue"
    title="Завершение ремонта"
    :description="request ? `#${request.number} · ${request.device}` : ''"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('close')"
  >
    <div class="grid gap-2">
      <div
        v-if="parts.length"
        class="hidden grid-cols-[minmax(0,1fr)_150px_150px] gap-3 px-1 pb-1 text-[12px] font-semibold uppercase tracking-wide text-muted md:grid"
      >
        <span>Деталь</span>
        <span class="text-center">Использовано</span>
        <span class="text-center">Возвращено</span>
      </div>

      <div
        v-for="item in parts"
        :key="item.id"
        class="grid grid-cols-2 items-center gap-3 rounded-xl border border-line px-3 py-3 md:grid-cols-[minmax(0,1fr)_150px_150px]"
      >
        <div class="col-span-2 min-w-0 md:col-span-1">
          <span class="block truncate text-base font-semibold" :title="item.part?.name">
            {{ item.part?.name ?? `Запчасть #${item.part_id}` }}
          </span>
          <span class="mt-0.5 block text-[13px] text-muted">
            Запрошено: {{ item.quantity }} шт · {{ formatPartPrice(item.unit_price) }}
          </span>
          <span class="block text-[13px] text-muted">
            {{ outstandingQuantity(item) ? `К учёту: ${outstandingQuantity(item)} шт` : 'Нет выданных деталей к учёту' }}
          </span>
        </div>

        <label class="grid gap-1">
          <span class="text-[13px] font-medium text-muted md:hidden">Использовано</span>
          <input
            type="number"
            min="0"
            :max="outstandingQuantity(item)"
            :disabled="!outstandingQuantity(item)"
            class="control-base w-full px-3 py-2 text-center text-base outline-none"
            :value="usage[item.id]?.used ?? 0"
            @input="setQuantity(item, 'used', $event.target)"
          />
        </label>

        <label class="grid gap-1">
          <span class="text-[13px] font-medium text-muted md:hidden">Возвращено</span>
          <input
            type="number"
            min="0"
            :max="outstandingQuantity(item)"
            :disabled="!outstandingQuantity(item)"
            class="control-base w-full px-3 py-2 text-center text-base outline-none"
            :value="usage[item.id]?.returned ?? 0"
            @input="setQuantity(item, 'returned', $event.target)"
          />
        </label>
      </div>

      <p
        v-if="!parts.length"
        class="rounded-xl border border-line px-4 py-8 text-center text-base text-muted"
      >
        К заявке не привязано ни одной запчасти. Можно завершить ремонт без списания.
      </p>
    </div>

    <div class="mt-5">
      <Textarea
        v-model="comment"
        label="Комментарий к ремонту"
        hint="Необязательно. Кратко опишите выполненные работы."
        :rows="3"
        placeholder="Что было сделано, какие детали заменены…"
      />
    </div>

    <p class="mt-3 text-[14px] text-muted">
      Итог: использовано
      <strong class="text-content">{{ usedTotal }}</strong>,
      возвращено <strong class="text-content">{{ returnedTotal }}</strong>
      <template v-if="isDropoff"> · заявка станет «Готово к выдаче»</template>
    </p>

    <template #footer="{ close }">
      <Button variant="ghost" @click="close">Отмена</Button>
      <Button variant="primary" @click="confirm">
        <template #iconLeft><SvgIcon name="checkCircle" :size="18" /></template>
        Подтвердить
      </Button>
    </template>
  </Modal>
</template>

<style scoped>
.control-base {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.control-base:focus {
  border-color: var(--blue);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--blue) 20%, transparent);
}
</style>
