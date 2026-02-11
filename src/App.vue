<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Canvas from './components/Canvas.vue'
import Instruction from './components/Instruction.vue'
import Toast from './components/Toast.vue'
import { nodeManager } from './utils.js'
const instructionRef = ref(null)
const canvasRef = ref(null)
const importInputRef = ref(null)
const LS_KEY = 'calcflow_workspace'

// Toast state
const toasts = ref([])
let toastId = 0

function showToast(message, type = 'info', duration = 3000) {
  const id = ++toastId
  toasts.value.push({ id, message, type, duration })
}

function removeToast(id) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// Listen for toast events from child components
function handleToastEvent(e) {
  const { message, type = 'info', duration = 2000 } = e.detail || {}
  if (message) {
    showToast(message, type, duration)
  }
}

onMounted(() => {
  window.addEventListener('calcflow:toast', handleToastEvent)
})

onUnmounted(() => {
  window.removeEventListener('calcflow:toast', handleToastEvent)
})

function getWorkspaceSnapshot() {
  const entries = Array.from(nodeManager.nodes.entries())
  return entries.map(([id, data]) => ({ header: data.header, expression: data.expression || '' }))
}

function exportWorkspace() {
  const list = getWorkspaceSnapshot()
  const blob = new Blob([JSON.stringify(list)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'calcflow_workspace.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  showToast('Workspace exported successfully', 'success')
}

function cleanWorkspace() {
  if (canvasRef.value && typeof canvasRef.value.clearAllNodes === 'function') {
    canvasRef.value.clearAllNodes()
    showToast('Workspace cleared', 'info')
  }
}

function onImportClick() {
  if (importInputRef.value) importInputRef.value.click()
}

function onImportFile(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || ''))
      if (Array.isArray(data)) {
        if (canvasRef.value && typeof canvasRef.value.loadWorkspaceFromArray === 'function') {
          canvasRef.value.loadWorkspaceFromArray(data)
        }
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(data))
        } catch (e) {}
        showToast('Workspace imported successfully', 'success')
      } else {
        showToast('Invalid workspace file', 'error')
      }
    } catch (err) {
      showToast('Failed to import workspace', 'error')
    }
    if (importInputRef.value) importInputRef.value.value = ''
  }
  reader.readAsText(file)
}
</script>

<template>
  <div class="app-container">
    <!-- Toast Container -->
    <div class="toast-container">
      <Toast
        v-for="toast in toasts"
        :key="toast.id"
        :message="toast.message"
        :type="toast.type"
        :duration="toast.duration"
        @close="removeToast(toast.id)"
      />
    </div>

    <Instruction ref="instructionRef" />
    <header class="app-header">
      <div class="header-content">
        <div class="app-brand">
          <img src="/calcflow_full.svg" class="app-logo" alt="CalcFlow logo" />
          <h1 class="app-title">CalcFlow</h1>
        </div>
        <p class="app-subtitle">Dynamic Node-Based Calculator</p>
        <nav class="app-nav">
          <a href="https://kannmu.top/" target="_blank" rel="noopener noreferrer" class="nav-link">
            <img src="/KIcon.png" alt="Kannmu's Blog" class="nav-icon" />
            Kannmu
          </a>
          <a href="https://github.com/Kannmu/CalcFlow" target="_blank" rel="noopener noreferrer" class="nav-link">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>

          <a href="#" class="nav-link" data-testid="nav-clean" @click.prevent="cleanWorkspace">
            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
            Clean
          </a>

          <a href="#" class="nav-link" data-testid="nav-export" @click.prevent="exportWorkspace">
            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 18 12 23 17 18" transform="scale(1,-1) translate(0,-27)"/><line x1="12" y1="7" x2="12" y2="17"/></svg>
            Export
          </a>

          <a href="#" class="nav-link" data-testid="nav-import" @click.prevent="onImportClick">
            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Import
          </a>
          <input ref="importInputRef" data-testid="import-file-input" type="file" accept="application/json" style="display:none" @change="onImportFile" />
          
          <a href="#" class="nav-link" data-testid="nav-instructions" @click.prevent="instructionRef?.togglePanel()">
            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Instructions
          </a>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <Canvas ref="canvasRef" />
    </main>

    <footer class="app-footer">
      <div class="footer-content">
        <div class="footer-shortcuts">
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd> Add Node
          <span class="shortcut-divider">|</span>
          <kbd>Ctrl</kbd>+<kbd>D</kbd> Duplicate
          <span class="shortcut-divider">|</span>
          <kbd>Escape</kbd> Cancel
          <span class="shortcut-divider">|</span>
          Drag to Reorder
        </div>
        <p class="footer-text">
          Created by <a href="https://kannmu.top/" target="_blank" rel="noopener noreferrer" class="footer-link">Kannmu</a>
        </p>
        <p class="footer-description">
          A sophisticated node-based calculator for complex mathematical expressions
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.toast-container {
  position: fixed;
  top: var(--space-4);
  right: var(--space-4);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  pointer-events: none;
}

