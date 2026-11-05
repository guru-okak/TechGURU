<script setup>
defineProps({title:String,description:String,eyebrow:{type:String,default:'РАБОЧЕЕ ПРОСТРАНСТВО'},image:String,large:Boolean})
</script>
<template><header class="master-page-intro" :class="{'master-page-intro-large':large}"><div class="master-intro-photo" v-if="image"><img :src="image" alt="" decoding="async"/></div><div class="master-intro-copy"><span class="master-eyebrow">{{ eyebrow }}</span><h1>{{ title }}</h1><p>{{ description }}</p><div v-if="$slots.default" class="master-intro-actions"><slot/></div></div></header></template>

