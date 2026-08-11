<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Activity, ChevronDown, GitBranch, Plus, Sparkles } from 'lucide-vue-next'
import Node from './Node.vue'
import {
  WORKSPACE_STORAGE_KEY,
  normalizeWorkspace,
  readStoredWorkspace,
  writeStoredWorkspace,
} from '../workspace.js'

const emit = defineEmits(['stats', 'toast'])

const examples = [
  {
    id: 'circle',
    name: 'Circle study',
    detail: 'One value, two derived results',
    nodes: [
      { header: 'Radius', expression: '12' },
      { header: 'Area', expression: 'pi * Radius ^ 2' },
      { header: 'Circumference', expression: '2 * pi * Radius' },
    ],
  },
  {
    id: 'growth',
    name: 'Compound growth',
    detail: 'A compact financial model',
    nodes: [
      { header: 'Principal', expression: '10000' },
      { header: 'Rate', expression: '0.0525' },
      { header: 'Years', expression: '8' },
      { header: 'Future', expression: 'Principal * (1 + Rate) ^ Years' },
    ],
  },
  {
    id: 'wave',
    name: 'Wave composition',
    detail: 'Functions flowing through nodes',
    nodes: [
      { header: 'Phase', expression: 'pi / 4' },
      { header: 'Signal', expression: 'sin(Phase) + cos(Phase)' },
      { header: 'Energy', expression: 'Signal ^ 2' },
    ],
  },
]

const initialNodes = readStoredWorkspace()
const nodes = ref(initialNodes.map((node, index) => createNodeRecord(node, index + 1)))
const canvasRef = ref(null)
const templateMenuRef = ref(null)
let nextNodeId = nodes.value.length + 1
let saveTimer = null
let focusRequestId = 0

function createNodeRecord(node = {}, id = nextNodeId) {
  return {
    id,
    header: String(node.header || `Node${id}`),
    expression: String(node.expression || ''),
    result: node.result ?? 0,
    dependencies: Array.isArray(node.dependencies) ? node.dependencies : [],
    hasError: Boolean(node.hasError),
  }
}

function focusLastNode() {
  const requestId = ++focusRequestId
  nextTick(() => {
    window.requestAnimationFrame(() => {
      if (requestId !== focusRequestId) return
      const activeElement = window.document.activeElement
      if (activeElement?.matches?.('input, textarea, [contenteditable="true"]')) return
      const inputs = canvasRef.value?.querySelectorAll('[data-testid="node-expression"]')
      inputs?.[inputs.length - 1]?.focus()
    })
  })
}

function addNode(seed = {}) {
  const id = nextNodeId++
  nodes.value.push(createNodeRecord(seed, id))
  focusLastNode()
}

function addExample(expression, header) {
  addNode({ header: header || `Node${nextNodeId}`, expression })
}

function applyExample(example) {
  const incoming = example.nodes.map((node) => createNodeRecord(node, nextNodeId++))
  nodes.value.push(...incoming)
  if (templateMenuRef.value) templateMenuRef.value.open = false
  emit('toast', { message: `${example.name} added`, type: 'success' })
  focusLastNode()
}

function deleteNode(id) {
  nodes.value = nodes.value.filter((node) => node.id !== id)
}

function duplicateNode(id) {
  const source = nodes.value.find((node) => node.id === id)
  if (!source) return
  const copyId = nextNodeId++
  nodes.value.push(createNodeRecord({
    header: `${source.header}_copy`,
    expression: source.expression,
  }, copyId))
  emit('toast', { message: `${source.header} duplicated`, type: 'success' })
  focusLastNode()
}

function updateNodeState(id, payload) {
  const node = nodes.value.find((item) => item.id === id)
  if (!node) return
  Object.assign(node, payload)
}

const draggedNodeIndex = ref(-1)
const dragOverNodeIndex = ref(-1)

