<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from '../../components/ui/Button.vue'
import SvgIcon from '../../components/ui/SvgIcon.vue'
import { useSession } from '../../composables/useSession'

const route = useRoute()
const router=useRouter()
const { current, homeFor, logout } = useSession()

const from = computed(() => (typeof route.query.from === 'string' ? route.query.from : ''))
</script>

<template>
  <div class="mx-auto grid w-full max-w-[640px] place-items-center px-4 py-20 text-center sm:px-6">
    <span class="grid h-16 w-16 place-items-center rounded-2xl bg-danger/10 text-danger">
      <SvgIcon name="shield" :size="30" />
    </span>
    <h1 class="mt-5 text-3xl font-extrabold tracking-tight">Доступ запрещён</h1>
    <p class="mt-2 text-sm text-muted">
      Роль «{{ current.caption }}» не имеет доступа к этому разделу.
      <template v-if="from">
        <br />Запрошенный адрес: <code class="rounded bg-surface2 px-1.5 py-0.5">{{ from }}</code>
      </template>
    </p>
    <div class="mt-6 flex flex-wrap justify-center gap-3">
      <Button :to="homeFor()" variant="primary">
        <template #iconLeft><SvgIcon name="grid" :size="18" /></template>
        В мой кабинет
      </Button>
      <Button @click="async()=>{await logout();await router.push('/login')}" variant="secondary">
        Сменить роль
      </Button>
    </div>
  </div>
</template>
