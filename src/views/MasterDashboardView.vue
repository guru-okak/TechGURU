<script setup>
import { countLabel } from '../data/presentationCount'
import { computed } from 'vue'
import { useMockPage } from '../composables/useMockPage'
import WorkspaceHero from '../components/WorkspaceHero.vue'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import PageState from '../components/ui/PageState.vue'
import StatusBadge from '../components/ui/StatusBadge.vue'
import ToggleSwitch from '../components/ui/ToggleSwitch.vue'
import { useSession } from '../composables/useSession'
import { useMasterRequests } from '../composables/useMasterRequests'
import { useMasterStock } from '../composables/useMasterStock'
import { useMasterNotifications } from '../composables/useMasterNotifications'
import { masterProfile, setAvailability } from '../data/masterProfile'
import DeviceArt from '../components/illustrations/DeviceArt.vue'
import StatusArt from '../components/illustrations/StatusArt.vue'
import { statusLabel } from '../config/statuses'
import { masterMedia } from '../data/masterMedia'
const {current}=useSession()
const page=useMockPage()
const {requests,activeRequests,loading,error,stats,load}=useMasterRequests()
const {stats:stockStats}=useMasterStock()
const {unreadCount,notifications}=useMasterNotifications()
const stages=computed(()=>['assigned','in_progress','waiting_parts','ready_for_pickup'].map(status=>({status,count:activeRequests.value.filter(r=>r.status===status).length})))
const recentEvents=computed(()=>notifications.value.slice(0,3))
const firstName=computed(()=>current.value.name.split(' ')[0])
const queue=computed(()=>activeRequests.value.slice(0,4))
const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Moscow'})
const plannedToday=computed(()=>activeRequests.value.filter(r=>r.desiredDateISO===today).length)
const metrics=computed(()=>[
 {label:'Активные заявки',value:stats.value.active,note:'Назначены и ещё не завершены',to:'/master/requests'},
 {label:'В работе',value:stats.value.inProgress,note:'Ремонты, которые вы начали',to:'/master/requests?status=in_progress'},
 {label:'Ожидают запчасти',value:stats.value.waitingParts,note:'Работы на паузе до поставки',to:'/master/requests?status=waiting_parts'},
 {label:'Завершено',value:stats.value.closed,note:'Выполнено за всё время',to:'/master/requests?scope=all'}
])

</script>
<template>
 <div class="master-home grid gap-6">
  <WorkspaceHero :title="'Хорошей работы, '+firstName+'.'" description="Ваши заявки, детали и ближайшие шаги — в одном рабочем пространстве." eyebrow="КАБИНЕТ МАСТЕРА" :image="masterMedia.workbench" large><Button to="/master/requests" variant="primary">Открыть заявки</Button><Button to="/master/warehouse" variant="outline">Мой склад</Button></WorkspaceHero>
  <PageState :loading="loading || page.loading.value" :error="!!error || page.error.value" :empty="page.empty.value || !requests.length" title="Назначений пока нет" description="Здесь появятся ваши задачи после назначения администратором." icon="clipboard" @retry="page.retry(); load()">
   <section class="master-home-metrics"><RouterLink v-for="m in metrics" :key="m.label" :to="m.to" class="master-home-metric"><span>{{m.label}}</span><strong>{{m.value}}</strong><small>{{m.note}}</small></RouterLink></section>
   <section class="master-work-grid mt-6">
    <Card padding="lg"><div class="master-section-top"><div><h2>Очередь работ</h2><p>Назначенные обращения по времени</p></div><RouterLink to="/master/requests">Все заявки →</RouterLink></div>
     <div v-if="queue.length" class="master-work-list"><RouterLink v-for="r in queue" :key="r.id" :to="'/master/task/'+r.number" class="master-work-card"><div class="master-work-card-top"><span class="master-device-art"><DeviceArt :name="r.icon"/></span><div><small>{{r.request_number??'#'+r.number}}</small><h3>{{r.device}}</h3><p>{{r.client}} · {{r.desiredDate}}</p></div></div><div class="master-work-card-bottom"><StatusBadge :status="r.status"/><span>{{r.service_mode==='onsite'?'Выезд к клиенту':'В сервисном центре'}} →</span></div></RouterLink></div><p v-else class="master-note">Активных работ нет. История выполненных ремонтов доступна в разделе заявок.</p>
    </Card>
    <aside class="master-work-aside">
     <Card padding="lg"><div class="master-availability"><div><strong>{{masterProfile.isAvailable?'Готов к новым задачам':'Приём заявок на паузе'}}</strong><small>Доступность для назначения</small></div><ToggleSwitch :model-value="masterProfile.isAvailable" label="Доступен для новых заявок" @update:model-value="setAvailability"/></div><h2>План на день</h2><p>Назначено на сегодня: <strong>{{plannedToday}}</strong><br>Дневной лимит: {{masterProfile.maxDailyRequests}} заявок</p><div class="master-load-bar" aria-hidden="true"><span :style="{width:Math.min(100,plannedToday/masterProfile.maxDailyRequests*100)+'%'}"></span></div><Button to="/master/profile" variant="outline" block>Настройки работы</Button></Card>
     <Card padding="lg"><h2>Запчасти под рукой</h2><p><strong>{{stockStats.positions}}</strong> позиций в мобильном запасе. Запрашивайте детали из карточки конкретной заявки.</p><Button to="/master/warehouse" variant="outline" block>Посмотреть остатки</Button></Card>
     <Card padding="lg"><h2>Обновления по работам</h2><p>{{unreadCount?countLabel(unreadCount,'непрочитанное уведомление','непрочитанных уведомления','непрочитанных уведомлений')+'. Проверьте новые назначения и поступления деталей.':'Все уведомления прочитаны. Новые назначения появятся здесь.'}}</p><Button to="/master/notifications" variant="outline" block>Открыть уведомления</Button></Card>
    </aside>
   </section>
   <section class="master-overview-grid"><Card padding="lg"><div class="master-section-top"><div><h2>Работы по этапам</h2><p>Где сейчас находятся активные заявки</p></div></div><div class="master-stage-list"><RouterLink v-for="s in stages" :key="s.status" :to="'/master/requests?status='+s.status" class="master-stage-row"><StatusArt :status="s.status"/><div><span>{{statusLabel(s.status)}}</span><div class="master-stage-track"><i :style="{width:(activeRequests.length?s.count/activeRequests.length*100:0)+'%'}"></i></div></div><strong>{{s.count}}</strong></RouterLink></div></Card><Card padding="lg"><div class="master-section-top"><div><h2>Последние события</h2><p>Изменения по вашим работам</p></div><RouterLink to="/master/notifications">Все события →</RouterLink></div><RouterLink v-for="n in recentEvents" :key="n.id" to="/master/notifications" class="master-event-row"><span class="master-event-dot" :class="{unread:n.unread}"></span><div><h3>{{n.title}}</h3><p>{{n.text}}</p><small>{{n.time}}</small></div></RouterLink><p v-if="!recentEvents.length" class="master-note">Новых событий пока нет.</p></Card></section>
  </PageState>
 </div>
</template>

