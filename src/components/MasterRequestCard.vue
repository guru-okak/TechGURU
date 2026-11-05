<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseRequestCard from './BaseRequestCard.vue'
import SvgIcon from './ui/SvgIcon.vue'
import { toast } from '../composables/useToast'

const props = defineProps({
  request: { type: Object, required: true },
})

const router = useRouter()
const menuOpen = ref(false)

const isOnsite = computed(() => props.request.service_mode === 'onsite')

const channelLabel = computed(() =>
  isOnsite.value ? 'Выезд' : 'Приём в сервис',
)

const place = computed(() =>
  isOnsite.value ? props.request.address : props.request.service_point,
)

const hasPhone = computed(
  () => Boolean(props.request.clientPhone) && props.request.clientPhone !== '—',
)

const durationTitle = 'Средняя длительность работ по услуге'

function openTask() {
  menuOpen.value = false
  router.push(`/master/task/${props.request.number}`)
}

function callClient() {
  if (!hasPhone.value) return
  menuOpen.value = false
  const digits = props.request.clientPhone.replace(/[^\d+]/g, '')
  window.location.href = `tel:${digits}`
}

async function copyPhone() {
  if (!hasPhone.value) return
  menuOpen.value = false
  try {
    await navigator.clipboard.writeText(props.request.clientPhone)
    toast('Номер телефона скопирован.')
  } catch {
    toast('Не удалось скопировать номер.')
  }
}
</script>

<template>
  <BaseRequestCard
    :number="request.number"
    :device="request.device"
    :icon="request.icon"
    :status="request.status"
    :to="`/master/task/${request.number}`"
    action-label="Открыть"
  >
    <span class="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
      <span class="inline-flex items-center gap-1 whitespace-nowrap">
        <SvgIcon name="clock" :size="13" class="shrink-0" />
        {{ request.time }}
      </span>
      <span class="inline-flex min-w-0 items-center gap-1">
        <SvgIcon :name="isOnsite ? 'mapPin' : 'store'" :size="13" class="shrink-0" />
        <span class="truncate">{{ place ?? '—' }}</span>
      </span>
    </span>

    <span class="mt-0.5 block truncate text-[12px] text-muted">
      Клиент: {{ request.client }} · {{ channelLabel }}
    </span>

    <template #badge-extra>
      <span
        class="inline-flex items-center gap-1 whitespace-nowrap text-[11px] text-muted"
        :title="durationTitle"
      >
        <SvgIcon name="clock" :size="12" />
        Ремонт ≈ {{ request.serviceDuration }}
      </span>
    </template>

    <template #actions>
      <div class="relative hidden items-center self-stretch sm:flex">
        <button
          type="button"
          class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-content"
          :aria-expanded="menuOpen"
          aria-haspopup="menu"
          aria-label="Действия с заявкой"
          @click="menuOpen = !menuOpen"
        >
          <SvgIcon name="moreVertical" :size="18" />
        </button>

        <div
          v-if="menuOpen"
          class="fixed inset-0 z-30"
          aria-hidden="true"
          @click="menuOpen = false"
        ></div>

        <div
          v-if="menuOpen"
          class="absolute right-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-xl"
          role="menu"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-surface2"
            role="menuitem"
            @click="openTask"
          >
            <SvgIcon name="arrowRight" :size="15" class="shrink-0 text-muted" />
            Открыть заявку
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50"
            role="menuitem"
            :disabled="!hasPhone"
            @click="callClient"
          >
            <SvgIcon name="phone" :size="15" class="shrink-0 text-muted" />
            Позвонить клиенту
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50"
            role="menuitem"
            :disabled="!hasPhone"
            @click="copyPhone"
          >
            <SvgIcon name="copy" :size="15" class="shrink-0 text-muted" />
            Скопировать номер
          </button>
        </div>
      </div>
    </template>
  </BaseRequestCard>
</template>
