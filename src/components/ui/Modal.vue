<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import SvgIcon from './SvgIcon.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md | lg | xl
  closeOnOverlay: { type: Boolean, default: true },
  closeOnEsc: { type: Boolean, default: true },
  hideClose: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'close'])

const dialog = ref(null)
const panel = ref(null)
let previousFocus = null

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}
const sizeClass = computed(() => SIZES[props.size] ?? SIZES.md)

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onOverlay() {
  if (props.closeOnOverlay) close()
}

function onKeydown(event) {
  if (!props.modelValue) return

  if (event.key === 'Escape' && props.closeOnEsc) {
    event.stopPropagation()
    close()
    return
  }

  if (event.key !== 'Tab') return

  const focusable = panel.value?.querySelectorAll(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
  )
  if (!focusable?.length) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function lockScroll(lock) {
  document.documentElement.style.overflow = lock ? 'hidden' : ''
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      previousFocus = document.activeElement
      lockScroll(true)
      await nextTick()
      const target =
        panel.value?.querySelector('[data-autofocus]') ||
        panel.value?.querySelector('button, [href], input, select, textarea')
      target?.focus()
    } else {
      lockScroll(false)
      previousFocus?.focus?.()
      previousFocus = null
    }
  },
)

onBeforeUnmount(() => {
  lockScroll(false)
  previousFocus?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        ref="dialog"
        class="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? 'modal-title' : undefined"
        :aria-describedby="description ? 'modal-description' : undefined"
        @keydown="onKeydown"
      >
        <div
          class="fixed inset-0 bg-[var(--overlay)] backdrop-blur-[2px]"
          aria-hidden="true"
          @click="onOverlay"
        ></div>

        <div
          ref="panel"
          class="modal-panel relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl sm:rounded-2xl"
          :class="sizeClass"
        >
          <header
            v-if="title || !hideClose"
            class="flex items-start gap-4 px-5"
            :class="compact ? 'pt-5' : 'border-b border-line py-4'"
          >
            <slot name="icon" />
            <div class="min-w-0 flex-1">
              <h2 v-if="title" id="modal-title" class="text-base font-bold">
                {{ title }}
              </h2>
              <p
                v-if="description"
                id="modal-description"
                class="text-muted"
                :class="compact ? 'mt-2 text-sm leading-relaxed' : 'mt-0.5 text-[12px]'"
              >
                {{ description }}
              </p>
            </div>
            <button
              v-if="!hideClose"
              type="button"
              class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-content"
              aria-label="Закрыть окно"
              @click="close"
            >
              <SvgIcon name="x" :size="18" />
            </button>
          </header>

          <div v-if="$slots.default" class="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            <slot />
          </div>

          <footer
            v-if="$slots.footer"
            class="flex flex-wrap justify-end gap-2 px-5"
            :class="compact ? 'pb-5 pt-4' : 'border-t border-line py-4'"
          >
            <slot name="footer" :close="close" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-panel {
  animation: modal-in 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .modal-panel {
    animation: none;
  }
}
</style>
