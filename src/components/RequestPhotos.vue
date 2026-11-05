<script setup>
import {computed} from 'vue'
const props=defineProps({photos:{default:()=>[]}})
const images=computed(()=>{try{return typeof props.photos==='string'?JSON.parse(props.photos):props.photos??[]}catch{return []}})
</script>
<template><section v-if="images.length"><h3 class="font-semibold mb-3">Фотографии устройства</h3><div class="request-photos"><a v-for="(photo,i) in images" :key="i" :href="photo" target="_blank" rel="noopener"><img :src="photo" :alt="'Фото устройства '+(i+1)" loading="lazy"/></a></div></section></template>
<style scoped>.request-photos{display:flex;gap:12px;flex-wrap:wrap}.request-photos img{width:150px;height:115px;border-radius:12px;object-fit:cover;border:1px solid var(--border)}</style>
