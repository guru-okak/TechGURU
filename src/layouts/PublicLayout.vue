<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Button from '../components/ui/Button.vue'
import SvgIcon from '../components/ui/SvgIcon.vue'
import { useSession } from '../composables/useSession'
import { useTheme } from '../composables/useTheme'
import { toasts } from '../composables/useToast'
import { servicePoints } from '../data/servicePoints'
import logoLight from '../assets/Общее/logo_light.png'
import logoDark from '../assets/Общее/logo_dark.png'

const route = useRoute()
const isAuthPage = computed(() => ['login', 'register'].includes(route.name))
const { isAuthenticated, current, homeFor, logout } = useSession()
const { isDark, toggleTheme } = useTheme()

const scrolled = ref(false)
const menuOpen = ref(false)
const phoneUrl = phone => `tel:${phone.replace(/[^+\d]/g, '')}`
function scrollToTop() { window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }) }

function onScroll() {
  scrolled.value = window.scrollY > 8
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const links = [
  { label: 'Услуги', to: '/#services' },
  { label: 'Преимущества', to: '/#advantages' },
  { label: 'Как это работает', to: '/#how-it-works' },
  { label: 'Контакты', to: '/#contacts' },
]

watch(
  () => route.fullPath,
  () => {
    scrolled.value = window.scrollY > 8
    menuOpen.value = false
  },
)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-app text-content" :class="{ 'auth-shell': isAuthPage }">
    <header v-if="!isAuthPage"
      class="public-header sticky top-0 z-30 border-b bg-surface/90 backdrop-blur transition-shadow"
      :class="scrolled ? 'border-line shadow-card' : 'border-transparent'"
    >
      <div class="public-header-inner mx-auto flex h-[84px] w-full max-w-[1536px] items-center gap-2 sm:gap-4 px-4 sm:px-6 lg:px-12">
        <RouterLink to="/" class="flex shrink-0 items-center" aria-label="TechGURU — на главную">
          <img :src="logoLight" alt="TechGURU" class="h-9 w-auto dark:hidden sm:h-[52px]" />
          <img :src="logoDark" alt="" class="hidden h-9 w-auto dark:block sm:h-[52px]" />
        </RouterLink>

        <span class="header-brand-caption">Сервисный<br>центр</span>
        <nav class="header-nav hidden items-center gap-1 lg:flex" aria-label="Основная навигация">
          <RouterLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            class="header-nav-link rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface2 hover:text-content"
            :class="{ 'is-current': route.path === '/' && route.hash && link.to === '/' + route.hash }"
          >
            {{ link.label }}
          </RouterLink>
        </nav>

        <div class="header-actions ml-auto flex items-center gap-2">
          <a :href="phoneUrl((servicePoints[0]?.phone??'+7 800 123-45-67'))" class="header-contact"><span><SvgIcon name="phone" :size="16" /></span><span>{{ (servicePoints[0]?.phone??'+7 800 123-45-67') }}</span></a>
          <span class="inline-flex lg:hidden"><Button variant="ghost" size="icon" :aria-expanded="menuOpen" aria-controls="guest-mobile-menu" :aria-label="menuOpen ? 'Закрыть меню' : 'Открыть меню'" @click="menuOpen = !menuOpen"><SvgIcon :name="menuOpen ? 'x' : 'menu'" :size="21" /></Button></span>
          <Button
            variant="ghost"
            size="icon"
            :aria-label="isDark ? 'Включить светлую тему' : 'Включить тёмную тему'"
            @click="toggleTheme"
          >
            <SvgIcon :name="isDark ? 'sun' : 'moon'" :size="19" />
          </Button>

          <template v-if="isAuthenticated">
            <span class="hidden sm:inline-flex"><Button variant="outline" size="sm" @click="logout">Выйти</Button></span>
            <Button :to="homeFor()" variant="secondary">
              <template #iconLeft><SvgIcon name="grid" :size="18" /></template>
              <span class="hidden sm:inline">{{ current.caption }}</span>
              <span class="sm:hidden">Кабинет</span>
            </Button>
          </template>
          <template v-else>
            <Button to="/login" variant="secondary">
              <template #iconLeft>
                <span class="hidden sm:inline-flex"><SvgIcon name="logout" :size="18" class="rotate-180" /></span>
              </template>
              Войти
            </Button>
            <span class="hidden sm:inline-flex"><Button to="/register" variant="primary">
              Создать аккаунт
            </Button></span>
          </template>
        </div>
      </div>
      <nav v-if="menuOpen" id="guest-mobile-menu" class="grid gap-1 border-t border-line px-5 py-4 lg:hidden" aria-label="Мобильная навигация">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="rounded-xl px-3 py-3 text-sm text-muted hover:bg-surface2" @click="menuOpen = false">{{ link.label }}</RouterLink>
        <RouterLink v-if="!isAuthenticated" to="/register" class="rounded-xl px-3 py-3 text-sm font-semibold text-brand" @click="menuOpen = false">Создать аккаунт</RouterLink>
        <Button v-else class="justify-self-start sm:hidden" variant="outline" size="sm" @click="menuOpen = false; logout()">Выйти</Button>
      </nav>
    </header>

    <header v-else class="auth-header">
      <div class="auth-header-inner"><RouterLink to="/" aria-label="TechGURU — на главную"><img :src="logoLight" alt="TechGURU" class="auth-logo dark:hidden" /><img :src="logoDark" alt="" class="auth-logo hidden dark:block" /></RouterLink><div class="auth-header-actions"><Button variant="ghost" size="icon" :aria-label="isDark ? 'Включить светлую тему' : 'Включить тёмную тему'" @click="toggleTheme"><SvgIcon :name="isDark ? 'sun' : 'moon'" :size="19" /></Button><RouterLink to="/" class="auth-home"><SvgIcon name="arrowLeft" :size="16" />На главную</RouterLink></div></div>
    </header>
    <main class="flex-1" :class="{ 'auth-main': isAuthPage }">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer v-if="!isAuthPage" class="public-footer-shell border-t border-line bg-surface">
      <div class="public-footer mx-auto w-full max-w-[1536px] px-5 sm:px-6 lg:px-12">
        <div class="footer-contact-band"><div><span class="footer-eyebrow">ДАВАЙТЕ РАЗБЕРЁМСЯ ВМЕСТЕ</span><h2>Есть задача для TechGURU?</h2></div><a :href="phoneUrl((servicePoints[0]?.phone??'+7 800 123-45-67'))" class="footer-phone"><span class="footer-phone-icon"><SvgIcon name="phone" :size="23" /></span><span><small>Свяжитесь с сервисом</small><strong>{{ (servicePoints[0]?.phone??'+7 800 123-45-67') }}</strong></span><SvgIcon name="arrowRight" :size="21" /></a></div>
        <div class="footer-main-grid">
          <div class="footer-brand"><RouterLink to="/" aria-label="TechGURU — на главную"><img :src="logoLight" alt="TechGURU" class="h-12 w-auto dark:hidden" /><img :src="logoDark" alt="" class="hidden h-12 w-auto dark:block" /></RouterLink><p>Ремонт электроники и бытовой техники.<br>С заботой об устройствах и вашем времени.</p><div class="footer-formats"><span><SvgIcon name="home" :size="14" />У вас дома</span><span><SvgIcon name="store" :size="14" />В сервисе</span></div></div>
          <div><h2>О сервисе</h2><nav class="footer-links" aria-label="Навигация в подвале"><RouterLink v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}</RouterLink></nav></div>
          <div><h2>Личный кабинет</h2><nav class="footer-links" aria-label="Аккаунт"><RouterLink :to="isAuthenticated ? homeFor() : '/login'">{{ isAuthenticated ? 'Перейти в кабинет' : 'Войти в аккаунт' }}</RouterLink><RouterLink v-if="!isAuthenticated" to="/register">Зарегистрироваться</RouterLink></nav><p class="footer-account-note">Заявки, история ремонта и уведомления — в одном месте.</p></div>
          <div><h2>Будем рады видеть</h2><a href="/#contacts" class="footer-location"><SvgIcon name="mapPin" :size="17" /><span>{{ (servicePoints[0]?.address??'Уточните адрес в разделе контактов') }}</span></a><p class="footer-hours"><SvgIcon name="clock" :size="15" />{{ (servicePoints[0]?.working_hours??'Уточняйте у оператора') }}</p><RouterLink to="/#contacts" class="footer-all-points">Все точки приёма<SvgIcon name="arrowRight" :size="15" /></RouterLink></div>
        </div>
        <div class="footer-bottom"><p>© {{ new Date().getFullYear() }} TechGURU. Сервисный центр по ремонту техники.</p><button type="button" @click="scrollToTop">Наверх<span><SvgIcon name="arrowRight" :size="15" class="-rotate-90" /></span></button></div>
      </div>
    </footer>

    <footer v-else class="auth-footer"><span>© {{ new Date().getFullYear() }} TechGURU</span><a :href="phoneUrl((servicePoints[0]?.phone??'+7 800 123-45-67'))"><SvgIcon name="phone" :size="13" />Помощь: {{ (servicePoints[0]?.phone??'+7 800 123-45-67') }}</a></footer>
    <div class="pointer-events-none fixed bottom-6 right-4 z-[60] flex flex-col gap-2">
      <div v-for="t in toasts" :key="t.id" class="toast">{{ t.message }}</div>
    </div>
  </div>
