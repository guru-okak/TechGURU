<script setup>
import { computed } from 'vue'
import { statusTone } from '../../config/statuses'
const props=defineProps({status:{type:String,required:true},size:{type:Number,default:34}})
const tones={blue:'var(--blue)',purple:'var(--purple)',green:'var(--green)',amber:'var(--amber)',orange:'var(--orange)',red:'var(--red)',gray:'var(--muted)'}
const color=computed(()=>tones[statusTone(props.status)]??tones.blue)
const paths={
 new:'<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4V3h6v3H9M9 12h6m-3-3v6"/>',
 confirmed:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-13 5 3 3 5-5"/>',
 assigned:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 10-4m4-9 3 3-5 5-3-3zm-5 5-1 4 4-1"/>',
 in_progress:'<path d="m5 3 4 4-2 2-4-4zm3 5 5 5m1-8a5 5 0 0 0-1 6L5 19l2 2 8-8a5 5 0 0 0 6-6l-3 3-3-3 3-3a5 5 0 0 0-4 1z"/>',
 waiting_parts:'<path d="m3 7 8-4 8 4-8 4zm0 0v10l8 4v-10m0 10 3-1M7 5l8 4"/><circle cx="18" cy="16" r="5"/><path d="M18 13v3l2 1"/>',
 ready_for_pickup:'<path d="m3 7 9-4 9 4-9 4zm0 0v10l9 4 9-4V7m-9 4v10M7 5l9 4m-1 5 2 2 3-3"/>',
 completed:'<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z"/><path d="m8 12 3 3 5-6"/>',
 closed:'<path d="M3 7V5a2 2 0 0 1 2-2h5l3 3h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><rect x="8" y="12" width="8" height="6" rx="1"/><path d="M10 12v-2a2 2 0 0 1 4 0v2"/>',
 cancelled:'<circle cx="12" cy="12" r="9"/><path d="m8 8 8 8m0-8-8 8"/>',
 rejected:'<rect x="5" y="4" width="14" height="17" rx="3"/><path d="M9 4V3h6v3H9m0 8h6"/>'
}
const markup=computed(()=>paths[props.status]??paths.new)
</script>
<template><span class="status-art" :style="{width:size+'px',height:size+'px','--status-color':color}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"><g v-html="markup"/></svg></span></template>
<style scoped>.status-art{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:11px;color:var(--status-color);background:linear-gradient(145deg,color-mix(in srgb,var(--status-color) 18%,var(--surface)),color-mix(in srgb,var(--status-color) 5%,var(--surface)));border:1px solid color-mix(in srgb,var(--status-color) 28%,var(--border));box-shadow:inset 0 1px 0 #ffffff12,0 3px 8px #10284c0a}.status-art svg{width:62%;height:62%}</style>