function onDragStart(index, event) {
  if (!event.target?.closest?.('.drag-handle')) {
    event.preventDefault()
    return
  }
  draggedNodeIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(index) {
  if (draggedNodeIndex.value === -1 || draggedNodeIndex.value === index) return
  dragOverNodeIndex.value = index
}

function resetDragState() {
  draggedNodeIndex.value = -1
  dragOverNodeIndex.value = -1
}

function onDrop(targetIndex) {
  const sourceIndex = draggedNodeIndex.value
  if (sourceIndex === -1 || sourceIndex === targetIndex) {
    resetDragState()
    return
  }
  const [draggedNode] = nodes.value.splice(sourceIndex, 1)
  nodes.value.splice(targetIndex, 0, draggedNode)
  resetDragState()
}

function workspaceSnapshot() {
  return nodes.value.map(({ header, expression }) => ({ header, expression }))
}

function scheduleSave() {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => writeStoredWorkspace(workspaceSnapshot()), 120)
}

const dependencyCount = computed(() => nodes.value.reduce((total, node) => total + node.dependencies.length, 0))
const errorCount = computed(() => nodes.value.filter((node) => node.hasError).length)

const workspaceStats = computed(() => ({
  nodes: nodes.value.length,
  dependencies: dependencyCount.value,
  errors: errorCount.value,
}))

watch(
  () => nodes.value.map(({ header, expression }) => ({ header, expression })),
  scheduleSave,
  { deep: true },
)
watch(workspaceStats, (stats) => emit('stats', stats), { immediate: true })

function handleKeyDown(event) {
  const modifier = event.ctrlKey || event.metaKey
  if (modifier && event.key === 'Enter') {
    event.preventDefault()
    addNode()
  }
  if (modifier && event.key.toLowerCase() === 'd') {
    event.preventDefault()
    const last = nodes.value[nodes.value.length - 1]
    if (last) duplicateNode(last.id)
  }
  if (event.key === 'Escape') resetDragState()
}

function handleStorage(event) {
  if (event.key !== WORKSPACE_STORAGE_KEY || !event.newValue) return
  try {
    const incoming = normalizeWorkspace(JSON.parse(event.newValue))
    if (JSON.stringify(incoming) === JSON.stringify(workspaceSnapshot())) return
    nodes.value = incoming.map((node, index) => createNodeRecord(node, index + 1))
    nextNodeId = nodes.value.length + 1
  } catch {
    // Ignore malformed writes from another tab.
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('storage', handleStorage)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('storage', handleStorage)
  window.clearTimeout(saveTimer)
})

function loadWorkspaceFromArray(data) {
  const normalized = normalizeWorkspace(data)
  nodes.value = normalized.map((node, index) => createNodeRecord(node, index + 1))
  nextNodeId = nodes.value.length + 1
  writeStoredWorkspace(workspaceSnapshot())
}

function clearAllNodes() {
  nodes.value = []
  nextNodeId = 1
  writeStoredWorkspace([])
}

defineExpose({ addExample, clearAllNodes, loadWorkspaceFromArray, workspaceSnapshot })
</script>

