<script setup>
import { countLabel } from '../data/presentationCount'
import { computed, ref } from 'vue'
import WorkspaceHero from '../components/WorkspaceHero.vue'
import { masterMedia } from '../data/masterMedia'
import PartArt from '../components/illustrations/PartArt.vue'
import DeviceArt from '../components/illustrations/DeviceArt.vue'
import { partPresentation,partCategories } from '../data/partPresentation'
import { useMasterStock } from '../composables/useMasterStock'
import { useMockPage } from '../composables/useMockPage'
import Card from '../components/ui/Card.vue'
import Input from '../components/ui/Input.vue'
import Button from '../components/ui/Button.vue'
import Badge from '../components/ui/Badge.vue'
import PageState from '../components/ui/PageState.vue'
const {rows:sourceRows,loading:sourceLoading,error:sourceError,stats:sourceStats,load:reload}=useMasterStock()
const page=useMockPage(),search=ref(''),category=ref('Все')
const rows=computed(()=>page.empty.value?[]:sourceRows.value.map(row=>({...row,...partPresentation(row.part_id)})))
const filtered=computed(()=>rows.value.filter(r=>(category.value==='Все'||r.category===category.value)&&`${r.name} ${r.sku} ${r.category}`.toLowerCase().includes(search.value.trim().toLowerCase())))
const grouped=computed(()=>partCategories.map(name=>({name,rows:filtered.value.filter(r=>r.category===name).sort((a,b)=>a.name.localeCompare(b.name,'ru'))})).filter(g=>g.rows.length))
const categories=computed(()=>['Все',...partCategories.filter(c=>rows.value.some(r=>r.category===c))])
const icons={'Смартфоны':'smartphone','Ноутбуки и ПК':'laptop','Планшеты':'tablet','Другие запчасти':'box','Все':'box'}
const stats=computed(()=>page.empty.value?{positions:0,units:0,low:0}:sourceStats.value)
function load(){page.retry();reload()}
</script>
<template>
 <div class="master-warehouse grid gap-6">
  <WorkspaceHero title="Мой склад" description="Запчасти по видам техники. Проверяйте запас на руках и резерв под ваши работы." eyebrow="ЗАПЧАСТИ И МАТЕРИАЛЫ" :image="masterMedia.partsStorage"/>
  <section class="stock-summary"><Card><span>Позиций на руках</span><strong>{{stats.positions}}</strong><small>Видов запчастей</small></Card><Card><span>Всего единиц</span><strong>{{stats.units}}</strong><small>Физический мобильный запас</small></Card><Card><span>Низкий остаток</span><strong>{{stats.low}}</strong><small>Позиции, требующие внимания</small></Card></section>
  <Card padding="lg"><Input v-model="search" type="search" label="Найти запчасть" icon-left="search" placeholder="Название, артикул или вид техники"/><div class="stock-category-tabs" aria-label="Вид техники"><button v-for="c in categories" :key="c" :aria-pressed="category===c" :class="{active:category===c}" @click="category=c"><span><DeviceArt :name="icons[c]"/></span>{{c}}<small>{{c==='Все'?rows.length:rows.filter(r=>r.category===c).length}}</small></button></div><p class="stock-results">Найдено: {{filtered.length}} из {{rows.length}} позиций</p></Card>
  <p class="master-note">«На руках» — полученные вами детали. «В заявке» — резерв на центральном складе до фактической выдачи. Запрос деталей оформляется из карточки ремонта.</p>
  <PageState :loading="sourceLoading||page.loading.value" :error="!!sourceError||page.error.value" :empty="!filtered.length" :title="rows.length?'Запчасти не найдены':'Запасов пока нет'" description="Попробуйте изменить поиск или выберите другой вид техники." icon="box" @retry="load"><template #action><Button v-if="search||category!=='Все'" variant="outline" @click="search='';category='Все'">Сбросить поиск</Button></template>
   <div class="stock-groups"><section v-for="group in grouped" :key="group.name" class="stock-group" :data-category="group.name"><div class="stock-group-heading"><h2>{{group.name}}</h2><span>{{countLabel(group.rows.length,'позиция','позиции','позиций')}}</span></div><div class="stock-columns" aria-hidden="true"><span>Запчасть</span><span>Артикул</span><span>На руках</span><span>В заявке</span></div><div v-for="row in group.rows" :key="row.id" class="stock-row"><div class="stock-part"><span class="part-cell-art"><PartArt :kind="row.kind"/></span><div><h3>{{row.name}}</h3><small>{{row.sku}}</small></div></div><span class="stock-sku">{{row.sku}}</span><div class="stock-quantity"><small>На руках</small><Badge :tone="row.quantity<row.min_stock?'amber':'green'">{{row.quantity}} шт</Badge></div><div class="stock-quantity"><small>В заявке</small><Badge v-if="row.inRequests" tone="blue">{{row.inRequests}} шт</Badge><span v-else>—</span></div></div></section></div>
  </PageState>
 </div>
