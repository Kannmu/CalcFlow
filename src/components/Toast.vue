<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  message: String,
  type: {
    type: String,
    default: 'info', // 'success', 'error', 'info'
  },
  duration: {
    type: Number,
    default: 3000,
  },
})

const emit = defineEmits(['close'])

const isVisible = ref(true)
const progress = ref(100)
let progressInterval = null
let closeTimeout = null

const icon = computed(() => {
  switch (props.type) {
    case 'success': return '✓'
    case 'error': return '✕'
    case 'info': return 'ℹ'
    default: return 'ℹ'
  }
})

onMounted(() => {
  // Start progress animation
  const step = 100 / (props.duration / 16) // 60fps
  progressInterval = setInterval(() => {
    progress.value -= step
    if (progress.value <= 0) {
      progress.value = 0
      clearInterval(progressInterval)
    }
  }, 16)

  // Auto close
  closeTimeout = setTimeout(() => {
    close()
  }, props.duration)
})

onUnmounted(() => {
  if (progressInterval) clearInterval(progressInterval)
  if (closeTimeout) clearTimeout(closeTimeout)
})

function close() {
  isVisible.value = false
  setTimeout(() => emit('close'), 200) // Wait for exit animation
}
</script>

<template>
  <Transition name="toast">
    <div
      v-if="isVisible"
      class="toast"
      :class="`toast--${type}`"
      @click="close"
    >
      <span class="toast__icon">{{ icon }}</span>
      <span class="toast__message">{{ message }}</span>
      <div class="toast__progress" :style="{ width: `${progress}%` }"></div>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-white);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--color-mist);
  min-width: 200px;
  max-width: 320px;
  cursor: pointer;
  overflow: hidden;
}

.toast--success {
  border-left: 3px solid var(--color-success);
}

.toast--error {
  border-left: 3px solid var(--color-error);
}

.toast--info {
  border-left: 3px solid var(--color-accent);
}

.toast__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 50%;
  flex-shrink: 0;
}

.toast--success .toast__icon {
  background: var(--color-success-bg);
  color: var(--color-success);
}

.toast--error .toast__icon {
  background: var(--color-error-bg);
  color: var(--color-error);
}

.toast--info .toast__icon {
  background: var(--color-accent-glow);
  color: var(--color-accent);
}

.toast__message {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-ink);
  flex: 1;
}

.toast__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: currentColor;
  opacity: 0.3;
  transition: width 16ms linear;
}

.toast--success .toast__progress {
  background: var(--color-success);
}

.toast--error .toast__progress {
  background: var(--color-error);
}

.toast--info .toast__progress {
  background: var(--color-accent);
}

/* Transition animations */
.toast-enter-active {
  animation: toastSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-leave-active {
  animation: toastSlideOut 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes toastSlideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes toastSlideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

@media (max-width: 640px) {
  .toast {
    min-width: auto;
    max-width: calc(100vw - var(--space-8));
  }
}
</style>
