<script setup>
import '../../assets/vendor/ldrs-orbit.css'
defineProps({label:{type:String,default:'Загружаем TechGURU…'},compact:Boolean})
</script>
<template><div class="brand-loader" :class="{'brand-loader-compact':compact}" role="status"><span class="loader-orbit" aria-hidden="true"><span class="orbit-dots"></span></span><div class="brand-loader-copy"><strong>Tech<span>GURU</span></strong><span>{{label}}</span></div></div></template>
<style scoped>
.brand-loader{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:22px 12px;text-align:center}
.loader-orbit{--uib-size:60px;--uib-speed:1.6s;--uib-color:var(--blue);height:32px;position:relative}
.orbit-dots{height:100%;width:100%;position:relative}
.brand-loader-copy{display:grid;gap:5px}.brand-loader-copy strong{color:var(--text);font-weight:800;font-size:17px;letter-spacing:-.04em}.brand-loader-copy strong span{color:var(--blue)}.brand-loader-copy>span{color:var(--muted);font-size:12px;font-weight:500;letter-spacing:0}
.brand-loader-compact{flex-direction:row;padding:0;gap:12px;text-align:left}.brand-loader-compact .loader-orbit{--uib-size:40px;height:20px}.brand-loader-compact .brand-loader-copy{gap:2px}.brand-loader-compact .brand-loader-copy strong{font-size:13px}.brand-loader-compact .brand-loader-copy>span{font-size:11px}
@media(prefers-reduced-motion:reduce){.loader-orbit :deep(.orbit-dots):before,.loader-orbit :deep(.orbit-dots):after{animation:none}.loader-orbit :deep(.orbit-dots):before{transform:translateX(-8px)}.loader-orbit :deep(.orbit-dots):after{transform:translateX(8px)}}
</style>
