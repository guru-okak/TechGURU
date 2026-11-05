<script setup>
import SvgIcon from './SvgIcon.vue'

defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  ratio: { type: String, default: 'aspect-[16/10]' },
  icon: { type: String, default: 'image' },
  tone: { type: String, default: 'auto' },
})
</script>

<template>
  <div
    class="relative overflow-hidden"
    :class="[ratio, tone === 'dark' ? 'mp-dark' : 'mp-surface']"
  >
    <img v-if="src" :src="src" :alt="alt" class="h-full w-full object-cover" loading="lazy" />
    <template v-else>
      <span class="mp-pattern absolute inset-0" aria-hidden="true"></span>
      <span class="absolute inset-0 grid place-items-center" aria-hidden="true">
        <span
          class="grid h-14 w-14 place-items-center rounded-2xl border backdrop-blur-sm"
          :class="
            tone === 'dark'
              ? 'border-[#3b82f6]/40 bg-[#061530]/70 text-[#60a5fa]'
              : 'border-brand/20 bg-surface/70 text-brand/60'
          "
        >
          <slot><SvgIcon :name="icon" :size="26" /></slot>
        </span>
      </span>
    </template>
  </div>
</template>

<style scoped>
.mp-surface {
  background-image: linear-gradient(
    135deg,
    color-mix(in srgb, var(--blue) 16%, transparent),
    var(--surface2)
  );
}
.mp-dark {
  background-image: linear-gradient(135deg, rgba(37, 99, 235, 0.32), rgba(5, 16, 38, 0.92));
}
.mp-pattern {
  background-image: radial-gradient(
    color-mix(in srgb, var(--blue) 22%, transparent) 1px,
    transparent 1px
  );
  background-size: 16px 16px;
}
</style>