<template>
  <section ref="canvasRef" class="canvas-container" data-testid="canvas">
    <header class="workspace-bar">
      <div class="workspace-title">
        <span class="workspace-kicker">Live workspace</span>
        <div class="workspace-heading-row">
          <h2>Calculation flow</h2>
          <span class="live-state"><span class="live-dot"></span>Ready</span>
        </div>
      </div>

      <div class="workspace-actions">
        <details ref="templateMenuRef" class="template-menu">
          <summary class="secondary-action" aria-label="Choose example" title="Examples">
            <Sparkles :size="16" />
            <span>Examples</span>
            <ChevronDown :size="14" class="chevron" />
          </summary>
          <div class="template-popover">
            <p class="template-label">Start from a working model</p>
            <button v-for="example in examples" :key="example.id" type="button" class="template-option" @click="applyExample(example)">
              <span>{{ example.name }}</span>
              <small>{{ example.detail }}</small>
            </button>
          </div>
        </details>
        <button class="add-node-button" data-testid="add-node" type="button" aria-label="Add node" title="Add node" @click="addNode()">
          <Plus :size="17" />
          <span>Add node</span>
        </button>
      </div>
    </header>

    <div v-if="nodes.length === 0" class="empty-workspace">
      <div class="empty-orbit" aria-hidden="true">
        <span class="orbit-node orbit-node-a"></span>
        <span class="orbit-node orbit-node-b"></span>
        <span class="orbit-node orbit-node-c"></span>
        <svg viewBox="0 0 220 150" role="presentation">
          <path d="M42 42 C 92 42, 82 108, 111 108 S 142 42, 178 42" />
          <path d="M42 42 C 65 72, 80 108, 111 108" />
        </svg>
      </div>
      <span class="empty-kicker">Nothing hidden</span>
      <h3>Build a calculation you can see.</h3>
      <p>Each node holds one idea. Reference its name downstream and CalcFlow keeps the whole system in motion.</p>
      <div class="empty-actions">
        <button type="button" class="add-node-button" @click="addNode()"><Plus :size="17" />Create first node</button>
        <button type="button" class="text-action" @click="applyExample(examples[0])">Try a linked example</button>
      </div>
    </div>

    <TransitionGroup v-else name="node-list" tag="div" class="node-container" data-testid="node-container">
      <div
        v-for="(node, index) in nodes"
        :key="node.id"
        class="node-shell"
        :class="{ dragging: draggedNodeIndex === index, 'drag-over': dragOverNodeIndex === index }"
        draggable="true"
        @dragstart="onDragStart(index, $event)"
        @dragover.prevent="onDragOver(index)"
        @dragleave="dragOverNodeIndex = -1"
        @drop.prevent="onDrop(index)"
        @dragend="resetDragState"
      >
        <div class="flow-rail" aria-hidden="true">
          <span class="flow-index">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="flow-point"></span>
        </div>
        <Node
          :node-key="node.id"
          :position="index + 1"
          :header="node.header"
          :initial-expression="node.expression"
          @delete="deleteNode(node.id)"
          @duplicate="duplicateNode(node.id)"
          @update="updateNodeState(node.id, $event)"
        />
      </div>
    </TransitionGroup>

    <footer v-if="nodes.length" class="workspace-summary" aria-live="polite">
      <span><Activity :size="14" />{{ errorCount ? `${errorCount} issue${errorCount === 1 ? '' : 's'}` : 'All nodes healthy' }}</span>
      <span><GitBranch :size="14" />{{ dependencyCount }} live {{ dependencyCount === 1 ? 'link' : 'links' }}</span>
    </footer>
  </section>
</template>

<style scoped>
.canvas-container {
  width: min(100%, 980px);
  margin: 0 auto;
}

.workspace-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-6);
  margin-bottom: var(--space-8);
}

.workspace-title { min-width: 0; }
.workspace-kicker, .empty-kicker, .template-label {
  display: block;
  margin-bottom: var(--space-2);
  color: var(--color-slate);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  line-height: 1.2;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.workspace-heading-row { display: flex; align-items: center; gap: var(--space-3); }
.workspace-heading-row h2 { font-size: clamp(1.45rem, 2.2vw, 2rem); font-weight: 560; }
.live-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-success);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  text-transform: uppercase;
}
.live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--color-success); animation: livePulse 2.4s ease-in-out infinite; }

.workspace-actions { display: flex; align-items: center; gap: var(--space-2); flex-shrink: 0; }
.add-node-button, .secondary-action, .text-action {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.add-node-button { padding: 0 var(--space-4); background: var(--color-ink); color: var(--color-white); }
.add-node-button:hover { background: var(--color-accent); transform: translateY(-1px); }
.secondary-action { padding: 0 var(--space-3); border: 1px solid var(--color-mist); background: rgba(251,252,250,0.78); color: var(--color-ink-light); list-style: none; }
.secondary-action::-webkit-details-marker { display: none; }
.secondary-action:hover { border-color: var(--color-cloud); background: var(--color-white); }
.template-menu { position: relative; }
.template-menu[open] .chevron { transform: rotate(180deg); }
.chevron { transition: transform 160ms ease; }

.template-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
  width: min(320px, calc(100vw - 32px));
  padding: var(--space-3);
  background: var(--color-white);
  border: 1px solid var(--color-mist);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}
.template-label { margin: var(--space-2); }
.template-option { width: 100%; padding: var(--space-3); border-radius: var(--radius-md); background: transparent; text-align: left; cursor: pointer; }
.template-option:hover { background: var(--color-paper); }
.template-option span { display: block; font-size: 0.86rem; font-weight: 650; }
.template-option small { display: block; margin-top: 3px; color: var(--color-slate); font-size: 0.74rem; }

