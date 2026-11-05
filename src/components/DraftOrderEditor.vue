<script setup>
import {ref,watch} from 'vue'
import {mutate} from '../api/client'
import Button from './ui/Button.vue'
import Input from './ui/Input.vue'
import Select from './ui/Select.vue'
const props=defineProps({order:Object,items:Array,parts:Array})
const opened=ref(false),lines=ref([]),error=ref(''),partId=ref('')
function edit(){lines.value=props.items.map(i=>({part_id:i.part_id,quantity:i.quantity}));opened.value=true;error.value=''}
function add(){if(!partId.value||lines.value.some(i=>i.part_id===partId.value))return;lines.value.push({part_id:Number(partId.value),quantity:1});partId.value=''}
async function save(){try{await mutate('/business/orders/'+props.order.id+'/items',{items:lines.value.map(i=>({part_id:i.part_id,quantity:Number(i.quantity)}))});opened.value=false}catch(e){error.value=e.message}}
watch(()=>props.order?.id,()=>{opened.value=false})
</script>
<template><section v-if="order?.status==='draft'" class="my-5"><Button variant="outline" v-if="!opened" @click="edit">Изменить состав заказа</Button><form v-else @submit.prevent="save" class="grid gap-4"><div v-for="(item,index) in lines" :key="item.part_id" class="flex items-end gap-3"><div class="flex-1"><strong>{{parts.find(p=>p.id===item.part_id)?.name}}</strong><Input label="Количество" type="number" v-model="item.quantity" min="1" max="10000" required/></div><Button variant="ghost" @click="lines.splice(index,1)">Убрать</Button></div><Select v-model="partId" label="Добавить деталь" :options="parts.filter(p=>p.supplier_id===order.supplier_id&&p.is_active&&!lines.some(i=>i.part_id===p.id)).map(p=>({value:p.id,label:p.name}))"/><Button variant="outline" :disabled="!partId" @click="add">Добавить позицию</Button><p v-if="error" role="alert" class="text-danger">{{error}}</p><div class="flex gap-3"><Button type="submit" variant="primary">Сохранить состав</Button><Button variant="ghost" @click="opened=false">Отмена</Button></div></form></section></template>
