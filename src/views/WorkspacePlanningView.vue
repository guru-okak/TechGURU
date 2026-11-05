<script setup>
import {notificationText} from '../api/notificationPresentation'
import {masterReports} from '../api/workspace'
import {workspace} from '../api/workspace'
import {mutate,saveRecord} from '../api/client'
import {useNotifications} from '../composables/useNotifications'
const {markAllRead,markRead}=useNotifications()
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import Input from '../components/ui/Input.vue'
import Select from '../components/ui/Select.vue'
import Modal from '../components/ui/Modal.vue'
import Badge from '../components/ui/Badge.vue'
import PageState from '../components/ui/PageState.vue'
import { useMockPage } from '../composables/useMockPage'
import { adminClients, adminMasterUsers, adminMasters, adminRequests, today } from '../data/admin'
import { adminNotices } from '../data/adminOperations'
import { toast } from '../composables/useToast'

const route = useRoute(), state = useMockPage()
const screen = computed(() => route.meta.screen)
const isMaster = computed(() => route.meta.role === 'master')
const search = ref(''), filter = ref(''), date = ref(today), editor = ref(false), selected = ref(null)
const titles = { users: 'Пользователи', schedule: 'Расписание мастеров', notifications: 'Уведомления' }
const roles = [{value:'',label:'Все роли'},{value:'client',label:'Клиенты'},{value:'master',label:'Мастера'},{value:'admin',label:'Администраторы'}]
const roleLabel = value => roles.find(r => r.value === value)?.label ?? value
const users = computed(()=>workspace.users)
const visibleUsers = computed(() => users.value.filter(u => (!filter.value || u.role === filter.value) && [u.full_name,u.email,u.phone].join(' ').toLowerCase().includes(search.value.toLowerCase())))
const noticeCategory=ref('')
const reportLabels={qualification:'Недостаточно навыков',diagnosis:'Сложная диагностика',system:'Ошибка системы',other:'Другое'}
const noticeCategories=[{value:'',label:'Все категории'},{value:'reports',label:'Обращения мастеров'},{value:'requests',label:'Заявки и назначения'},{value:'estimates',label:'Согласование стоимости'},{value:'stock',label:'Склад и закупки'},{value:'timers',label:'Сроки и напоминания'},{value:'other',label:'Другие'}]
const noticeKind=n=>n.type==='master_report'?'reports':n.type==='estimate_updated'?'estimates':/escalat|remind|overdue/i.test(n.type)?'timers':/part|stock|purchase|order/i.test(n.type)?'stock':/request|assign|status|complete|cancel|reject|decline/i.test(n.type)?'requests':'other'
const notices = computed(() => adminNotices.filter(n => (!filter.value || !n.is_read)&&(!noticeCategory.value||noticeKind(n)===noticeCategory.value)&&n.message.toLowerCase().includes(search.value.toLowerCase())))
const openReports=computed(()=>masterReports.value.filter(r=>r.status==='open'))
const masters = computed(() => isMaster.value ? adminMasters : adminMasters.filter(m => !filter.value || m.id === Number(filter.value)))
const appointments = master => adminRequests.filter(r => r.master_id === master.id && r.preferred_datetime.startsWith(date.value) && !['cancelled','rejected'].includes(r.status))
const form = reactive({})
function preview(record=null){selected.value=record;Object.keys(form).forEach(k=>delete form[k]);Object.assign(form,{full_name:record?.full_name??'',email:record?.email??'',phone:record?.phone??'',role:record?.role??'client',is_active:record?.is_active??1,password:'',master_id:record?.master_id??record?.id??masters.value[0]?.id,date:record?.starts_at?new Date(record.starts_at).toLocaleDateString('en-CA',{timeZone:'Europe/Moscow'}):date.value,start:record?.starts_at?new Date(record.starts_at).toLocaleTimeString('en-GB',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'}):'10:00',end:record?.ends_at?new Date(record.ends_at).toLocaleTimeString('en-GB',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'}):'12:30'});editor.value=true}
async function savePreview(){if(screen.value==='users'){const data={full_name:form.full_name,email:form.email,phone:form.phone,role:form.role,is_active:Number(form.is_active)};if(form.password)data.password=form.password;await saveRecord('users',selected.value?.id,data)}else{await mutate('/schedule'+(selected.value?.starts_at?'/'+selected.value.id:''),{master_id:Number(form.master_id),starts_at:form.date+'T'+form.start+':00+03:00',ends_at:form.date+'T'+form.end+':00+03:00'},selected.value?.starts_at?'PATCH':'POST')}editor.value=false;toast('Изменения сохранены')}
const intervals=master=>workspace.schedule.filter(s=>s.master_id===master.id&&new Date(s.starts_at).toLocaleDateString('en-CA',{timeZone:'Europe/Moscow'})===date.value)

