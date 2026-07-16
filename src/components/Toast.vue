<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Check, Info, TriangleAlert, X } from 'lucide-vue-next'

const props = defineProps({
  message: String,
  type: { type: String, default: 'info' },
  duration: { type: Number, default: 2800 },
})

const emit = defineEmits(['close'])
const isVisible = ref(true)
let closeTimer = null
let removeTimer = null

const icon = computed(() => {
  if (props.type === 'success') return Check
  if (props.type === 'error') return TriangleAlert
  return Info
})

function close() {
  if (!isVisible.value) return
  isVisible.value = false
  window.clearTimeout(closeTimer)
  removeTimer = window.setTimeout(() => emit('close'), 180)
}

onMounted(() => {
  closeTimer = window.setTimeout(close, Math.max(800, props.duration))
})

onUnmounted(() => {
  window.clearTimeout(closeTimer)
  window.clearTimeout(removeTimer)
})
</script>

<template>
  <Transition name="toast">
    <div v-if="isVisible" class="toast" :class="[`toast--${type}`, `toast-${type}`]" role="status">
      <span class="toast-icon"><component :is="icon" :size="15" /></span>
      <span class="toast-message">{{ message }}</span>
      <button type="button" class="toast-close" aria-label="Dismiss notification" @click="close"><X :size="14" /></button>
      <span class="toast-progress" :style="{ animationDuration: `${duration}ms` }"></span>
    </div>
  </Transition>
</template>

<style scoped>
.toast { position: relative; width: min(360px, calc(100vw - 32px)); min-height: 48px; display: grid; grid-template-columns: 28px 1fr 28px; align-items: center; gap: var(--space-2); overflow: hidden; padding: 8px 9px 8px 11px; background: rgba(251,252,250,0.96); border: 1px solid var(--color-mist); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); backdrop-filter: blur(14px); }
.toast-icon { width: 26px; height: 26px; display: grid; place-items: center; border-radius: 50%; background: var(--color-accent-glow); color: var(--color-accent); }
.toast--success .toast-icon { background: var(--color-success-bg); color: var(--color-success); }
.toast--error .toast-icon { background: var(--color-error-bg); color: var(--color-error); }
.toast-message { color: var(--color-ink-light); font-size: 0.76rem; font-weight: 600; }
.toast-close { width: 28px; height: 28px; display: grid; place-items: center; background: transparent; border-radius: var(--radius-sm); color: var(--color-silver); cursor: pointer; }
.toast-close:hover { background: var(--color-paper); color: var(--color-ink); }
.toast-progress { position: absolute; bottom: 0; left: 0; height: 2px; background: var(--color-accent); animation: toastProgress linear forwards; }
.toast--success .toast-progress { background: var(--color-success); }
.toast--error .toast-progress { background: var(--color-error); }
@keyframes toastProgress { from { width: 100%; } to { width: 0; } }
.toast-enter-active { animation: toastIn 220ms ease-out; }
.toast-leave-active { animation: toastOut 180ms ease-in; }
@keyframes toastIn { from { opacity: 0; transform: translateY(-8px); } }
@keyframes toastOut { to { opacity: 0; transform: translateX(10px); } }
@media (max-width: 620px) { .toast { width: 100%; } }
</style>
