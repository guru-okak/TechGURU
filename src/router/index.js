import {beginNavigation,endNavigation} from '../composables/navigationProgress'
import { createRouter, createWebHistory } from 'vue-router'
import { useSession } from '../composables/useSession'
import {connectionError} from '../api/client'

const APP_NAME = 'TechGURU'

// Роли, которым доступен раздел. Гость (неавторизованный) — отсутствие роли.
const ROLE_ACCESS = {
  admin: ['admin'],
  master: ['master'],
  client: ['client'],
}

const routes = [
  {
    path: '/',
    component: () => import('../layouts/PublicLayout.vue'),
    children: [
      {path:'google-complete',component:()=>import('../views/public/GoogleCompleteView.vue'),meta:{title:'Вход Google',public:true,guestOnly:true}},
      {path:'verify-email',component:()=>import('../views/public/EmailAccountView.vue'),meta:{title:'Подтверждение почты',public:true,guestOnly:true}},
      {path:'forgot-password',component:()=>import('../views/public/EmailAccountView.vue'),meta:{title:'Восстановление пароля',public:true,guestOnly:true}},
      {
        path: '',
        name: 'landing',
        component: () => import('../views/public/LandingView.vue'),
        meta: { title: 'Сервисный центр по ремонту техники', public: true },
      },
      {
        path: 'login',
        name: 'login',
        component: () => import('../views/public/LoginView.vue'),
        meta: { title: 'Вход', public: true, guestOnly: true },
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('../views/public/RegisterView.vue'),
        meta: { title: 'Регистрация', public: true, guestOnly: true },
      },
      {
        path: '403',
        name: 'forbidden',
        component: () => import('../views/public/ForbiddenView.vue'),
        meta: { title: 'Доступ запрещён', public: true },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'not-found',
        component: () => import('../views/public/NotFoundView.vue'),
        meta: { title: 'Страница не найдена', public: true },
      },
    ],
  },

  {
    path: '/',
    component: () => import('../layouts/CabinetLayout.vue'),
    children: [
      // Администратор
      {
        path: 'admin',
        alias: 'dashboard',
        name: 'admin',
        component: () => import('../views/AdminView.vue'),
        meta: { title: 'Панель администратора', role: 'admin' },
      },

      { path: 'admin/requests', name: 'admin-requests', component: () => import('../views/AdminDirectoryView.vue'), meta: { title: 'Все заявки', role: 'admin', entity: 'requests' } },
      { path: 'admin/clients', name: 'admin-clients', component: () => import('../views/AdminDirectoryView.vue'), meta: { title: 'Клиенты', role: 'admin', entity: 'clients' } },
      { path: 'admin/masters', name: 'admin-masters', component: () => import('../views/AdminDirectoryView.vue'), meta: { title: 'Мастера', role: 'admin', entity: 'masters' } },
      { path: 'admin/services', name: 'admin-services', component: () => import('../views/AdminDirectoryView.vue'), meta: { title: 'Услуги', role: 'admin', entity: 'services' } },
      { path: 'admin/warehouse', name: 'admin-warehouse', component: () => import('../views/AdminDirectoryView.vue'), meta: { title: 'Склад', role: 'admin', entity: 'warehouse' } },

      { path: 'admin/points', name: 'admin-points', component: () => import('../views/AdminResourcesView.vue'), meta: { title: 'Точки приёма', role: 'admin', entity: 'points' } },
      { path: 'admin/suppliers', name: 'admin-suppliers', component: () => import('../views/AdminResourcesView.vue'), meta: { title: 'Поставщики', role: 'admin', entity: 'suppliers' } },
      { path: 'admin/orders', name: 'admin-orders', component: () => import('../views/AdminResourcesView.vue'), meta: { title: 'Заказы поставщикам', role: 'admin', entity: 'orders' } },
      { path: 'admin/audit', name: 'admin-audit', component: () => import('../views/AdminResourcesView.vue'), meta: { title: 'Журнал аудита', role: 'admin', entity: 'audit' } },
      { path: 'admin/profile', name: 'admin-profile', component: () => import('../views/AdminProfileView.vue'), meta: { title: 'Профиль администратора', role: 'admin' } },

      { path: 'admin/users', component: () => import('../views/WorkspacePlanningView.vue'), meta: { title: 'Пользователи', role: 'admin', screen: 'users' } },
      { path: 'admin/schedule', component: () => import('../views/WorkspacePlanningView.vue'), meta: { title: 'Расписание мастеров', role: 'admin', screen: 'schedule' } },
      { path: 'admin/notifications', component: () => import('../views/WorkspacePlanningView.vue'), meta: { title: 'Уведомления', role: 'admin', screen: 'notifications' } },
      { path: 'master/schedule', component: () => import('../views/WorkspacePlanningView.vue'), meta: { title: 'Моё расписание', role: 'master', screen: 'schedule' } },
      // Клиент
      {
        path: 'client',
        name: 'client-dashboard',
        component: () => import('../views/ClientDashboardView.vue'),
        meta: { title: 'Личный кабинет', role: 'client' },
      },
      {
        path: 'client/requests',
        name: 'client-requests',
        component: () => import('../views/ClientRequestsView.vue'),
        meta: { title: 'Мои заявки', role: 'client' },
      },
      {
        path: 'client/requests/new',
        name: 'client-request-new',
        component: () => import('../views/ClientNewRequestView.vue'),
        meta: { title: 'Создать заявку', role: 'client' },
      },
      {
        path: 'client/services',
        name: 'client-services',
        component: () => import('../views/ClientServicesView.vue'),
        meta: { title: 'Все услуги', role: 'client' },
      },
      {
        path: 'client/notifications',
        name: 'client-notifications',
        component: () => import('../views/ClientNotificationsView.vue'),
        meta: { title: 'Уведомления', role: 'client' },
      },
      {
        path: 'client/profile',
        name: 'client-profile',
        component: () => import('../views/ClientProfileView.vue'),
        meta: { title: 'Профиль', role: 'client' },
      },

      // Мастер
      {
        path: 'master',
        name: 'master-dashboard',
        component: () => import('../views/MasterDashboardView.vue'),
        meta: { title: 'Главная', role: 'master' },
      },
      {
        path: 'master/requests',
        name: 'master-requests',
        component: () => import('../views/MasterRequestsView.vue'),
        meta: { title: 'Мои заявки', role: 'master' },
      },
      {
        path: 'master/task/:id',
        name: 'master-task',
        component: () => import('../views/MasterTaskView.vue'),
        meta: { title: 'Заявка', role: 'master' },
      },
      {
        path: 'master/warehouse',
        name: 'master-warehouse',
        component: () => import('../views/MasterWarehouseView.vue'),
        meta: { title: 'Мой склад', role: 'master' },
      },
      {
        path: 'master/notifications',
        name: 'master-notifications',
        component: () => import('../views/MasterNotificationsView.vue'),
        meta: { title: 'Уведомления', role: 'master' },
      },
      {
        path: 'master/profile',
        name: 'master-profile',
        component: () => import('../views/MasterProfileView.vue'),
        meta: { title: 'Профиль', role: 'master' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to) => {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  beginNavigation()
  await useSession().initialize()
  const { role, isAuthenticated, homeFor } = useSession()
  const allowedRoles = ROLE_ACCESS[to.meta.role]

  // Уже авторизован — не показываем формы входа/регистрации.
  if (to.meta.guestOnly && isAuthenticated.value) {
    return { path: homeFor(role.value) }
  }

  const data = await import('../api/workspace')
  if (!allowedRoles) { await data.loadPublic(); return true }

  if (!isAuthenticated.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (!allowedRoles.includes(role.value)) {
    return { name: 'forbidden', query: { from: to.fullPath } }
  }

  data.setWorkspaceScreen(to.path)
  try{await data.refreshWorkspace()}catch(error){if(error.status===401){useSession().accept(null);data.clearWorkspace();return {name:'login',query:{redirect:to.fullPath}}}throw error}
  return true
})

router.afterEach((to) => {
  endNavigation()
  connectionError.value=''
  const title = to.meta.title
  document.title = title ? `${title} — ${APP_NAME}` : APP_NAME
})
router.onError(error=>{endNavigation();connectionError.value=error.message})

export default router
