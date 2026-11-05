<script setup>
import {computed,ref,watch} from 'vue'
const props=defineProps({name:String,src:String,size:{type:Number,default:44}})
const broken=ref(false)
watch(()=>props.src,()=>{broken.value=false})
const initials=computed(()=>(props.name??'').split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join(''))
</script>
<template><span class="person-avatar" :style="{width:size+'px',height:size+'px',fontSize:Math.max(12,Math.round(size*.32))+'px'}"><img v-if="src&&!broken" :src="src" :alt="name" @error="broken=true"/><span v-else>{{initials}}</span></span></template>
<style scoped>.person-avatar{display:inline-grid;place-items:center;flex-shrink:0;overflow:hidden;border-radius:15px;background:linear-gradient(145deg,#d4eaff,#8dbaff);color:#174d9b;font-weight:750;font-size:15px;border:1px solid #82b3f530;box-shadow:0 4px 14px #165ac514}.person-avatar img{width:100%;height:100%;object-fit:cover}</style>
