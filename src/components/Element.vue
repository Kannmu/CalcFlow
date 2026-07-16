<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Copy } from 'lucide-vue-next'
import { generateRandomColor } from '../utils.js'

const props = defineProps({
  header: String,
  content: [String, Number],
  isRef: Boolean,
  isResult: Boolean,
  isMissing: Boolean,
})

const emit = defineEmits(['update:content', 'update:header', 'copy'])

const editableHeader = ref(props.header || '')
const internalContent = ref(props.content)
const isEditing = ref(false)
const headerInputRef = ref(null)

watch(() => props.header, (value) => {
  if (typeof value === 'string' && value !== editableHeader.value) editableHeader.value = value
})

watch(() => props.content, (value) => {
  internalContent.value = value
})

watch(editableHeader, (value) => emit('update:header', value))

const displayContent = computed(() => {
  const value = internalContent.value
  if (isEditing.value || typeof value !== 'number' || !Number.isFinite(value)) return value
  const absolute = Math.abs(value)
  const decimalLength = String(value).split('.')[1]?.length || 0
  if (absolute >= 1e7 || (absolute > 0 && absolute < 1e-4)) {
    const [mantissa, exponent] = value.toExponential(4).split('e')
    return `${Number(mantissa)}e${exponent}`
  }
  return decimalLength > 6 ? Number(value.toFixed(6)) : value
})

const editableContent = computed({
  get: () => displayContent.value,
  set: (value) => {
    if (props.isResult || props.isRef) return
    const trimmed = String(value).trim()
    const numeric = Number(trimmed)
    const normalized = trimmed === '' ? '' : Number.isNaN(numeric) ? trimmed : numeric
    internalContent.value = normalized
    emit('update:content', normalized)
  },
})

const elementAccent = computed(() => generateRandomColor(`${editableHeader.value}:${internalContent.value}`, 38, 48))

async function copyToClipboard() {
  const value = String(internalContent.value ?? '')
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const textArea = document.createElement('textarea')
    textArea.value = value
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    textArea.remove()
  }
  emit('copy', value)
}

function selectHeader() {
  nextTick(() => headerInputRef.value?.select())
}
</script>

<template>
  <div class="element" :class="{ missing: isMissing, result: isResult, reference: isRef }" :style="{ '--element-accent': elementAccent }" :title="isMissing ? `Missing node: ${header}` : undefined">
    <div class="element-header">
      <input
        v-if="isResult"
        ref="headerInputRef"
        v-model="editableHeader"
        class="element-header-input"
        aria-label="Node name"
        maxlength="256"
        @focus="selectHeader"
      />
      <span v-else class="element-header-display">{{ editableHeader }}</span>
    </div>
    <span class="element-divider"></span>
    <div class="element-content">
      <button
        v-if="isResult"
        type="button"
        class="element-content-input copy-result"
        title="Copy result"
        @click="copyToClipboard"
      >
        <span>{{ displayContent }}</span>
        <Copy :size="12" class="copy-icon" />
      </button>
      <span v-else-if="isRef" class="element-content-input">{{ displayContent }}</span>
      <input
        v-else
        v-model="editableContent"
        class="element-value-input"
        aria-label="Constant value"
        inputmode="decimal"
        @focus="isEditing = true"
        @blur="isEditing = false"
      />
    </div>
  </div>
</template>

<style scoped>
.element {
  --element-accent: var(--color-accent);
  min-width: 64px;
  max-width: min(240px, 54vw);
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  overflow: hidden;
  background: var(--color-white);
  border: 1px solid var(--color-mist);
  border-left: 2px solid var(--element-accent);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  vertical-align: middle;
  transition: border-color 140ms ease, transform 140ms ease, box-shadow 140ms ease;
}
.element:hover { transform: translateY(-1px); box-shadow: var(--shadow-md); }
.element.result { background: var(--color-ink); border-color: var(--color-ink); border-left-color: var(--element-accent); color: var(--color-white); }
.element.missing { background: var(--color-error-bg); border-color: rgba(185, 71, 61, 0.5); border-style: dashed; }

.element-header, .element-content { min-width: 0; display: flex; justify-content: center; }
.element-header-input, .element-header-display, .element-content-input, .element-value-input {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  padding: 5px 9px;
  background: transparent;
  border: 0;
  border-radius: 0;
  color: var(--color-ink-light);
  font-family: var(--font-mono);
  font-size: 0.67rem;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.element-header-input { width: clamp(72px, 12vw, 150px); color: var(--color-white); font-weight: 650; }
.element-header-input:focus { background: rgba(255,255,255,0.08); outline: none; }
.element-header-display { display: block; color: var(--color-slate); }
.element.missing .element-header-display { color: var(--color-error); }
.element-divider { height: 1px; margin: 0 7px; background: var(--color-mist); }
.element.result .element-divider { background: rgba(255,255,255,0.14); }
.element-content-input, .element-value-input { width: 86px; padding-top: 6px; padding-bottom: 7px; color: var(--color-ink); font-size: 0.76rem; font-weight: 650; }
.element.result { min-width: 152px; }
.element.result .element-content-input { width: 100%; }
.element-value-input:focus { background: var(--color-paper); outline: none; }
.copy-result { display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--color-white); cursor: copy; }
.copy-result:hover { background: rgba(255,255,255,0.08); }
.copy-icon { flex-shrink: 0; opacity: 0.45; }
.copy-result:hover .copy-icon { opacity: 1; }
</style>
