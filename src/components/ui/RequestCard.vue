<script setup>
import Card from './Card.vue'
import StatusBadge from './StatusBadge.vue'

defineProps({
  request: { type: Object, required: true },
})

defineEmits(['open'])
</script>

<template>
  <!--
    Исправление overflow (Задача 2):
    - min-w-0 на карточке и на флекс-детях -> длинный текст не растягивает сетку;
    - flex-wrap -> бейдж/цена переносятся на новую строку, а не ломают ряд;
    - truncate -> длинные названия устройств обрезаются многоточием;
    - shrink-0/whitespace-nowrap -> бейдж, цена и кнопка не сжимаются.
  -->
  <Card as="article" padding="sm" hover class="min-w-0">
    <div class="flex min-w-0 flex-wrap items-start justify-between gap-x-3 gap-y-2">
      <div class="min-w-0 flex-1 basis-48">
        <h3 class="truncate text-[15px] font-semibold" :title="request.device">
          {{ request.device }}
        </h3>
        <p class="mt-0.5 truncate text-xs text-muted">
          {{ request.id }} · {{ request.detail }}
        </p>
      </div>
      <StatusBadge class="shrink-0" :status="request.status" />
    </div>

    <div
      class="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted"
    >
      <span class="min-w-0 truncate">{{ request.channel }} · {{ request.date }}</span>
      <span class="shrink-0 whitespace-nowrap font-semibold text-content">
        {{ request.price }}
      </span>
    </div>

    <div
      class="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-line pt-3"
    >
      <small class="min-w-0 truncate text-muted">
        {{ request.master === 'Не назначен' ? 'Ожидает назначения' : `Мастер: ${request.master}` }}
      </small>
      <button
        type="button"
        class="shrink-0 text-xs font-semibold text-brand hover:underline"
        @click="$emit('open', request)"
      >
        Подробнее →
      </button>
    </div>
  </Card>
</template>
