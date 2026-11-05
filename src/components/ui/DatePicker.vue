<script setup>
import { computed, ref, useId } from 'vue'
import SvgIcon from './SvgIcon.vue'

const props = defineProps({ modelValue: String, min: String, label: String, error: String })
const emit = defineEmits(['update:modelValue'])
const id = useId()
const trigger = ref(null)
const open = ref(false)
const month = ref(new Date())
const format = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const dateKey = date => date.toISOString().slice(0, 10)
const dateAt = (year, monthIndex, day) => new Date(Date.UTC(year, monthIndex, day))
const monthStart = computed(() => dateAt(month.value.getUTCFullYear(), month.value.getUTCMonth(), 1))
const days = computed(() => {
  const start = monthStart.value
  const offset = (start.getUTCDay() + 6) % 7
  return Array.from({ length: 42 }, (_, index) => dateAt(start.getUTCFullYear(), start.getUTCMonth(), index - offset + 1))
})
const previousDisabled = computed(() => props.min && dateKey(monthStart.value).slice(0, 7) <= props.min.slice(0, 7))
function shift(offset) {
  month.value = dateAt(month.value.getUTCFullYear(), month.value.getUTCMonth() + offset, 1)
}
function toggle() {
  if (!open.value) month.value = new Date((props.modelValue || props.min) + 'T00:00:00Z')
  open.value = !open.value
}
function close() {
  open.value = false
  trigger.value?.focus()
}
function choose(day) {
  emit('update:modelValue', dateKey(day))
  close()
}
</script>

<template>
  <div class="relative grid content-start gap-2" @focusout="event => { if (!event.currentTarget.contains(event.relatedTarget)) open = false }" @keydown.esc.prevent="close">
    <label :for="id" class="text-sm font-semibold">{{ label }} <span class="text-danger">*</span></label>
    <button :id="id" ref="trigger" type="button" class="control-base flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 text-left text-sm" :aria-expanded="open" :aria-controls="id+'-calendar'" :aria-invalid="!!error" @click="toggle">
      {{ modelValue ? modelValue.split('-').reverse().join('.') : 'дд.мм.гггг' }}
      <SvgIcon name="calendar" :size="18"/>
    </button>
    <div v-if="open" :id="id+'-calendar'" class="calendar rounded-xl border border-line bg-surface p-3 shadow-xl">
      <div class="mb-2 flex items-center justify-between gap-1">
        <button type="button" class="calendar-day" aria-label="Предыдущий месяц" :disabled="previousDisabled" @click="shift(-1)">‹</button>
        <strong class="text-sm capitalize" aria-live="polite">{{ format.format(month) }}</strong>
        <button type="button" class="calendar-day" aria-label="Следующий месяц" @click="shift(1)">›</button>
      </div>
      <div class="grid grid-cols-7 gap-1 text-center">
        <span v-for="day in ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']" :key="day" class="py-1 text-xs text-muted">{{ day }}</span>
        <button v-for="day in days" :key="dateKey(day)" type="button" class="calendar-day" :class="{ 'text-muted': day.getUTCMonth() !== month.getUTCMonth() }" :disabled="dateKey(day) < min" :aria-label="day.toLocaleDateString('ru-RU', {dateStyle:'full',timeZone:'UTC'})" :aria-pressed="dateKey(day) === modelValue" @click="choose(day)">{{ day.getUTCDate() }}</button>
      </div>
    </div>
    <p v-if="error" class="text-xs text-danger">{{ error }}</p>
  </div>
</template>

<style scoped>
.calendar{position:absolute;bottom:calc(100% + 8px);left:0;z-index:20;width:min(100%,310px)}
.calendar-day{min-width:0;min-height:32px;border-radius:7px;font-size:13px}
.calendar-day:hover:not(:disabled){background:var(--surface2)}
.calendar-day[aria-pressed=true]{background:var(--blue);color:white}
.calendar-day:disabled{opacity:.35}
</style>
