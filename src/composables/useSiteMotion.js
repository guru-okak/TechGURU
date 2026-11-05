import { onMounted, onBeforeUnmount } from 'vue'

// One-time viewport reveals. Content stays visible when motion or JS is disabled.
export function useSiteMotion() {
  let observer, changes, frame, preference
  const observed = new WeakSet()
  const active = new Set()
  const selector = 'main section, main .master-page-intro, main .client-welcome, main .card-surface, main .admin-story, main .catalog-service-card'
  const ease = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
  function cancelAnimations() { active.forEach(a => a.cancel()); active.clear() }
  function scan() {
    frame = null
    document.querySelectorAll(selector).forEach(el => {
      if (observed.has(el) || el.closest('[role="dialog"]')) return
      // Don't animate nested blocks twice, or move a focused form.
      if (el.parentElement?.closest(selector) || el.querySelector('form') || el.matches('form')) return
      observed.add(el)
      observer.observe(el)
    })
  }
  function scheduleScan() { if (!frame) frame = requestAnimationFrame(scan) }
  function onToggle(event) {
    const el = event.target
    if (preference.matches || !el.matches?.('.faq-list details[open]')) return
    const content = el.querySelector('p')
    if (content) play(content, [{opacity:0,transform:'translateY(-4px)'},{opacity:1,transform:'none'}], 220)
  }
  function play(el, frames, duration, delay = 0) {
    if (!el.animate) return
    const animation = el.animate(frames, {duration, delay, easing:ease})
    active.add(animation)
    animation.finished.then(() => active.delete(animation), () => active.delete(animation))
  }
  onMounted(() => {
    preference = matchMedia('(prefers-reduced-motion: reduce)')
    if (!('IntersectionObserver' in window)) return
    observer = new IntersectionObserver(entries => {
      let index = 0
      entries.forEach(({isIntersecting, target}) => {
        if (!isIntersecting) return
        observer.unobserve(target)
        if (preference.matches || target.contains(document.activeElement)) return
        const hero = target.matches('.master-page-intro,.client-welcome')
        play(target, [{opacity:0,transform:`translateY(${hero?8:12}px)`},{opacity:1,transform:'none'}], hero?420:360, Math.min(index++ * 35, 105))
      })
    }, {threshold:0, rootMargin:'0px 0px -24px 0px'})
    changes = new MutationObserver(scheduleScan)
    changes.observe(document.getElementById('app'), {childList:true,subtree:true})
    preference.addEventListener('change', cancelAnimations)
    document.addEventListener('toggle',onToggle,true)
    scan()
  })
  onBeforeUnmount(() => {
    observer?.disconnect(); changes?.disconnect(); cancelAnimationFrame(frame)
    preference?.removeEventListener('change',cancelAnimations)
    document.removeEventListener('toggle',onToggle,true)
    cancelAnimations()
  })
}