.empty-workspace {
  min-height: clamp(420px, 62vh, 620px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-12) var(--space-6);
  text-align: center;
}
.empty-workspace h3 { max-width: 600px; font-size: clamp(2rem, 5vw, 4rem); font-weight: 520; line-height: 1.05; }
.empty-workspace p { max-width: 550px; margin-top: var(--space-5); color: var(--color-slate); font-size: 0.95rem; }
.empty-actions { display: flex; align-items: center; gap: var(--space-4); margin-top: var(--space-8); }
.text-action { padding: 0 var(--space-2); background: transparent; color: var(--color-accent); }
.text-action:hover { color: var(--color-ink); }

.empty-orbit { position: relative; width: 220px; height: 150px; margin-bottom: var(--space-8); }
.empty-orbit svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.empty-orbit path { fill: none; stroke: var(--color-cloud); stroke-width: 1; stroke-dasharray: 3 5; }
.orbit-node { position: absolute; z-index: 1; width: 18px; height: 18px; border-radius: 5px; background: var(--color-white); border: 1px solid var(--color-cloud); box-shadow: var(--shadow-sm); }
.orbit-node-a { left: 33px; top: 33px; border-color: var(--color-accent); }
.orbit-node-b { right: 33px; top: 33px; border-color: var(--color-copper); }
.orbit-node-c { left: 102px; bottom: 32px; background: var(--color-ink); border-color: var(--color-ink); }

.node-container { display: flex; flex-direction: column; gap: var(--space-5); padding-left: 72px; }
.node-shell { position: relative; min-width: 0; transition: opacity 160ms ease, transform 160ms ease; }
.node-shell:not(:last-child)::before { content: ''; position: absolute; left: -42px; top: 40px; bottom: -36px; width: 1px; background: var(--color-cloud); }
.flow-rail { position: absolute; left: -72px; top: 29px; width: 48px; display: flex; align-items: center; justify-content: space-between; }
.flow-index { color: var(--color-silver); font-family: var(--font-mono); font-size: 0.65rem; }
.flow-point { width: 9px; height: 9px; border-radius: 50%; border: 2px solid var(--color-paper); background: var(--color-accent); box-shadow: 0 0 0 1px var(--color-cloud); }
.dragging { opacity: 0.45; transform: scale(0.985); }
.drag-over::after { content: ''; position: absolute; z-index: 2; top: -12px; left: 0; right: 0; height: 2px; background: var(--color-accent); }

.node-list-enter-active { transition: opacity 180ms ease, transform 180ms ease; }
.node-list-enter-from { opacity: 0; transform: translateY(8px); }
.node-list-leave-active { transition: none; }

.workspace-summary { display: flex; align-items: center; justify-content: flex-end; gap: var(--space-5); padding: var(--space-5) 0 0 72px; color: var(--color-slate); font-family: var(--font-mono); font-size: 0.68rem; }
.workspace-summary span { display: inline-flex; align-items: center; gap: 6px; }

@media (max-width: 720px) {
  .workspace-bar { align-items: flex-start; margin-bottom: var(--space-6); }
  .workspace-heading-row { align-items: flex-start; flex-direction: column; gap: var(--space-2); }
  .workspace-actions span { display: none; }
  .workspace-actions .add-node-button, .secondary-action { width: 42px; padding: 0; }
  .template-popover { position: fixed; top: 72px; right: var(--space-4); }
  .empty-workspace { min-height: 62vh; padding: var(--space-8) 0; }
  .empty-workspace h3 { font-size: clamp(2rem, 12vw, 3.2rem); }
  .empty-actions { flex-direction: column; }
  .node-container { padding-left: 0; gap: var(--space-4); }
  .node-shell::before, .flow-rail { display: none; }
  .workspace-summary { padding-left: 0; justify-content: space-between; gap: var(--space-2); }
}

@media (max-width: 420px) {
  .workspace-summary { align-items: flex-start; flex-direction: column; }
  .empty-orbit { transform: scale(0.85); margin-bottom: var(--space-4); }
}
</style>
