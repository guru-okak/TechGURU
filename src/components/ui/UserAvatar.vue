<script setup>
import {useSession} from '../../composables/useSession'
import PersonAvatar from './PersonAvatar.vue'
defineProps({size:{type:Number,default:36}})
const {current}=useSession()
</script>
<template><PersonAvatar class="user-avatar" :size="size" :name="current.name" :src="current.avatar"/></template>
