<script setup>
import GoogleSignIn from '../../components/GoogleSignIn.vue'
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Button from '../../components/ui/Button.vue'
import Card from '../../components/ui/Card.vue'
import Input from '../../components/ui/Input.vue'
import SvgIcon from '../../components/ui/SvgIcon.vue'
import { useSession } from '../../composables/useSession'
import { useTheme } from '../../composables/useTheme'
import { toast } from '../../composables/useToast'
import bgLight from '../../assets/Вход/bg_l.png'
import bgDark from '../../assets/Вход/bg_d.png'

const router = useRouter()
const route = useRoute()
const { login, homeFor } = useSession()
const { isDark } = useTheme()

const form = reactive({ email: '', password: '' })
const errors = reactive({})
const loading = ref(false)
const submitError=ref(route.query.google_error?'Не удалось войти через Google. Попробуйте снова или используйте почту.':'')
const showPassword = ref(false)

const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))

const bgStyle = computed(() => ({
  backgroundImage: `url(${isDark.value ? bgDark : bgLight})`,
}))

function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.email.trim()) errors.email = 'Введите email'
  else if (!emailValid.value) errors.email = 'Некорректный email'
  if (!form.password) errors.password = 'Введите пароль'
  else if(form.password.length>128)errors.password='Максимум 128 символов'
  return Object.keys(errors).length === 0
}

async function submit() {
  if(loading.value)return
  submitError.value=''
  if (!validate()) {
    toast('Проверьте выделенные поля')
    return
  }
  loading.value = true
  let role
  try { role = await login({email:form.email.trim(),password:form.password}) }
  catch(error){if(error.code==='EMAIL_UNVERIFIED'){loading.value=false;router.push({path:'/verify-email',query:{email:form.email}});return}submitError.value=error.message;Object.assign(errors,Object.fromEntries(Object.entries(error.fields??{}).map(([k,v])=>[k,v[0]])));toast(error.message);loading.value=false;return}
  loading.value = false
  toast(
    `Вы вошли как ${role === 'admin' ? 'администратор' : role === 'master' ? 'мастер' : 'клиент'}`,
  )
  const redirect =
    typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/'+role) && /^\/(client|master|admin)(\/|\?|#|$)/.test(route.query.redirect) ? route.query.redirect : homeFor(role)
  router.push(redirect)
}
</script>

<template>
  <div
    class="relative flex min-h-[calc(100vh-76px)] items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-10 sm:py-14"
    :style="bgStyle"
  >
    <div class="relative z-10 w-full max-w-[520px]">
      <Card padding="lg" class="shadow-[var(--shadow-lift)]">
        <div class="flex flex-col items-center text-center">
          <span
            class="grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand"
            aria-hidden="true"
          >
            <SvgIcon name="shield" :size="28" />
          </span>
          <h1 class="mt-4 text-2xl font-extrabold tracking-tight">Вход в TechGURU</h1>
          <p class="mt-1 text-sm text-muted">Личный кабинет сервисного центра</p>
        </div>

        <GoogleSignIn />
        <form class="mt-6 grid gap-4" novalidate @submit.prevent="submit">
          <Input
            v-model="form.email"
            label="Email"
            type="email"
            icon-left="mail"
            placeholder="you@example.com"
            autocomplete="username"
            :error="errors.email" maxlength="254" required
          />

          <Input
            v-model="form.password"
            label="Пароль"
            :type="showPassword ? 'text' : 'password'"
            icon-left="lock"
            placeholder="••••••••"
            autocomplete="current-password"
            :error="errors.password" maxlength="128" required
          >
            <template #iconRight>
              <button
                type="button"
                class="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-content"
                :aria-label="showPassword ? 'Скрыть пароль' : 'Показать пароль'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <SvgIcon :name="showPassword ? 'eyeOff' : 'eye'" :size="18" />
              </button>
            </template>
          </Input>

          <RouterLink to="/forgot-password" class="justify-self-end -mt-1 text-[13px] text-muted transition-colors hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand rounded">Забыли пароль?</RouterLink>

          <p v-if="submitError" role="alert" class="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{{submitError}}</p><Button type="submit" variant="primary" block size="lg" :loading="loading" class="mt-1">
            <template #iconLeft><SvgIcon name="logout" :size="18" class="rotate-180" /></template>
            {{ loading ? 'Входим…' : 'Войти' }}
          </Button>
        </form>

        <p class="mt-6 text-center text-sm text-muted">
          Нет аккаунта?
          <RouterLink to="/register" class="font-semibold text-brand hover:underline">
            Зарегистрироваться
          </RouterLink>
        </p>
      </Card>
    </div>
  </div>
</template>
