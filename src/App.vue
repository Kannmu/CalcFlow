<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { CircleHelp, Download, Github, Trash2, Upload } from 'lucide-vue-next'
import Canvas from './components/Canvas.vue'
import Instruction from './components/Instruction.vue'
import Toast from './components/Toast.vue'
import { createWorkspaceDocument, normalizeWorkspace } from './workspace.js'

const instructionRef = ref(null)
const canvasRef = ref(null)
const importInputRef = ref(null)
const stats = ref({ nodes: 0, dependencies: 0, errors: 0 })
const toasts = ref([])
let toastId = 0

function showToast(message, type = 'info', duration = 2800) {
  const id = ++toastId
  toasts.value.push({ id, message, type, duration })
}

function removeToast(id) {
  const index = toasts.value.findIndex((toast) => toast.id === id)
  if (index !== -1) toasts.value.splice(index, 1)
}

function handleToastEvent(event) {
  const { message, type = 'info', duration = 2400 } = event.detail || {}
  if (message) showToast(message, type, duration)
}

function handleCanvasToast(payload) {
  if (payload?.message) showToast(payload.message, payload.type)
}

onMounted(() => window.addEventListener('calcflow:toast', handleToastEvent))
onUnmounted(() => window.removeEventListener('calcflow:toast', handleToastEvent))

function getWorkspaceSnapshot() {
  return canvasRef.value?.workspaceSnapshot?.() || []
}

function exportWorkspace() {
  const document = createWorkspaceDocument(getWorkspaceSnapshot())
  const blob = new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement('a')
  anchor.href = url
  anchor.download = 'calcflow_workspace.json'
  window.document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
  showToast(`${document.nodes.length} nodes exported`, 'success')
}

function cleanWorkspace() {
  canvasRef.value?.clearAllNodes?.()
  showToast('Workspace cleared', 'info')
}

function onImportClick() {
  importInputRef.value?.click()
}

function onImportFile(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    showToast('Workspace file is larger than 2 MB', 'error')
    event.target.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const nodes = normalizeWorkspace(JSON.parse(String(reader.result || '')))
      canvasRef.value?.loadWorkspaceFromArray?.(nodes)
      showToast(`${nodes.length} nodes imported`, 'success')
    } catch (error) {
      showToast(error instanceof RangeError ? error.message : 'Invalid CalcFlow workspace', 'error')
    } finally {
      if (importInputRef.value) importInputRef.value.value = ''
    }
  }
  reader.onerror = () => {
    showToast('Workspace file could not be read', 'error')
    if (importInputRef.value) importInputRef.value.value = ''
  }
  reader.readAsText(file)
}

function useExample({ expression, header }) {
  canvasRef.value?.addExample?.(expression, header)
  showToast('Example added to the flow', 'success')
  instructionRef.value?.closePanel?.()
}
</script>

<template>
  <div class="app-container">
    <div class="toast-container" aria-live="polite" aria-atomic="false">
      <Toast
        v-for="toast in toasts"
        :key="toast.id"
        :message="toast.message"
        :type="toast.type"
        :duration="toast.duration"
        @close="removeToast(toast.id)"
      />
    </div>

    <Instruction ref="instructionRef" @use-example="useExample" />

    <header class="app-header">
      <div class="header-content">
        <a class="app-brand" href="/" aria-label="CalcFlow home">
          <span class="brand-mark"><img src="/calcflow.svg" alt="" /></span>
          <span class="brand-copy">
            <strong>CalcFlow</strong>
            <small>Composable calculator</small>
          </span>
        </a>

        <div class="workspace-presence" aria-live="polite">
          <span class="presence-dot" :class="{ 'has-errors': stats.errors }"></span>
          <span>{{ stats.nodes }} {{ stats.nodes === 1 ? 'node' : 'nodes' }}</span>
          <span class="presence-divider"></span>
          <span>{{ stats.dependencies }} {{ stats.dependencies === 1 ? 'link' : 'links' }}</span>
        </div>

        <nav class="app-nav" aria-label="Workspace actions">
          <button type="button" class="nav-link" data-testid="nav-export" title="Export workspace" aria-label="Export workspace" @click="exportWorkspace">
            <Download :size="17" />
            <span class="nav-label">Export</span>
          </button>
          <button type="button" class="nav-link" data-testid="nav-import" title="Import workspace" aria-label="Import workspace" @click="onImportClick">
            <Upload :size="17" />
            <span class="nav-label">Import</span>
          </button>
          <input ref="importInputRef" data-testid="import-file-input" type="file" accept="application/json,.json" hidden @change="onImportFile" />
          <button type="button" class="nav-link danger-action" data-testid="nav-clean" title="Clear workspace" aria-label="Clear workspace" @click="cleanWorkspace">
            <Trash2 :size="17" />
            <span class="nav-label">Clear</span>
          </button>
          <button type="button" class="nav-link" data-testid="nav-instructions" title="Open formula guide" aria-label="Open formula guide" @click="instructionRef?.togglePanel()">
            <CircleHelp :size="18" />
            <span class="nav-label">Guide</span>
          </button>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <Canvas ref="canvasRef" @stats="stats = $event" @toast="handleCanvasToast" />
    </main>

    <footer class="app-footer">
      <div class="footer-content">
        <p>One idea per node. Every dependency visible.</p>
        <div class="footer-meta">
          <span class="shortcut"><kbd>Ctrl</kbd><span>+</span><kbd>Enter</kbd><span>Add</span></span>
          <span class="shortcut"><kbd>Ctrl</kbd><span>+</span><kbd>D</kbd><span>Duplicate</span></span>
          <a href="https://github.com/Kannmu/CalcFlow" target="_blank" rel="noopener noreferrer"><Github :size="15" />Source</a>
          <a href="https://kannmu.top/" target="_blank" rel="noopener noreferrer">Kannmu</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-container { min-height: 100vh; display: flex; flex-direction: column; }