watch(() => route.path, () => { filter.value=''; search.value=''; editor.value=false })
</script>

<template>
  <div class="grid gap-6">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div><p class="text-xs font-semibold text-brand mb-2">{{ isMaster ? 'МОЙ РАБОЧИЙ ДЕНЬ' : 'УПРАВЛЕНИЕ СЕРВИСОМ' }}</p><h1 class="text-2xl font-bold">{{ isMaster ? 'Моё расписание' : titles[screen] }}</h1><p class="mt-2 text-sm text-muted">{{ screen==='users' ? 'Учётные записи, роли и доступ к сервису.' : screen==='schedule' ? 'Рабочие интервалы, назначения и свободное время специалистов.' : 'Назначения, эскалации и изменения складских остатков.' }}</p></div>
      <Button v-if="screen!=='notifications'&&!isMaster" variant="primary" @click="preview()">{{ screen==='users' ? 'Добавить пользователя' : 'Добавить рабочий интервал' }}</Button>
      <Button v-else variant="outline" @click="markAllRead">Прочитать все</Button>
    </header>
    <Card padding="lg">
      <div class="grid gap-4 sm:grid-cols-2">
        <Input v-if="screen==='users'" v-model="search" label="Поиск" placeholder="Имя, телефон или email" />
        <Input v-if="screen==='schedule'" v-model="date" type="date" label="Дата" />
        <Select v-if="screen==='users'" v-model="filter" label="Роль" :options="roles" />
        <Select v-if="screen==='schedule'&&!isMaster" v-model="filter" label="Мастер" :options="[{value:'',label:'Все мастера'},...adminMasters.map(m=>({value:m.id,label:m.full_name}))]" />
        <Input v-if="screen==='notifications'" v-model="search" label="Поиск уведомлений"/><Select v-if="screen==='notifications'" v-model="noticeCategory" label="Категория" :options="noticeCategories"/><Select v-if="screen==='notifications'" v-model="filter" label="Показать" :options="[{value:'',label:'Все уведомления'},{value:'unread',label:'Непрочитанные'}]" />
      </div>
    </Card>
    <section v-if="screen==='notifications'" class="grid gap-4"><h2 class="font-bold">Обращения мастеров · {{openReports.length}} открыто</h2><div class="grid grid-cols-2 lg:grid-cols-4 gap-3"><Card v-for="(label,key) in reportLabels" :key="key" padding="md"><strong>{{openReports.filter(r=>r.category===key).length}}</strong><p class="text-sm text-muted">{{label}}</p></Card></div><Card v-for="report in openReports" :key="report.id" padding="lg"><Badge tone="red">{{reportLabels[report.category]}}</Badge><h3 class="font-bold mt-3">{{report.full_name}} · заявка #{{report.request_id}}</h3><p class="my-3 break-words">{{report.message}}</p><div class="flex flex-wrap gap-3"><Button variant="outline" :to="'/admin/requests?request='+report.request_id">Открыть заявку</Button><Button variant="primary" @click="mutate('/business/reports/'+report.id+'/resolve',{})">Отметить решённым</Button></div></Card></section>
    <PageState :loading="state.loading.value" :error="state.error.value" :empty="state.empty.value || (screen==='users'&&!visibleUsers.length) || (screen==='notifications'&&!notices.length)" @retry="state.retry">
      <div v-if="screen==='users'" class="grid gap-3">
        <Card v-for="user in visibleUsers" :key="user.id" padding="lg"><div class="flex flex-wrap justify-between items-center gap-4"><div class="min-w-0 break-words"><h2 class="font-bold">{{user.full_name}}</h2><p class="text-sm text-muted mt-1">{{user.email}} · {{user.phone}}</p></div><div class="flex flex-wrap items-center gap-3"><Badge>{{roleLabel(user.role)}}</Badge><Badge :tone="user.is_active?'green':'gray'">{{user.is_active?'Активен':'Заблокирован'}}</Badge><Button variant="outline" @click="preview(user)">Управление доступом</Button></div></div></Card>
      </div>
      <div v-else-if="screen==='schedule'" class="grid gap-4">
        <Card v-for="master in masters" :key="master.id" padding="lg"><div class="flex flex-wrap justify-between gap-3"><h2 class="font-bold">{{master.full_name}}</h2><Badge :tone="master.is_available?'green':'gray'">{{master.is_available?'Доступен':'На паузе'}}</Badge></div><p class="text-sm text-muted mt-2">Дневной лимит: {{master.max_daily_requests}} заявок · {{date}}</p><div class="mt-5 grid gap-3"><div v-for="interval in intervals(master)" :key="interval.id" class="rounded-xl border border-line p-4"><strong>{{new Date(interval.starts_at).toLocaleTimeString('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'})}}–{{new Date(interval.ends_at).toLocaleTimeString('ru-RU',{timeZone:'Europe/Moscow',hour:'2-digit',minute:'2-digit'})}}</strong><p>{{interval.is_booked?'Занято заявкой #'+interval.request_id:'Свободное окно записи'}}</p><Button v-if="!isMaster&&!interval.is_booked" class="mt-3" variant="outline" @click="preview(interval)">Изменить интервал</Button></div><div v-for="request in appointments(master)" :key="request.id" class="rounded-xl border border-line p-4"><strong>{{request.preferred_slot}} · {{request.request_number}}</strong><p class="text-sm text-muted mt-1">{{request.service_mode==='onsite'?'Выезд к клиенту':'Ремонт в сервисе'}}</p></div><p v-if="!appointments(master).length" class="text-sm text-muted">На выбранную дату назначений нет.</p></div></Card>
      </div>
      <div v-else class="grid min-w-0 gap-3">
        <Card v-for="notice in notices" :key="notice.id" padding="lg">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <Badge>{{noticeCategories.find(c=>c.value===noticeKind(notice))?.label}}</Badge>
                <RouterLink v-if="notice.request_id" :to="'/admin/requests?request='+notice.request_id" class="whitespace-nowrap text-brand">
                  Заявка #{{notice.request_id}}
                </RouterLink>
                <Badge v-if="!notice.is_read" tone="blue">Новое</Badge>
              </div>
              <h2 class="mt-3 break-words font-semibold">{{notificationText(notice.message)}}</h2>
              <time class="mt-1 block text-xs text-muted">{{new Date(notice.created_at).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})}}</time>
            </div>
            <Button v-if="!notice.is_read" class="shrink-0 self-start sm:self-center" variant="outline" @click="markRead(notice.id)">Прочитано</Button>
          </div>
        </Card>
      </div>
    </PageState>
    <Card v-if="screen==='notifications'&&!isMaster" padding="lg"><details><summary class="font-bold cursor-pointer">Очередь email · {{workspace.queue.length}}</summary><p class="text-sm text-muted mt-2">Сообщения сохраняются в очереди. Внешняя отправка для учебного проекта не выполняется.</p><div v-for="message in workspace.queue" :key="message.id" class="border-t border-line py-3 mt-3"><div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2"><strong class="min-w-0 break-all">{{message.recipient}}</strong><Badge>{{message.status}}</Badge></div><p class="mt-2 break-words">{{message.subject}}</p><p class="mt-1 break-words text-sm text-muted">{{message.message}}</p></div><p v-if="!workspace.queue.length" class="mt-4 text-sm text-muted">Очередь пуста.</p></details></Card>
    <Modal v-model="editor" :title="screen==='users'?'Учётная запись':'Рабочий интервал'" description="Изменения сохраняются на сервере.">
      <form id="planning-form" class="grid gap-4" @submit.prevent="savePreview">
        <template v-if="screen==='users'"><Input v-if="!selected" label="Начальный пароль" type="password" v-model="form.password" minlength="8" required/><Input label="ФИО" v-model="form.full_name" required/><Input label="Email" type="email" v-model="form.email" required/><Input label="Телефон" type="tel" v-model="form.phone" required/><Select label="Роль" v-model="form.role" :options="roles.filter(r=>r.value)"/><Select label="Доступ" v-model="form.is_active" :options="[{value:1,label:'Активен'},{value:0,label:'Заблокирован'}]"/></template>
        <template v-else><Select v-if="!isMaster" label="Мастер" v-model="form.master_id" :options="adminMasters.map(m=>({value:m.id,label:m.full_name}))"/><Input type="date" label="Дата" v-model="form.date" required/><div class="grid gap-4 sm:grid-cols-2"><Input type="time" label="Начало" v-model="form.start" required/><Input type="time" label="Окончание" v-model="form.end" required/></div><p class="text-sm text-muted">Создавайте отдельное окно на одну запись с учётом длительности ремонта и дороги. Занятое окно изменять нельзя.</p></template>
      </form>
      <template #footer><Button variant="outline" @click="editor=false">Отмена</Button><Button variant="primary" form="planning-form" type="submit">Сохранить</Button></template>
    </Modal>
  </div>
</template>
