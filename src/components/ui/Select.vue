<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useAttrs, useId } from 'vue'
import SvgIcon from './SvgIcon.vue'
import Field from './Field.vue'
defineOptions({ inheritAttrs: false })
const props = defineProps({
 modelValue:{type:[String,Number],default:''},label:{type:String,default:''},hint:{type:String,default:''},error:{type:String,default:''},placeholder:{type:String,default:''},
 options:{type:Array,default:()=>[]},size:{type:String,default:'md'},disabled:{type:Boolean,default:false},required:{type:Boolean,default:false}
})
const emit=defineEmits(['update:modelValue'])
const attrs=useAttrs(), uid=useId(), trigger=ref(null), popup=ref(null), opened=ref(false), active=ref(-1), position=ref({})
const selectId=computed(()=>attrs.id||'select-'+uid), listId='options-'+uid
const normalized=computed(()=>props.options.map(o=>typeof o==='object'&&o!==null?o:{value:o,label:o}))
const selected=computed(()=>normalized.value.find(o=>String(o.value)===String(props.modelValue)))
const describedBy=computed(()=>props.error?selectId.value+'-error':props.hint?selectId.value+'-hint':undefined)
let typed='', timer
function place(){
 const r=trigger.value.getBoundingClientRect(), available=innerHeight-r.bottom-12, above=r.top-12
 const height=Math.min(300,Math.max(130,available>=180?available:above)), width=Math.min(Math.max(r.width,280),innerWidth-16)
 position.value={position:'fixed',left:Math.max(8,Math.min(r.left,innerWidth-width-8))+'px',width:width+'px',maxHeight:height+'px',...(available<180&&above>available?{bottom:innerHeight-r.top+7+'px'}:{top:r.bottom+7+'px'})}
}
async function open(){if(props.disabled)return;trigger.value?.focus({preventScroll:true});place();opened.value=true;active.value=normalized.value.findIndex(o=>String(o.value)===String(props.modelValue)&&!o.disabled);if(active.value<0)active.value=normalized.value.findIndex(o=>!o.disabled);await nextTick();reveal()}
function close(){opened.value=false;typed=''}
function reveal(){nextTick(()=>popup.value?.querySelector('[data-active="true"]')?.scrollIntoView({block:'nearest'}))}
function choose(i){const o=normalized.value[i];if(!o||o.disabled)return;emit('update:modelValue',o.value);close();trigger.value?.focus()}
function move(direction){const n=normalized.value.length;for(let step=1;step<=n;step++){const i=(active.value+direction*step+n)%n;if(!normalized.value[i].disabled){active.value=i;reveal();return}}}
function keydown(e){
 if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key)){e.preventDefault();if(!opened.value){open();return}if(e.key==='ArrowDown')move(1);else if(e.key==='ArrowUp')move(-1);else if(e.key==='Home'||e.key==='End'){const order=normalized.value.map((o,i)=>({o,i})).filter(x=>!x.o.disabled);active.value=(e.key==='Home'?order[0]:order.at(-1))?.i??-1;reveal()}else choose(active.value)}
 else if(e.key==='Escape'){e.preventDefault();close()}
 else if(e.key==='Tab')close()
 else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){if(!opened.value)open();typed+=e.key.toLowerCase();clearTimeout(timer);timer=setTimeout(()=>typed='',650);const i=normalized.value.findIndex(o=>!o.disabled&&String(o.label).toLowerCase().startsWith(typed));if(i>=0){active.value=i;reveal()}}
}
function outside(e){if(!trigger.value?.contains(e.target)&&!popup.value?.contains(e.target))close()}
function scroll(e){if(opened.value&&!popup.value?.contains(e.target))close()}
onMounted(()=>{document.addEventListener('pointerdown',outside);window.addEventListener('resize',close);document.addEventListener('scroll',scroll,true)})
onBeforeUnmount(()=>{clearTimeout(timer);document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',close);document.removeEventListener('scroll',scroll,true)})
</script>
<template>
 <Field :id="selectId" :label="label" :hint="hint" :error="error" :required="required">
  <button :id="selectId" ref="trigger" v-bind="attrs" type="button" role="combobox" aria-haspopup="listbox" :aria-expanded="opened" :aria-controls="listId" :aria-activedescendant="opened&&active>=0?listId+'-'+active:undefined" :aria-label="label||attrs['aria-label']||placeholder||'Выбор значения'" :aria-required="required||undefined" :aria-invalid="error?true:undefined" :aria-describedby="describedBy" :disabled="disabled" class="custom-select" :class="{'is-open':opened,'is-error':error,'is-small':size==='sm','is-placeholder':!modelValue}" @click="opened?close():open()" @keydown="keydown"><span>{{ selected?.label||placeholder||'Выберите значение' }}</span><SvgIcon name="chevronDown" :size="18"/></button>
  <Teleport to="body"><div v-if="opened" :id="listId" ref="popup" role="listbox" :aria-label="label||attrs['aria-label']||'Варианты'" class="select-popup" :style="position"><div v-for="(o,i) in normalized" :id="listId+'-'+i" :key="o.value" role="option" :aria-selected="String(o.value)===String(modelValue)" :aria-disabled="o.disabled||undefined" :data-active="active===i" class="select-option" @pointermove="!o.disabled&&(active=i)" @mousedown.prevent @click="choose(i)"><span>{{ o.label }}</span><SvgIcon v-if="String(o.value)===String(modelValue)" name="check" :size="17"/></div><p v-if="!normalized.length" class="select-option">Нет вариантов</p></div></Teleport>
 </Field>
</template>
<style>
.custom-select{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-width:0;min-height:44px;padding:10px 13px;text-align:left;font-size:14px;line-height:1.5;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:11px;cursor:pointer;transition:border-color .18s,box-shadow .18s}.custom-select>span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.custom-select>span:last-child{color:var(--muted);transition:transform .18s}.custom-select.is-open>span:last-child{transform:rotate(180deg)}.custom-select:hover{border-color:color-mix(in srgb,var(--blue) 50%,var(--border))}.custom-select:focus-visible,.custom-select.is-open{outline:none;border-color:var(--blue);box-shadow:0 0 0 3px color-mix(in srgb,var(--blue) 15%,transparent)}.custom-select.is-error{border-color:var(--red)}.custom-select:disabled{opacity:.6;cursor:not-allowed}.custom-select.is-small{min-height:38px;padding:7px 11px}.select-popup{z-index:10000;overflow-y:auto;overscroll-behavior:contain;padding:6px;border:1px solid var(--border);border-radius:14px;background:var(--surface);color:var(--text);box-shadow:0 16px 50px #06152d30;scrollbar-width:thin;scrollbar-color:var(--border) transparent;animation:select-appear .14s ease-out}.select-option{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;margin:2px 0;min-height:43px;border-radius:9px;font-size:14px;line-height:1.5;cursor:pointer;overflow-wrap:anywhere}.select-option>span:first-child{flex:1;min-width:0}.select-option[aria-selected=true]{color:var(--blue);font-weight:600;background:color-mix(in srgb,var(--blue) 9%,transparent)}.select-option[data-active=true]{background:color-mix(in srgb,var(--blue) 13%,var(--surface))}.select-option[aria-disabled=true]{opacity:.45;cursor:not-allowed}@keyframes select-appear{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.select-popup{animation:none}.custom-select,.custom-select>span:last-child{transition:none}}
</style>

