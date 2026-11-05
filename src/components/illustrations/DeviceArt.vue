<script setup>
import { computed, getCurrentInstance } from 'vue'
const props = defineProps({ name: { type: String, default: 'box' } })
// Собственный набор SVG: металлические корпуса, стекло и единая перспектива.
// Уникальные id градиентов исключают конфликты в списках и модальных окнах.
const id = `device-${getCurrentInstance().uid}`
const metal = `url(#${id}-metal)`, glass = `url(#${id}-glass)`, dark = `url(#${id}-dark)`
const frame = (x,y,w,h,r=5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${metal}" stroke="#94a9c3" stroke-width="1.1"/>`
const screen = (x,y,w,h,r=3) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${glass}"/><path d="M${x+3} ${y+h-5} Q${x+w*.35} ${y+h*.3} ${x+w-3} ${y+5}" stroke="#c9f0ff" stroke-opacity=".55" stroke-width="2"/><path d="M${x+3} ${y+h-10} Q${x+w*.45} ${y+h*.25} ${x+w-3} ${y+10}" stroke="#7abaff" stroke-opacity=".45" stroke-width="3"/>`
const art = computed(() => ({
 hob: `${frame(5,10,70,60,6)}<rect x="9" y="14" width="62" height="52" rx="4" fill="#152238"/><g fill="none" stroke="#91a6c0" stroke-width="2"><circle cx="25" cy="29" r="9"/><circle cx="54" cy="29" r="11"/><circle cx="25" cy="51" r="11"/><circle cx="54" cy="52" r="8"/></g><circle cx="40" cy="61" r="2" fill="#3b82f6"/>`,
 smartphone: `${frame(23,5,34,69,8)}<rect x="25" y="7" width="30" height="65" rx="7" fill="#152238"/>${screen(27,10,26,59,5)}<rect x="34" y="10" width="12" height="4" rx="2" fill="#172941"/><rect x="35" y="65" width="10" height="1.5" rx=".75" fill="#d9f4ff"/><path d="M21.5 20v7m0 5v8m37-13v11" stroke="#92a6c0" stroke-width="1.5"/>`,
 tablet: `${frame(15,8,50,63,6)}<rect x="17" y="10" width="46" height="59" rx="5" fill="#17263d"/>${screen(20,13,40,53,3)}<circle cx="40" cy="11.5" r=".7" fill="#95b2d4"/>`,
 laptop: `${frame(9,13,62,44,5)}<rect x="11" y="15" width="58" height="40" rx="3" fill="#132238"/>${screen(14,18,52,33,2)}<circle cx="40" cy="16" r=".7" fill="#93accb"/><path d="M9 57h62l7 9a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" fill="${metal}" stroke="#94a9c3"/><path d="M15 59h50l3 4H12z" fill="#8ca1bb"/><path d="M32 64h16l2 3H30z" fill="#b7c6d8"/><path d="M3 67h74" stroke="#768ba4"/>`,
 monitor: `${frame(5,10,70,46,4)}<rect x="7" y="12" width="66" height="40" rx="2" fill="#132238"/>${screen(10,15,60,34,1)}<path d="M35 56h10l2 12H33z" fill="${metal}"/><path d="M25 70h30" stroke="#9badc4" stroke-width="4" stroke-linecap="round"/><circle cx="40" cy="54" r=".8" fill="#3b82f6"/>`,
 tv: `${frame(3,12,74,47,3)}<rect x="5" y="14" width="70" height="42" rx="1" fill="#132238"/>${screen(8,17,64,36,1)}<path d="m18 59-7 9m51-9 7 9" stroke="#6d819d" stroke-width="3" stroke-linecap="round"/>`,
 washer: `${frame(15,5,50,69,6)}<path d="M16 23h48" stroke="#a4b5cc"/><rect x="21" y="11" width="15" height="7" rx="1.5" fill="#becddd"/><rect x="42" y="12" width="8" height="4" rx="1" fill="#17365c"/><circle cx="57" cy="14" r="3.5" fill="#f6f9fc" stroke="#94a9c3"/><circle cx="40" cy="46" r="18" fill="${dark}" stroke="#93a9c4" stroke-width="2.5"/><circle cx="40" cy="46" r="13" fill="${glass}"/><path d="M29 49q12-9 22-1v5a12 12 0 0 1-22 0z" fill="#b4e1ff" opacity=".6"/><path d="M27 69h26" stroke="#b5c3d5"/>`,
 fridge: `${frame(22,3,36,73,5)}<path d="M23 29h34" stroke="#91a6c0"/><rect x="48" y="13" width="3" height="10" rx="1.5" fill="#6b819e"/><rect x="48" y="36" width="3" height="18" rx="1.5" fill="#6b819e"/><rect x="29" y="9" width="11" height="5" rx="1" fill="#204b7f"/><path d="M27 6v65" stroke="#fff" stroke-opacity=".7"/>`,
 printer: `${frame(10,28,60,30,6)}<path d="M24 8h32v27H24z" fill="#f9fbff" stroke="#b4c4d7"/><path d="M29 16h22m-22 6h16" stroke="#b4c4d7" stroke-width="2"/><rect x="17" y="44" width="46" height="10" rx="2" fill="${dark}"/><path d="M24 49h32v23H24z" fill="#f9fbff" stroke="#b4c4d7"/><path d="M29 56h22m-22 6h17" stroke="#b4c4d7" stroke-width="2"/><circle cx="61" cy="36" r="2" fill="#3b82f6"/>`,
 headphones: `<path d="M15 42V31a25 25 0 0 1 50 0v11" stroke="#8097b4" stroke-width="9"/><path d="M15 31a25 25 0 0 1 50 0" stroke="#d8e4f1" stroke-width="5"/>${frame(9,35,17,30,7)}${frame(54,35,17,30,7)}<rect x="18" y="38" width="9" height="25" rx="4" fill="${dark}"/><rect x="53" y="38" width="9" height="25" rx="4" fill="${dark}"/>`,
 watch: `<rect x="29" y="1" width="22" height="78" rx="8" fill="#7189aa"/><path d="M33 7h14m-14 5h14m-14 55h14m-14 5h14" stroke="#9fb5d0"/>${frame(20,20,40,41,11)}<rect x="24" y="24" width="32" height="33" rx="8" fill="${dark}"/><circle cx="40" cy="40" r="11" stroke="#4eacff" stroke-width="3"/><path d="M40 32v9l6 4" stroke="#e5f4ff" stroke-width="2" stroke-linecap="round"/><rect x="60" y="34" width="3" height="9" rx="1.5" fill="#93a9c4"/>`,
 console: `<path d="M16 23q24-10 48 0l9 30q3 13-7 12l-12-9H26l-12 9q-10 1-7-12z" fill="${metal}" stroke="#94a9c3"/><path d="M23 31v16m-8-8h16" stroke="#526b8d" stroke-width="5" stroke-linecap="round"/><circle cx="56" cy="34" r="3" fill="#60a5fa"/><circle cx="64" cy="41" r="3" fill="#7e91b1"/><circle cx="49" cy="41" r="3" fill="#7e91b1"/><circle cx="56" cy="48" r="3" fill="#60a5fa"/><circle cx="33" cy="50" r="5" fill="#526b8d"/><circle cx="45" cy="50" r="5" fill="#526b8d"/>`,
 camera: `<path d="m26 20 5-8h18l5 8h13a7 7 0 0 1 7 7v31a7 7 0 0 1-7 7H13a7 7 0 0 1-7-7V27a7 7 0 0 1 7-7z" fill="${dark}" stroke="#8097b4"/><circle cx="40" cy="42" r="19" fill="${metal}"/><circle cx="40" cy="42" r="14" fill="#172941"/><circle cx="40" cy="42" r="10" fill="${glass}"/><circle cx="37" cy="38" r="3" fill="#bee9ff" opacity=".7"/><rect x="56" y="25" width="11" height="6" rx="2" fill="#b8d1ed"/>`,
 dishwasher: `${frame(15,5,50,69,5)}<path d="M16 22h48" stroke="#9aadc6"/><rect x="22" y="12" width="17" height="4" rx="1" fill="#19385f"/><circle cx="56" cy="14" r="3" fill="#f7faff" stroke="#9aadc6"/><path d="M23 29h34" stroke="#879db9" stroke-width="3" stroke-linecap="round"/><path d="M20 67h40" stroke="#b1c1d5"/>`,
 microwave: `${frame(4,17,72,47,6)}<rect x="10" y="23" width="48" height="33" rx="3" fill="${dark}"/>${screen(14,27,40,25,2)}<rect x="61" y="25" width="9" height="7" rx="1" fill="#234c7a"/><circle cx="65" cy="45" r="5" fill="#eef4fc" stroke="#9aadc6"/>`,
 vacuum: `<ellipse cx="40" cy="47" rx="31" ry="23" fill="${dark}"/><ellipse cx="40" cy="40" rx="31" ry="24" fill="${metal}" stroke="#94a9c3"/><ellipse cx="40" cy="40" rx="23" ry="17" fill="#d9e4f0" stroke="#9aadc6"/><ellipse cx="40" cy="34" rx="8" ry="6" fill="#8aabcf"/><ellipse cx="40" cy="32" rx="8" ry="5" fill="${glass}"/><path d="M34 52h12" stroke="#6584aa" stroke-width="2" stroke-linecap="round"/>`,
 box: `<path d="m10 25 30-14 30 14-30 14z" fill="#d7e8fc" stroke="#91afd5"/><path d="M10 25v30l30 14V39z" fill="#95b8e3" stroke="#7298c8"/><path d="M70 25v30L40 69V39z" fill="#5987c1" stroke="#7298c8"/><path d="m25 18 30 14v12l-8 4V36L18 22" fill="#edf5ff" opacity=".6"/>`,
}))
const markup = computed(() => art.value[props.name] ?? art.value.box)
</script>
<template>
 <svg class="device-art block h-full w-full" viewBox="0 0 80 80" fill="none" aria-hidden="true" focusable="false">
  <defs>
   <linearGradient :id="`${id}-metal`" x1="10" y1="5" x2="70" y2="75" gradientUnits="userSpaceOnUse"><stop stop-color="#f8fbff"/><stop offset=".45" stop-color="#d0deee"/><stop offset="1" stop-color="#8ba3c2"/></linearGradient>
   <linearGradient :id="`${id}-glass`" x1="15" y1="10" x2="65" y2="65" gradientUnits="userSpaceOnUse"><stop stop-color="#73dcff"/><stop offset=".5" stop-color="#377cea"/><stop offset="1" stop-color="#183b85"/></linearGradient>
   <linearGradient :id="`${id}-dark`" x1="15" y1="10" x2="60" y2="70" gradientUnits="userSpaceOnUse"><stop stop-color="#46617f"/><stop offset="1" stop-color="#17263d"/></linearGradient>
  </defs>
  <g v-html="markup"></g>
 </svg>
</template>
