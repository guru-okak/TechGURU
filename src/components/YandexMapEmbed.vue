<script setup>
import {ref,onMounted,onBeforeUnmount,watch} from 'vue'
const props=defineProps({points:{type:Array,default:()=>[]},zoom:{type:Number,default:12}})
const container=ref(null),failed=ref(false),busy=ref(true)
let map,disposed=false,version=0
const key=import.meta.env.VITE_YANDEX_MAPS_API_KEY
async function load(){
 if(window.ymaps?.Map)return window.ymaps
 return new Promise((resolve,reject)=>{
 let script=document.getElementById('yandex-maps-api')
 const ready=()=>window.ymaps?window.ymaps.ready(()=>resolve(window.ymaps)):reject(Error('Map unavailable'))
 if(window.ymaps){ready();return}
 if(!script){script=document.createElement('script');script.id='yandex-maps-api';script.src='https://api-maps.yandex.ru/2.1/?apikey='+encodeURIComponent(key)+'&lang=ru_RU';script.async=true;document.head.append(script)}
 script.addEventListener('load',ready,{once:true});script.addEventListener('error',reject,{once:true})
 })
}
async function update(){
 const stamp=++version;busy.value=true
 try{
  if(!key)throw Error('Map key missing')
  const ymaps=await load();if(disposed)return
  if(!map)map=new ymaps.Map(container.value,{center:[55.7558,37.6173],zoom:props.zoom,controls:['zoomControl']})
  const points=[]
  for(const p of props.points.filter(p=>p.is_active!==0)){
   let coords=Number.isFinite(p.lat)&&Number.isFinite(p.lng)?[p.lat,p.lng]:null
   if(!coords&&p.address){const result=await ymaps.geocode(p.address,{results:1});const found=result.geoObjects.get(0);if(found)coords=found.geometry.getCoordinates()}
   if(coords)points.push({p,coords})
  }
  if(disposed||stamp!==version)return
  map.geoObjects.removeAll()
  for(const {p,coords} of points){
   const marker=new ymaps.Placemark(coords,{hintContent:'',balloonContent:''},{preset:'islands#blueRepairShopIcon'})
   // User-managed point names are plain text, never balloon HTML.
   marker.events.add('click',()=>{const box=document.createElement('div');box.textContent=p.name+' — '+p.address;marker.properties.set('balloonContent',box.innerHTML);marker.balloon.open()})
   map.geoObjects.add(marker)
  }
  if(points.length>1)map.setBounds(map.geoObjects.getBounds(),{checkZoomRange:true,zoomMargin:36})
  else if(points.length)map.setCenter(points[0].coords,14)
  failed.value=!points.length
 }catch{failed.value=true}finally{if(stamp===version)busy.value=false}
}
onMounted(update);watch(()=>props.points.map(p=>p.id+':'+p.address+':'+p.is_active).join('|'),update)
onBeforeUnmount(()=>{disposed=true;version++;map?.destroy()})
</script>
<template><div class="service-map"><div ref="container" class="service-map-canvas" aria-label="Карта центров TechGURU"></div><p v-if="busy" class="map-state">Загружаем точки приёма…</p></div></template>
<style scoped>.service-map{position:relative;width:100%;height:100%;min-height:300px}.service-map-canvas{position:absolute;inset:0}.map-state{position:absolute;inset:auto 12px 12px;padding:12px;border-radius:12px;background:var(--surface);color:var(--text);box-shadow:0 4px 20px #0002;font-size:13px}.map-state a{display:block;margin-top:8px;color:var(--blue)}</style>
