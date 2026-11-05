// Пункты меню по ролям. icon — имя иконки из src/config/icons.js
export const navigation = {
  admin: [
    { label: 'Обзор', to: '/admin', icon: 'grid', primary: true },
    { label: 'Заявки', to: '/admin/requests', icon: 'clipboard', primary: true },
    { label: 'Уведомления', to: '/admin/notifications', icon: 'bell', badge: 'notifications' },
    { label: 'Пользователи', to: '/admin/users', icon: 'users' },
    { label: 'Расписание', to: '/admin/schedule', icon: 'calendar' },
    { label: 'Клиенты', to: '/admin/clients', icon: 'users' },
    { label: 'Мастера', to: '/admin/masters', icon: 'wrench', primary: true },
    { label: 'Услуги', to: '/admin/services', icon: 'store' },
    { label: 'Склад', to: '/admin/warehouse', icon: 'box', primary: true },
    { label: 'Точки приёма', to: '/admin/points', icon: 'mapPin' },
    { label: 'Поставщики', to: '/admin/suppliers', icon: 'users' },
    { label: 'Заказы поставщикам', to: '/admin/orders', icon: 'truck' },
    { label: 'Журнал аудита', to: '/admin/audit', icon: 'clipboard' },
  ],
  client: [
    { label: 'Личный кабинет', to: '/client', icon: 'grid', primary: true },
    { label: 'Мои заявки', to: '/client/requests', icon: 'clipboard', primary: true },
    { label: 'Создать заявку', to: '/client/requests/new', icon: 'plusCircle', primary: true },
    { label: 'Уведомления', to: '/client/notifications', icon: 'bell', badge: 'notifications', primary: true },
    { label: 'Услуги', to: '/client/services', icon: 'wrench' },
    { label: 'Профиль', to: '/client/profile', icon: 'user' },
  ],
  master: [
    { label: 'Главная', to: '/master', icon: 'grid', primary: true },
    { label: 'Мои заявки', to: '/master/requests', icon: 'clipboard', primary: true },
    { label: 'Расписание', to: '/master/schedule', icon: 'calendar' },
    { label: 'Мой склад', to: '/master/warehouse', icon: 'box', primary: true },
    { label: 'Уведомления', to: '/master/notifications', icon: 'bell', badge: 'notifications', primary: true },
    { label: 'Профиль', to: '/master/profile', icon: 'user' },
  ],
}