.toast-container > * {
  pointer-events: auto;
}

@media (max-width: 640px) {
  .toast-container {
    top: auto;
    bottom: var(--space-4);
    left: var(--space-4);
    right: var(--space-4);
    align-items: center;
  }
}

.app-header {
  background: var(--color-white);
  border-bottom: 1px solid var(--color-mist);
  padding: var(--space-10) 0 var(--space-8);
  text-align: center;
  position: relative;
}

.app-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
  border-radius: 2px;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-6);
}

.app-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.app-logo {
  width: 80px;
  height: auto;
  opacity: 0.9;
}

.app-title {
  font-size: 3.5rem;
  font-weight: 800;
  color: var(--color-ink);
  margin: 0;
  letter-spacing: -0.03em;
  line-height: 1;
}

.app-subtitle {
  font-size: 1rem;
  color: var(--color-slate);
  margin: 0 0 var(--space-6) 0;
  font-weight: 400;
  letter-spacing: 0.02em;
}

.app-nav {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-white);
  border: 1px solid var(--color-mist);
  border-radius: var(--radius-md);
  color: var(--color-ink-light);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-sm);
}

.nav-link:hover {
  background: var(--color-paper);
  border-color: var(--color-cloud);
  color: var(--color-ink);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.nav-link:active {
  transform: translateY(0);
}

.nav-icon {
  width: 1.125rem;
  height: 1.125rem;
  opacity: 0.7;
}

.nav-link:hover .nav-icon {
  opacity: 1;
}

.app-main {
  flex: 1;
  padding: var(--space-8) var(--space-6);
  display: flex;
  justify-content: center;
}

.app-footer {
  background: var(--color-white);
  border-top: 1px solid var(--color-mist);
  padding: var(--space-6) 0;
  text-align: center;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-6);
}

.footer-text {
  font-size: 0.875rem;
  color: var(--color-slate);
  margin: 0 0 var(--space-2) 0;
}

.footer-description {
  font-size: 0.75rem;
  color: var(--color-silver);
  margin: 0;
  letter-spacing: 0.01em;
}

.footer-link {
  color: var(--color-accent);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s ease;
}

.footer-link:hover {
  color: var(--color-ink);
}

.footer-shortcuts {
  font-size: 0.75rem;
  color: var(--color-silver);
  margin-bottom: var(--space-4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.footer-shortcuts kbd {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  background: var(--color-paper);
  border: 1px solid var(--color-cloud);
  border-radius: var(--radius-sm);
  box-shadow: 0 1px 0 var(--color-white), inset 0 1px 2px rgba(15, 23, 42, 0.05);
  color: var(--color-ink-light);
  min-height: 22px;
}

.shortcut-divider {
  color: var(--color-cloud);
  margin: 0 var(--space-1);
}

@media (max-width: 768px) {
  .app-title {
    font-size: 2.25rem;
  }

  .app-subtitle {
    font-size: 0.9375rem;
  }

  .app-header {
    padding: var(--space-6) 0 var(--space-6);
  }

  .header-content,
  .footer-content {
    padding: 0 var(--space-4);
  }

  .app-main {
    padding: var(--space-6) var(--space-4);
  }
}

@media (max-width: 640px) {
  .app-nav {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }
  .nav-link {
    width: 100%;
    justify-content: center;
    padding: var(--space-3) var(--space-4);
  }

  .footer-shortcuts {
    flex-direction: column;
    gap: var(--space-2);
  }

  .shortcut-divider {
    display: none;
  }
}
</style>
