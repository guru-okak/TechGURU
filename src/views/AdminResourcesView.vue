<script setup>
import DraftOrderEditor from '../components/DraftOrderEditor.vue'
import centralPointPhoto from '../assets/service-points/central-reception.webp'
import northPointPhoto from '../assets/service-points/north-reception.webp'
const pointPhoto = id => ({1:centralPointPhoto,2:northPointPhoto})[id] ?? centralPointPhoto
import AdminContextPanel from '../components/AdminContextPanel.vue'
import SvgIcon from '../components/ui/SvgIcon.vue'
import {adminRequests,activeStatuses} from '../data/admin'
import AdminSupplyBrief from '../components/AdminSupplyBrief.vue'
import { computed,ref,watch } from 'vue'
import { useRoute } from 'vue-router'
import WorkspaceHero from '../components/WorkspaceHero.vue'
import {adminMedia} from '../data/adminMedia'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import Input from '../components/ui/Input.vue'
import Select from '../components/ui/Select.vue'
import Badge from '../components/ui/Badge.vue'
import Modal from '../components/ui/Modal.vue'
import PageState from '../components/ui/PageState.vue'
import PartArt from '../components/illustrations/PartArt.vue'
import AdminRecordEditor from '../components/AdminRecordEditor.vue'
import {useMockPage} from '../composables/useMockPage'
import {toast} from '../composables/useToast'
import {purchaseOrders,purchaseItems,adminParts,auditEvents,money} from '../data/admin'
import {adminPoints,adminSuppliers,orderLabels,orderTones,orderTotal,advanceOrder,makePurchaseDrafts,downloadCsv,auditLabel,auditTarget,adminPartKind} from '../data/adminOperations'
const route=useRoute(),entity=computed(()=>route.meta.entity),pageState=useMockPage()
const shown=ref(25)
const search=ref(''),status=ref(''),role=ref(''),detail=ref(null),editRecord=ref(null),editOpen=ref(false),message=ref('')
const meta=computed(()=>({
 points:{title:'Точки приёма',description:'Адреса сервисных центров, доступные клиентам при оформлении ремонта.',eyebrow:'СЕРВИС РЯДОМ',image:adminMedia.points},
 suppliers:{title:'Поставщики',description:'Партнёры сервиса, контактные лица и поставки запчастей.',eyebrow:'НАДЁЖНОЕ СНАБЖЕНИЕ',image:adminMedia.suppliers},
 orders:{title:'Заказы поставщикам',description:'Проверяйте черновики, подтверждайте закупки и фиксируйте получение деталей.',eyebrow:'ЗАКУПКИ И ПОСТАВКИ',image:adminMedia.orders},
 audit:{title:'Журнал аудита',description:'Кто, когда и какие изменения внёс в работу сервиса.',eyebrow:'ИСТОРИЯ ДЕЙСТВИЙ',image:adminMedia.audit}
})[entity.value])
const source=computed(()=>({points:adminPoints,suppliers:adminSuppliers,orders:purchaseOrders,audit:auditEvents})[entity.value]??[])
const filtered=computed(()=>pageState.empty.value?[]:source.value.filter(r=>{const text=entity.value==='audit'?auditLabel(r)+' '+r.action+' '+r.entity_type+' '+r.details:entity.value==='orders'?r.order_number+' '+adminSuppliers.find(s=>s.id===r.supplier_id)?.name:[r.name,r.address,r.contact_person,r.email,r.phone].join(' ');return text.toLowerCase().includes(search.value.trim().toLowerCase())&&(!status.value||r.status===status.value)&&(!role.value||r.role===role.value)}))
const visibleRows=computed(()=>filtered.value.slice(0,shown.value))
watch([search,status,role,()=>route.path],()=>{shown.value=25})
const order=computed(()=>entity.value==='orders'?purchaseOrders.find(o=>o.id===detail.value):null)
const orderItems=computed(()=>purchaseItems.filter(i=>i.purchase_order_id===order.value?.id))
const auditDetail=computed(()=>entity.value==='audit'?auditEvents.find(e=>e.id===detail.value):null)
watch(()=>route.path,()=>{search.value='';status.value='';role.value='';detail.value=null;editOpen.value=false;message.value=''})
function edit(record=null){editRecord.value=record;editOpen.value=true}
async function generate(){const n=await makePurchaseDrafts();toast(n?'Черновики закупок обновлены':'Остатки в норме, закупка не требуется')}
async function advance(){message.value='';try{const status=await advanceOrder(order.value.id);toast(status==='received'?'Поставка оприходована':'Статус заказа обновлён')}catch(e){message.value=e.message}}
function exportRows(){
 const rows=entity.value==='audit'?[['Дата','Роль','Действие','Тип объекта','ID','Детали'],...filtered.value.map(e=>[e.created_at,e.role,e.action,e.entity_type,e.entity_id,e.details])]:[['Заказ','Поставщик','Статус','Сумма'],...filtered.value.map(o=>[o.order_number,adminSuppliers.find(s=>s.id===o.supplier_id)?.name,orderLabels[o.status],orderTotal(o.id)])]
 downloadCsv('TechGURU-'+entity.value+'.csv',rows)
}
</script>
<template>
 <div class="admin-resources grid gap-6">
  <WorkspaceHero :title="meta.title" :description="meta.description" :eyebrow="meta.eyebrow" :image="meta.image"><Button v-if="entity==='points'||entity==='suppliers'" variant="primary" @click="edit()">Добавить {{entity==='points'?'точку приёма':'поставщика'}}</Button><template v-else><Button v-if="entity==='orders'" variant="primary" @click="generate">Сформировать закупку</Button><Button variant="outline" @click="exportRows">Экспорт CSV</Button></template></WorkspaceHero>
  <AdminSupplyBrief v-if="!pageState.loading.value&&!pageState.error.value&&!pageState.empty.value&&entity==='orders'" compact/>
  <AdminContextPanel v-if="!pageState.loading.value&&!pageState.error.value&&!pageState.empty.value&&['points','suppliers','audit'].includes(entity)" :entity="entity" :selected="entity==='audit'?role:search" @filter="v=>{if(entity==='audit')role=v;else search=v}"/>
  <Card padding="lg"><div class="admin-resource-filters" :class="{'admin-resource-filters-single':!['orders','audit'].includes(entity)}"><Input v-model="search" label="Поиск" type="search" icon-left="search" :placeholder="entity==='audit'?'Действие, объект или номер заявки':'Название или номер'"/><Select v-if="entity==='orders'" v-model="status" label="Статус заказа" :options="[{value:'',label:'Все статусы'},...Object.entries(orderLabels).map(([value,label])=>({value,label}))]"/><Select v-if="entity==='audit'" v-model="role" label="Кто выполнил" :options="[{value:'',label:'Все роли'},{value:'admin',label:'Администратор'},{value:'master',label:'Мастер'},{value:'client',label:'Клиент'},{value:'system',label:'Система'}]"/></div><p class="admin-result-count">Найдено {{filtered.length}} из {{source.length}}</p></Card>
  <PageState :loading="pageState.loading.value" :error="pageState.error.value" :empty="!filtered.length" @retry="pageState.retry" title="Записей пока нет" description="Измените поиск или добавьте запись в справочник.">
   <div v-if="entity==='points'" class="admin-points-grid"><Card v-for="p in filtered" :key="p.id" padding="lg" class="admin-point-card"><img class="admin-point-background" :src="pointPhoto(p.id)" alt="" loading="lazy" aria-hidden="true"/><div class="admin-branch-top"><span class="admin-branch-art"><SvgIcon name="store" :size="30"/></span><Badge :tone="p.is_active?'green':'gray'">{{p.is_active?'Открыта':'Архив'}}</Badge></div><h2>{{p.name}}</h2><p class="admin-point-address">{{p.address}}</p><p class="text-sm text-muted mb-5">Приём устройств для диагностики и ремонта в сервисе.</p><div class="admin-branch-facts"><strong>{{adminRequests.filter(r=>r.dropoff_point_id===p.id&&activeStatuses.includes(r.status)).length}}</strong><span>активных ремонтов в этой точке</span></div><Button variant="outline" @click="edit(p)">Редактировать точку <SvgIcon name="arrowRight" :size="14"/></Button></Card></div>
   <Card v-else padding="none" class="overflow-hidden"><div class="admin-table-wrap"><table class="directory-table admin-resource-table" :aria-label="meta.title"><thead><tr v-if="entity==='suppliers'"><th>Поставщик</th><th>Контакты</th><th>Заказы</th><th>Статус</th><th>Действие</th></tr><tr v-else-if="entity==='orders'"><th>Заказ</th><th>Поставщик</th><th>Состав</th><th>Сумма</th><th>Статус</th><th>Действие</th></tr><tr v-else><th>Время</th><th>Действие</th><th>Исполнитель</th><th>Объект</th><th>Детали</th></tr></thead><tbody>
    <tr v-for="r in visibleRows" :key="r.id"><template v-if="entity==='suppliers'"><td data-label="Поставщик"><strong>{{r.name}}</strong><p class="text-sm text-muted mt-1">{{r.contact_person}}</p></td><td data-label="Контакты"><a :href="'mailto:'+r.email" class="block text-brand">{{r.email}}</a><a :href="'tel:'+r.phone" class="text-muted">{{r.phone}}</a></td><td data-label="Заказы">{{purchaseOrders.filter(o=>o.supplier_id===r.id).length}}</td><td data-label="Статус"><Badge :tone="r.is_active?'green':'gray'">{{r.is_active?'Активен':'Архив'}}</Badge></td><td data-label="Действие"><Button variant="outline" size="sm" @click="edit(r)">Изменить</Button></td></template>
    <template v-else-if="entity==='orders'"><td data-label="Заказ"><strong>{{r.order_number}}</strong><p class="text-sm text-muted mt-1">{{new Date(r.created_at).toLocaleDateString('ru-RU',{timeZone:'Europe/Moscow'})}}</p></td><td data-label="Поставщик">{{adminSuppliers.find(s=>s.id===r.supplier_id)?.name}}</td><td data-label="Состав">{{purchaseItems.filter(i=>i.purchase_order_id===r.id).length}} поз.</td><td data-label="Сумма" class="font-semibold">{{money(orderTotal(r.id))}}</td><td data-label="Статус"><Badge :tone="orderTones[r.status]">{{orderLabels[r.status]}}</Badge></td><td data-label="Действие"><Button variant="outline" size="sm" @click="detail=r.id">Открыть заказ</Button></td></template>
    <template v-else><td data-label="Время">{{new Date(r.created_at).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})}}</td><td data-label="Действие"><strong>{{auditLabel(r)}}</strong><p class="text-sm text-muted mt-1">{{r.action}}</p></td><td data-label="Исполнитель">{{{admin:'Администратор',master:'Мастер',client:'Клиент',system:'Система'}[r.role]}}<small class="block text-muted">ID {{r.user_id??'—'}}</small></td><td data-label="Объект"><RouterLink :to="auditTarget(r)" class="text-brand">{{r.entity_type}} #{{r.entity_id}}</RouterLink></td><td data-label="Детали"><Button variant="ghost" size="sm" @click="detail=r.id">Подробнее</Button></td></template></tr>
   </tbody></table></div></Card>
  </PageState>
  <AdminRecordEditor v-model="editOpen" :entity="entity" :record="editRecord"/>
  <div v-if="['audit','suppliers'].includes(entity)&&shown<filtered.length" class="flex justify-center"><Button variant="outline" @click="shown+=25">Показать ещё · {{filtered.length-shown}}</Button></div>
  <Modal :model-value="!!order" @update:model-value="v=>{if(!v)detail=null}" :title="order?.order_number??'Заказ'" size="lg"><template v-if="order"><div class="flex flex-wrap gap-3 mb-5"><Badge :tone="orderTones[order.status]">{{orderLabels[order.status]}}</Badge><span class="text-sm text-muted">{{adminSuppliers.find(s=>s.id===order.supplier_id)?.name}}</span></div><div v-for="item in orderItems" :key="item.id" class="admin-order-item"><span><PartArt :kind="adminPartKind(item.part_id).kind"/></span><div><strong>{{adminParts.find(p=>p.id===item.part_id)?.name}}</strong><p>{{item.quantity}} шт. × {{money(item.unit_price)}}</p></div><b>{{money(item.quantity*item.unit_price)}}</b></div><DraftOrderEditor :order="order" :items="orderItems" :parts="adminParts"/><p class="font-bold text-lg mt-5">Итого: {{money(orderTotal(order.id))}}</p><p v-if="order.received_at" class="mt-3 text-sm text-muted">Получен {{new Date(order.received_at).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})}}</p><p v-if="message" role="alert" class="text-danger mt-4">{{message}}</p></template><template #footer><Button variant="outline" @click="detail=null">Закрыть</Button><Button v-if="order&&order.status!=='received'" variant="primary" @click="advance">{{{draft:'Подтвердить заказ',pending:'Отметить отправленным',sent:'Получить поставку'}[order.status]}}</Button></template></Modal>
  <Modal :model-value="!!auditDetail" @update:model-value="v=>{if(!v)detail=null}" title="Подробности события"><template v-if="auditDetail"><h3 class="font-semibold mb-4">{{auditLabel(auditDetail)}}</h3><dl class="admin-detail-grid"><dt>Действие</dt><dd>{{auditDetail.action}}</dd><dt>Объект</dt><dd>{{auditDetail.entity_type}} #{{auditDetail.entity_id}}</dd><dt>Время</dt><dd>{{new Date(auditDetail.created_at).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})}}</dd></dl><pre class="admin-audit-json">{{JSON.stringify(JSON.parse(auditDetail.details),null,2)}}</pre></template></Modal>
 </div>
</template>