</template>
<style scoped>
.stock-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.stock-summary :deep(.card-surface),.stock-summary :deep(.card){display:grid;gap:9px}.stock-summary span{font-size:14px;color:var(--muted)}.stock-summary strong{font-size:32px;font-weight:700;letter-spacing:-.04em}.stock-summary small{font-size:12px;color:var(--muted);line-height:1.7}.stock-category-tabs{display:flex;gap:10px;flex-wrap:wrap;margin-top:23px}.stock-category-tabs button{display:flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--border);border-radius:12px;font-size:14px;background:var(--surface);cursor:pointer}.stock-category-tabs button>span{width:29px;height:29px}.stock-category-tabs small{padding:2px 6px;border-radius:6px;background:var(--surface2);font-size:11px;color:var(--muted)}.stock-category-tabs button.active{color:var(--blue);border-color:var(--blue);background:color-mix(in srgb,var(--blue) 6%,var(--surface))}.stock-results{font-size:13px;color:var(--muted);margin-top:18px}.stock-groups{display:grid;gap:30px}.stock-group{min-width:0}.stock-group-heading{display:flex;align-items:center;gap:12px;margin-bottom:18px}.stock-group-heading h2{font-size:21px;font-weight:700;letter-spacing:-.025em}.stock-group-heading>span{font-size:12px;color:var(--muted);padding:4px 8px;border:1px solid var(--border);border-radius:8px;background:var(--surface)}.stock-columns,.stock-row{display:grid;grid-template-columns:minmax(0,1fr) 140px 110px 110px;gap:20px;align-items:center}.stock-columns{padding:0 22px 10px;font-size:12px;color:var(--muted)}.stock-columns>span:nth-last-child(-n+2){text-align:center}.stock-row{padding:18px 22px;border:1px solid var(--border);border-radius:16px;background:var(--surface);margin-top:10px}.stock-part{display:flex;gap:15px;align-items:center;min-width:0}.part-cell-art{display:block;width:64px;height:64px;border-radius:15px;background:radial-gradient(ellipse at top,color-mix(in srgb,var(--blue) 8%,var(--surface)),var(--surface2));padding:5px;flex-shrink:0}.stock-part h3{font-size:15px;font-weight:650;line-height:1.6}.stock-part small{display:none}.stock-sku{font-size:13px;font-family:monospace;color:var(--muted)}.stock-quantity{display:flex;justify-content:center;align-items:center;gap:8px;min-height:24px}.stock-quantity>small{display:none}@media(max-width:1050px){.stock-row,.stock-columns{grid-template-columns:minmax(0,1fr) 90px 85px}.stock-sku,.stock-columns>span:nth-child(2){display:none}.stock-part small{display:block;color:var(--muted);font-size:12px;margin-top:4px}}@media(max-width:650px){.stock-summary{gap:10px}.stock-summary :deep(.card-surface),.stock-summary :deep(.card){padding:16px}.stock-summary span{font-size:12px}.stock-summary strong{font-size:27px}.stock-summary small{font-size:11px}.stock-category-tabs{gap:8px}.stock-category-tabs button{font-size:12px;padding:7px 9px}.stock-columns{display:none}.stock-row{grid-template-columns:1fr 1fr;padding:17px;gap:17px}.stock-part{grid-column:1/-1;gap:12px}.stock-part h3{font-size:14px}.part-cell-art{width:56px;height:56px}.stock-quantity{justify-content:flex-start;flex-wrap:wrap}.stock-quantity>small{display:block;font-size:12px;color:var(--muted)}.stock-group-heading h2{font-size:19px}}
</style>