</template>

<style>

</style>

<style scoped>
.public-header{background:color-mix(in srgb,var(--surface) 92%,transparent);backdrop-filter:blur(20px);border-bottom-color:color-mix(in srgb,var(--border) 75%,transparent)!important;isolation:isolate}
.public-header:after{content:'';position:absolute;left:15%;right:15%;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--blue) 35%,transparent),transparent);pointer-events:none}
.header-brand-caption{display:none;font-size:10px;line-height:1.6;color:var(--muted);border-left:1px solid var(--border);padding-left:16px;margin-left:2px;white-space:nowrap}
.header-nav{margin-left:12px;padding:4px;border:1px solid color-mix(in srgb,var(--border) 70%,transparent);border-radius:30px;background:color-mix(in srgb,var(--surface2) 60%,transparent)}
.header-nav-link{position:relative;border-radius:24px;white-space:nowrap;font-size:12px;padding:9px 13px}.header-nav-link:hover,.header-nav-link.is-current{background:var(--surface);color:var(--blue);box-shadow:0 2px 6px #06152d08}
.header-contact{display:none;align-items:center;gap:8px;padding-right:16px;margin-right:6px;border-right:1px solid var(--border);font-size:12px;font-weight:600;white-space:nowrap}.header-contact>span:first-child{display:grid;place-items:center;width:29px;height:29px;background:color-mix(in srgb,var(--blue) 8%,transparent);color:var(--blue);border-radius:50%}.header-contact:hover{color:var(--blue)}
.public-footer-shell{position:relative;isolation:isolate;overflow:hidden;background:var(--surface);background-image:radial-gradient(ellipse at 0% 100%,color-mix(in srgb,var(--blue) 6%,transparent),transparent 65%)}
.public-footer-shell:before{content:'';position:absolute;inset:0;z-index:-1;background-image:radial-gradient(circle,var(--blue) .7px,transparent 1px);background-size:24px 24px;opacity:.12;mask-image:linear-gradient(90deg,#000,transparent 40%);pointer-events:none}
.public-footer{padding-top:0;padding-bottom:0}.footer-contact-band{display:flex;justify-content:space-between;align-items:center;gap:30px;padding-block:38px;border-bottom:1px solid var(--border)}
.footer-eyebrow{font-size:9px;font-weight:700;letter-spacing:.14em;color:var(--blue)}.footer-contact-band h2{font-size:25px;letter-spacing:-.04em;font-weight:700;line-height:1.3;margin-top:9px}
.footer-phone{display:flex;align-items:center;gap:14px}.footer-phone-icon{width:48px;height:48px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--blue) 20%,var(--border));background:color-mix(in srgb,var(--blue) 8%,transparent);color:var(--blue);border-radius:15px}.footer-phone small{display:block;color:var(--muted);font-size:10px;margin-bottom:4px}.footer-phone strong{display:block;font-size:21px;letter-spacing:-.035em}.footer-phone>span:last-of-type{margin-right:15px}.footer-phone> :deep(span[aria-hidden]){color:var(--blue)}.footer-phone:hover strong{color:var(--blue)}
.footer-main-grid{display:grid;grid-template-columns:1.5fr .8fr .95fr 1.1fr;gap:45px;padding-block:46px}.footer-main-grid h2{font-size:12px;font-weight:700;margin-bottom:20px}.footer-brand>p{font-size:13px;line-height:1.9;color:var(--muted);margin-top:18px;max-width:340px}.footer-formats{display:flex;gap:8px;margin-top:21px;flex-wrap:wrap}.footer-formats>span{display:flex;align-items:center;gap:6px;border:1px solid var(--border);background:var(--surface);padding:6px 9px;border-radius:8px;font-size:10px;color:var(--muted)}
.footer-links{display:grid;gap:13px;font-size:12px;color:var(--muted)}.footer-links>a{transition:color .18s;justify-self:start}.footer-links>a:hover{color:var(--blue)}.footer-account-note{max-width:230px;font-size:11px;line-height:1.85;color:var(--muted);margin-top:18px}
.footer-location{display:flex;gap:9px;color:var(--muted);font-size:12px;line-height:1.85;max-width:240px}.footer-location :deep(span[aria-hidden]){margin-top:3px;color:var(--blue)}.footer-location:hover{color:var(--blue)}.footer-hours{display:flex;align-items:center;gap:8px;font-size:10px;color:var(--muted);margin-top:16px}.footer-all-points{display:inline-flex;align-items:center;gap:8px;font-size:11px;color:var(--blue);font-weight:600;margin-top:18px}
.footer-bottom{display:flex;align-items:center;justify-content:space-between;gap:20px;padding-block:22px;border-top:1px solid var(--border);font-size:10px;color:var(--muted)}.footer-bottom>button{display:flex;align-items:center;gap:9px;cursor:pointer;white-space:nowrap}.footer-bottom>button>span{display:grid;place-items:center;width:28px;height:28px;border:1px solid var(--border);border-radius:50%;background:var(--surface)}.footer-bottom>button:hover{color:var(--blue)}
@media(min-width:1280px){.header-brand-caption{display:block}.header-nav{margin-left:18px}}
@media(min-width:1536px){.header-contact{display:flex}}
@media(max-width:1100px){.header-nav{margin-left:0}.header-nav-link{font-size:11px;padding-inline:10px}.footer-main-grid{gap:25px;grid-template-columns:1.2fr .7fr .9fr 1fr}.footer-phone strong{font-size:19px}}
@media(max-width:800px){.footer-main-grid{grid-template-columns:1fr 1fr;gap:35px}.footer-contact-band h2{font-size:22px}.footer-phone-icon{width:40px;height:40px;border-radius:12px}.footer-phone strong{font-size:17px}.footer-phone>span:last-of-type{margin:0}.footer-phone>:deep(span[aria-hidden]){display:none}}
@media(max-width:520px){.footer-contact-band{flex-direction:column;align-items:start;gap:24px;padding-block:30px}.footer-contact-band h2{font-size:24px}.footer-phone strong{font-size:20px}.footer-main-grid{grid-template-columns:1fr 1fr;gap:28px 20px;padding-block:30px}.footer-brand{grid-column:1/-1}.footer-main-grid>div:last-child{grid-column:1/-1}.footer-main-grid h2{margin-bottom:15px}.footer-main-grid>div:last-child .footer-location{max-width:100%}.footer-brand>p{font-size:12px}.footer-bottom{font-size:10px;align-items:start}.footer-bottom>p{max-width:220px;line-height:1.8}.footer-main-grid .footer-hours{font-size:11px}.footer-links{font-size:11px}}

</style>

<style scoped>
.auth-shell{background:var(--surface)}
.auth-header{height:76px;border-bottom:1px solid var(--border);background:var(--surface);position:relative;z-index:20}
.auth-header-inner{max-width:1536px;height:100%;padding-inline:48px;margin:auto;display:flex;align-items:center;justify-content:space-between;gap:16px}
.auth-logo{height:44px;width:auto}.auth-header-actions{display:flex;align-items:center;gap:17px}.auth-home{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12px;font-weight:600}.auth-home:hover{color:var(--blue)}
.auth-main :deep(>div){min-height:calc(100svh - 132px);padding-block:32px}
.auth-footer{display:flex;align-items:center;justify-content:center;gap:30px;min-height:56px;padding:14px 20px;border-top:1px solid var(--border);background:var(--surface);color:var(--muted);font-size:10px}
.auth-footer>a{display:flex;align-items:center;gap:6px}.auth-footer>a:hover{color:var(--blue)}
@media(max-width:600px){.auth-header-inner{padding-inline:18px}.auth-logo{height:36px}.auth-header-actions{gap:8px}.auth-home{font-size:11px;gap:5px}.auth-footer{gap:12px;flex-wrap:wrap;font-size:9px}.auth-main :deep(>div){padding-block:24px}}
</style>
