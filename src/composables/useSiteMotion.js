import {onMounted,onBeforeUnmount} from 'vue'

// Observe individual cards, including landing sections outside <main>.
export function useSiteMotion(){
 let reveal,images,changes,frame,preference
 const seen=new WeakSet(),seenImages=new WeakSet(),pending=new Set(),animations=new Set()
 const selector='.guest-section .section-heading,.guest-section .service-card,.guest-section .channel-card,.guest-section .benefit-card,.guest-section .steps-grid>li,.guest-section .point-card,.guest-section .contact-map,.equipment-strip,.guest-final,.final-cta,.faq-list details,.client-welcome,.master-page-intro,main .card-surface,main .client-metric,main .client-service-photo,main .client-section-head,main .card,main .cabinet-support'
 function show(el){el.classList.remove('scroll-reveal-pending');pending.delete(el)}
 function stop(){pending.forEach(show);animations.forEach(a=>a.cancel());animations.clear()}
 function warm(img){
  images?.unobserve(img)
  const finish=()=>{img.classList.remove('image-loading');img.classList.add('image-ready')}
  if(img.complete){finish();return}
  img.classList.add('image-loading');img.addEventListener('load',finish,{once:true});img.addEventListener('error',finish,{once:true});img.loading='eager'
 }
 function scan(){frame=null
  document.querySelectorAll('img').forEach(img=>{if(seenImages.has(img))return;seenImages.add(img);if(images)images.observe(img)})
  if(!reveal||preference.matches)return
  document.querySelectorAll(selector).forEach(el=>{
   if(seen.has(el)||el.closest('[role="dialog"],form')||el.parentElement?.closest(selector)||el.querySelector('form'))return
   seen.add(el)
   // Never hide content already in view or above a restored scroll position.
   if(el.getBoundingClientRect().top>innerHeight){el.classList.add('scroll-reveal-pending');pending.add(el)}
   reveal.observe(el)
  })
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(scan)}
 function focus(event){let node=event.target;while(node){if(pending.has(node))show(node);node=node.parentElement}}
 onMounted(()=>{
  preference=matchMedia('(prefers-reduced-motion: reduce)')
  if('IntersectionObserver' in window){
   images=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)warm(e.target)}),{rootMargin:'850px 0px'})
   reveal=new IntersectionObserver(entries=>{let index=0;for(const {target,isIntersecting} of entries){if(!isIntersecting)continue;reveal.unobserve(target);const wasPending=pending.has(target);show(target);if(!wasPending||preference.matches||target.contains(document.activeElement))continue;const animation=target.animate([{opacity:0,transform:'translateY(20px)'},{opacity:1,transform:'translateY(0)'}],{duration:520,delay:Math.min(index++*55,165),easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'});animations.add(animation);animation.finished.then(()=>animations.delete(animation),()=>animations.delete(animation))}},{threshold:0,rootMargin:'0px 0px -20px 0px'})
  }
  changes=new MutationObserver(schedule);changes.observe(document.getElementById('app'),{childList:true,subtree:true})
  preference.addEventListener('change',stop);document.addEventListener('focusin',focus);scan()
 })
 onBeforeUnmount(()=>{reveal?.disconnect();images?.disconnect();changes?.disconnect();cancelAnimationFrame(frame);preference?.removeEventListener('change',stop);document.removeEventListener('focusin',focus);stop()})
}