.toast-container { position: fixed; z-index: 2000; top: 76px; right: var(--space-4); display: flex; flex-direction: column; gap: var(--space-2); pointer-events: none; }
.toast-container > * { pointer-events: auto; }

.app-header {
  position: sticky;
  z-index: 100;
  top: 0;
  background: rgba(251, 252, 250, 0.88);
  border-bottom: 1px solid rgba(207, 213, 216, 0.8);
  backdrop-filter: blur(18px) saturate(130%);
}
.header-content { min-height: 64px; max-width: 1240px; margin: 0 auto; padding: 0 var(--space-6); display: grid; grid-template-columns: minmax(180px, 1fr) auto minmax(180px, 1fr); align-items: center; gap: var(--space-6); }
.app-brand { width: fit-content; display: inline-flex; align-items: center; gap: var(--space-3); color: var(--color-ink); text-decoration: none; }
.brand-mark { width: 32px; height: 32px; display: grid; place-items: center; overflow: hidden; background: var(--color-ink); border-radius: var(--radius-md); }
.brand-mark img { width: 23px; height: 25px; object-fit: contain; filter: grayscale(1) brightness(3); }
.brand-copy strong { display: block; font-size: 0.9rem; font-weight: 720; line-height: 1.1; }
.brand-copy small { display: block; margin-top: 3px; color: var(--color-slate); font-family: var(--font-mono); font-size: 0.58rem; }

.workspace-presence { display: flex; align-items: center; gap: var(--space-2); color: var(--color-slate); font-family: var(--font-mono); font-size: 0.63rem; text-transform: uppercase; white-space: nowrap; }
.presence-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-success); }
.presence-dot.has-errors { background: var(--color-error); }
.presence-divider { width: 1px; height: 12px; background: var(--color-cloud); }

.app-nav { display: flex; align-items: center; justify-content: flex-end; gap: 3px; }
.nav-link { min-height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 var(--space-3); border-radius: var(--radius-sm); background: transparent; color: var(--color-slate); cursor: pointer; font-size: 0.72rem; font-weight: 600; transition: background 140ms ease, color 140ms ease; }
.nav-link:hover { background: var(--color-paper); color: var(--color-ink); }
.danger-action:hover { background: var(--color-error-bg); color: var(--color-error); }

.app-main { flex: 1; width: 100%; padding: clamp(2rem, 6vw, 4.75rem) clamp(1rem, 4vw, 2.5rem); }
.app-footer { border-top: 1px solid var(--color-mist); background: rgba(251,252,250,0.68); }
.footer-content { min-height: 76px; max-width: 1240px; margin: 0 auto; padding: var(--space-4) var(--space-6); display: flex; align-items: center; justify-content: space-between; gap: var(--space-6); }
.footer-content > p { color: var(--color-slate); font-size: 0.72rem; }
.footer-meta { display: flex; align-items: center; gap: var(--space-4); color: var(--color-slate); font-size: 0.68rem; }
.footer-meta a, .shortcut { display: inline-flex; align-items: center; gap: 5px; color: var(--color-slate); text-decoration: none; }
.footer-meta a:hover { color: var(--color-ink); }
kbd { min-width: 22px; height: 22px; display: inline-grid; place-items: center; padding: 0 5px; background: var(--color-white); border: 1px solid var(--color-mist); border-bottom-color: var(--color-cloud); border-radius: var(--radius-sm); color: var(--color-ink-light); font-family: var(--font-mono); font-size: 0.58rem; }

@media (max-width: 940px) {
  .header-content { grid-template-columns: 1fr auto; }
  .workspace-presence { display: none; }
  .nav-label { display: none; }
  .nav-link { width: 38px; padding: 0; }
}

@media (max-width: 620px) {
  .header-content { min-height: 58px; padding: 0 var(--space-3); gap: var(--space-2); }
  .brand-mark { width: 30px; height: 30px; }
  .brand-copy small { display: none; }
  .app-main { padding: var(--space-6) var(--space-3) var(--space-8); }
  .toast-container { top: auto; right: var(--space-3); bottom: var(--space-3); left: var(--space-3); align-items: stretch; }
  .footer-content { align-items: flex-start; flex-direction: column; padding: var(--space-5) var(--space-4); gap: var(--space-3); }
  .shortcut { display: none; }
}

@media (max-width: 360px) {
  .brand-copy { display: none; }
}
</style>
