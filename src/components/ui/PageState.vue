<script setup>
import BrandLoader from './BrandLoader.vue'
import Button from './Button.vue'
import Card from './Card.vue'
import Skeleton from './Skeleton.vue'
import SvgIcon from './SvgIcon.vue'
defineProps({ loading: Boolean, error: Boolean, empty: Boolean, title: { default: 'Пока ничего нет' }, description: { default: 'Здесь появятся данные, когда сервис начнёт работу.' }, icon: { default: 'clipboard' } })
defineEmits(['retry'])
</script>
<template>
  <div v-if="loading" class="grid gap-4" aria-busy="true" aria-label="Загрузка данных"><BrandLoader label="Загружаем данные…" /><div class="grid grid-cols-2 gap-4 lg:grid-cols-4"><Card v-for="i in 4" :key="i"><Skeleton :lines="3" height="16px" /></Card></div><Card><Skeleton variant="rect" height="260px" /></Card><Card><Skeleton :lines="5" height="22px" /></Card></div>
  <Card v-else-if="error || empty" class="grid justify-items-center gap-4 py-16 text-center" role="status"><span class="grid h-16 w-16 place-items-center rounded-2xl" :class="error ? 'bg-danger/10 text-danger' : 'bg-brand/10 text-brand'"><SvgIcon :name="error ? 'alertTriangle' : icon" :size="30" /></span><div><h2 class="text-lg font-bold">{{ error ? 'Не удалось загрузить данные' : title }}</h2><p class="mx-auto mt-2 max-w-md text-sm text-muted">{{ error ? 'Попробуйте ещё раз — ваши изменения сохранятся в текущем сеансе.' : description }}</p></div><Button v-if="error" variant="outline" @click="$emit('retry')">Повторить загрузку</Button><slot name="action" /></Card>
  <slot v-else />
</template>
