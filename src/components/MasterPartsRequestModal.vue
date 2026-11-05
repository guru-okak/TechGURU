<script setup>
import {mutate} from '../api/client'
import PartArt from './illustrations/PartArt.vue'
import { partPresentation } from '../data/partPresentation'
import { computed, reactive, ref, watch } from 'vue'
import Modal from './ui/Modal.vue'
import Button from './ui/Button.vue'
import Input from './ui/Input.vue'
import SvgIcon from './ui/SvgIcon.vue'
import { availabilityOf, formatPartPrice, parts } from '../data/parts'
import { partsForRequest } from '../data/requestParts'
import { toast } from '../composables/useToast'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  request: { type: Object, default: null },
})

const emit = defineEmits(['update:modelValue', 'close', 'waiting'])

const search = ref('')
const quantities = reactive({})
const added = reactive({})

const filteredParts = computed(() => {
  const query = search.value.trim().toLowerCase()
  return parts
    .filter((p) => p.is_active)
    .filter(
      (p) =>
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query),
    )
})

const selectedCount = computed(
  () => parts.filter((p) => (quantities[p.id] || 0) > 0).length,
)

const hasOutOfStock = computed(() =>
  parts.some((p) => (quantities[p.id] || 0) > 0 && availabilityOf(p.id) < (quantities[p.id]||0)),
)

function available(part) {
  return availabilityOf(part.id)
}

function isAdded(part) {
  return (added[part.id] || 0) > 0
}

function inc(part) {
  quantities[part.id] = Math.min((quantities[part.id] || 0) + 1, 99)
}

function dec(part) {
  quantities[part.id] = Math.max(0, (quantities[part.id] || 0) - 1)
}

function setQty(part, value) {
  const next = Number(value)
  quantities[part.id] = Number.isFinite(next)
    ? Math.max(0, Math.min(99, Math.round(next)))
    : 0
}

function resetState() {
  search.value = ''
  Object.keys(quantities).forEach((key) => delete quantities[key])
  Object.keys(added).forEach((key) => delete added[key])

  if (!props.request) return
  partsForRequest(props.request.id).forEach((item) => {
    if (item.status === 'reserved') added[item.part_id] = item.quantity
  })
}

async function requestSelected() {
  if (!props.request || !selectedCount.value) return

  let count = 0
  for (const part of parts) {
    const quantity = quantities[part.id] || 0
    if (quantity <= 0) continue
    await mutate('/business/requests/'+props.request.id+'/parts',{part_id:part.id,quantity})
    added[part.id] = (added[part.id] || 0) + quantity
    quantities[part.id] = 0
    count += 1
  }

  toast(count === 1 ? 'Запчасть добавлена в заявку' : `Добавлено позиций: ${count}`)
  emit('waiting');emit('update:modelValue',false)
}

function markWaitingParts() {
  emit('waiting')
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
    title="Запрос запчастей"
    :description="request ? `#${request.number} · ${request.device}` : ''"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('close')"
  >
    <Input
      v-model="search"
      type="search"
      icon-left="search"
      placeholder="Поиск детали по названию или артикулу…"
      aria-label="Поиск запчасти"
    />

    <div class="mt-4 grid gap-2">
      <div
        class="hidden grid-cols-[minmax(0,1fr)_84px_150px] gap-3 px-3 pb-1 text-[12px] font-semibold uppercase tracking-wide text-muted md:grid"
      >
        <span>Деталь</span>
        <span class="text-center">Доступно</span>
        <span class="text-right">Нужно</span>
      </div>

      <div
        v-for="part in filteredParts"
        :key="part.id"
        class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-line px-3 py-3 md:grid-cols-[minmax(0,1fr)_84px_150px]"
      >
        <div class="flex min-w-0 items-center gap-3">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface2 text-muted">
            <PartArt :kind="partPresentation(part.id).kind"/>
          </span>
          <span class="min-w-0">
            <span class="block truncate text-base font-semibold" :title="part.name">
              {{ part.name }}
            </span>
            <span class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted">
              <span>{{ part.sku }}</span>
              <span aria-hidden="true">·</span>
              <span>{{ formatPartPrice(part.unit_price) }}</span>
              <span
                v-if="isAdded(part)"
                class="inline-flex items-center gap-1 font-semibold text-ok"
              >
                <SvgIcon name="check" :size="13" />
                Добавлено ×{{ added[part.id] }}
              </span>
            </span>
          </span>
        </div>

        <span class="justify-self-end text-base md:justify-self-center">
          <span class="md:hidden">Доступно: </span>
          <strong :class="available(part) ? '' : 'text-danger'">{{ available(part) }}</strong>
        </span>

        <div class="col-span-2 flex items-center gap-2 md:col-span-1 md:justify-end">
          <div class="inline-flex items-center rounded-lg border border-line">
            <button
              type="button"
              class="grid h-9 w-9 place-items-center text-muted transition-colors hover:text-content disabled:opacity-40"
              :disabled="!quantities[part.id]"
              aria-label="Уменьшить количество"
              @click="dec(part)"
            >
              <SvgIcon name="minus" :size="16" />
            </button>
            <input
              type="number"
              min="0"
              max="99"
              class="w-12 border-x border-line bg-transparent py-2 text-center text-base outline-none"
              :value="quantities[part.id] || 0"
              :aria-label="`Количество: ${part.name}`"
              @input="setQty(part, $event.target.value)"
            />
            <button
              type="button"
              class="grid h-9 w-9 place-items-center text-muted transition-colors hover:text-content"
              aria-label="Увеличить количество"
              @click="inc(part)"
            >
              <SvgIcon name="plus" :size="16" />
            </button>
          </div>
        </div>
      </div>

      <p
        v-if="!filteredParts.length"
        class="rounded-xl border border-line px-4 py-8 text-center text-base text-muted"
      >
        Детали не найдены.
      </p>
    </div>

    <p
      v-if="hasOutOfStock"
      class="mt-3 flex items-start gap-2 rounded-xl bg-warn/10 px-3 py-2.5 text-[14px] font-medium text-warn"
    >
      <SvgIcon name="alertTriangle" :size="16" class="mt-0.5 shrink-0" />
      Часть позиций отсутствует на складе. При подтверждении заявка перейдёт в статус
      «Ожидание запчастей».
    </p>

    <template #footer="{ close }">
      <Button variant="ghost" @click="close">Отмена</Button>

      <Button variant="primary" :disabled="!selectedCount" @click="requestSelected">
        <template #iconLeft><SvgIcon name="plusCircle" :size="18" /></template>
        Запросить<template v-if="selectedCount"> ({{ selectedCount }})</template>
      </Button>
    </template>
  </Modal>
</template>
