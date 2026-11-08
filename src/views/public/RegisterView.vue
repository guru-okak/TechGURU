<script setup>
import GoogleSignIn from '../../components/GoogleSignIn.vue'
import {api} from '../../api/client'
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
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
const { login } = useSession()
const { isDark } = useTheme()

const form = reactive({
  full_name: '',
  phone: '',
  email: '',
  password: '',
  passwordRepeat: '',
})

const errors = reactive({})
const loading = ref(false)
const submitError=ref('')
const registrationComplete = ref(false)
const showPassword = ref(false)

const phoneValid = computed(() => /^\+?[\d ()-]+$/.test(form.phone.trim()) && /^[1-9]\d{9,14}$/.test(form.phone.replace(/\D/g,'')))
const emailValid = computed(() => !form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))

const bgStyle = computed(() => ({
  backgroundImage: `url(${isDark.value ? bgDark : bgLight})`,
}))

function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (form.full_name.trim().length<2 || form.full_name.trim().length>150) errors.full_name = 'Укажите ФИО: от 2 до 150 символов'
  if (!form.phone.trim()) errors.phone = 'Введите телефон'
  else if (!phoneValid.value) errors.phone = 'Некорректный формат телефона'
  if (!form.email.trim()) errors.email = 'Введите email'
  else if (!emailValid.value) errors.email = 'Некорректный email'
  if (!form.password) errors.password = 'Придумайте пароль'
  else if (form.password.length < 8 || form.password.length>128) errors.password = 'От 8 до 128 символов'
  if (!form.passwordRepeat) errors.passwordRepeat = 'Повторите пароль'
  else if (form.passwordRepeat !== form.password) errors.passwordRepeat = 'Пароли не совпадают'
  return Object.keys(errors).length === 0
}

async function submit() {
  if (loading.value || registrationComplete.value) return
  submitError.value=''
  if (!validate()) {
    toast('Проверьте выделенные поля')
    return
  }
  loading.value = true
  const { passwordRepeat, ...input } = form
  try {
    await api('/auth/register', { method: 'POST', body: input })
  } catch (error) {
    submitError.value = error.message
    Object.assign(errors, Object.fromEntries(Object.entries(error.fields ?? {}).map(([key, messages]) => [key, messages[0]])))
    loading.value = false
    return
  }

  loading.value=false
  router.push({path:'/verify-email',query:{email:input.email}})
}
</script>

<template>
  <div
    class="relative flex min-h-[calc(100vh-76px)] items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-10 sm:py-14"
    :style="bgStyle"
  >
    <div class="relative z-10 w-full max-w-lg">
      <Card padding="lg" class="shadow-[var(--shadow-lift)]">
        <div class="flex flex-col items-center text-center">
          <span
            class="grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand"
            aria-hidden="true"
          >
            <SvgIcon name="user" :size="28" />
          </span>
          <h1 class="mt-4 text-2xl font-extrabold tracking-tight">Создать аккаунт</h1>
          <p class="mt-1 text-sm text-muted">Личный кабинет для ваших заявок</p>
        </div>

        <GoogleSignIn />
        <form class="mt-6 grid gap-4" novalidate @submit.prevent="submit">
          <Input
            v-model="form.full_name"
            label="ФИО" hint="Отчество — при наличии"
            icon-left="user"
            placeholder="Например, Иванов Иван"
            autocomplete="name"
            :error="errors.full_name" maxlength="150" required
          />

          <div class="grid gap-4 sm:grid-cols-2">
            <Input
              v-model="form.phone"
              label="Телефон"
              type="tel"
              icon-left="phone"
              placeholder="+7 800 123-45-67"
              autocomplete="tel"
              :error="errors.phone" maxlength="30" required
            />
            <Input
              v-model="form.email"
              label="Email"
              type="email"
              icon-left="mail"
              placeholder="you@example.com"
              autocomplete="email"
              :error="errors.email" maxlength="254" required
            />
          </div>

          <Input
            v-model="form.password"
            label="Пароль"
            :type="showPassword ? 'text' : 'password'"
            icon-left="lock"
            placeholder="Минимум 8 символов"
            autocomplete="new-password"
            hint="От 8 до 128 символов"
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

          <Input
            v-model="form.passwordRepeat"
            label="Подтверждение пароля"
            :type="showPassword ? 'text' : 'password'"
            icon-left="lock"
            placeholder="••••••••"
            autocomplete="new-password"
            :error="errors.passwordRepeat" maxlength="128" required
          />

          <p v-if="submitError" role="alert" class="rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{{submitError}}</p><Button type="submit" variant="primary" block size="lg" :loading="loading" :disabled="registrationComplete" class="mt-1">
            <template #iconLeft><SvgIcon name="plusCircle" :size="18" /></template>
            {{ loading ? 'Создаём…' : 'Создать аккаунт' }}
          </Button>
        </form>

        <p class="mt-6 text-center text-sm text-muted">
          Уже есть аккаунт?
          <RouterLink to="/login" class="font-semibold text-brand hover:underline">Войти</RouterLink>
        </p>
      </Card>
    </div>
  </div>
</template>
