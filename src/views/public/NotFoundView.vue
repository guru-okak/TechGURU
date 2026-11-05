<script setup>
import Button from '../../components/ui/Button.vue'
import SvgIcon from '../../components/ui/SvgIcon.vue'
</script>

<template>
  <div class="mx-auto grid w-full max-w-[640px] place-items-center px-4 py-20 text-center sm:px-6">
    <span class="grid h-16 w-16 place-items-center rounded-2xl bg-brand/10 text-brand">
      <SvgIcon name="search" :size="30" />
    </span>
    <h1 class="mt-5 text-3xl font-extrabold tracking-tight">Страница не найдена</h1>
    <p class="mt-2 text-sm text-muted">
      Возможно, ссылка устарела или страница была перемещена. Проверьте адрес или вернитесь на
      главную.
    </p>
    <div class="mt-6 flex flex-wrap justify-center gap-3">
      <Button to="/" variant="primary">
        <template #iconLeft><SvgIcon name="arrowLeft" :size="18" /></template>
        На главную
      </Button>
      <Button to="/login" variant="secondary">Войти</Button>
    </div>
  </div>
</template>
