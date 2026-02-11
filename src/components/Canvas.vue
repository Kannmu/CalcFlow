<script setup>
import Node from './Node.vue'
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { nodeManager } from '../utils.js'

const LS_KEY = 'calcflow_workspace'

const nodes = ref([])
let nextNodeId = 1

function addNode() {
  nodes.value.push({ id: nextNodeId++, header: `Node${nextNodeId - 1}`, expression: '' })
}

function deleteNode(id) {
  nodes.value = nodes.value.filter(node => node.id !== id)
}

// Drag and drop state
const draggedNodeIndex = ref(-1)
const dragOverNodeIndex = ref(-1)

function onDragStart(index) {
  draggedNodeIndex.value = index
}

function onDragOver(index) {
  if (draggedNodeIndex.value === -1 || draggedNodeIndex.value === index) return
  dragOverNodeIndex.value = index
}

function onDragLeave() {
  dragOverNodeIndex.value = -1
}

function onDrop(targetIndex) {
  if (draggedNodeIndex.value === -1 || draggedNodeIndex.value === targetIndex) {
    draggedNodeIndex.value = -1
    dragOverNodeIndex.value = -1
    return
  }

  // Reorder nodes
  const draggedNode = nodes.value[draggedNodeIndex.value]
  nodes.value.splice(draggedNodeIndex.value, 1)
  nodes.value.splice(targetIndex, 0, draggedNode)

  draggedNodeIndex.value = -1
  dragOverNodeIndex.value = -1
}

function onDragEnd() {
  draggedNodeIndex.value = -1
  dragOverNodeIndex.value = -1
}

// Keyboard shortcuts
const copiedNode = ref(null)

function handleKeyDown(e) {
  // Ctrl/Cmd + Enter: Add new node
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault()
    addNode()
    return
  }

  // Ctrl/Cmd + D: Duplicate last node (if expression exists)
  if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
    e.preventDefault()
    if (nodes.value.length > 0) {
      const lastNode = nodes.value[nodes.value.length - 1]
      nodes.value.push({
        id: nextNodeId++,
        header: `Node${nextNodeId - 1}`,
        expression: lastNode.expression
      })
    }
    return
  }

  // Escape: Clear drag state
  if (e.key === 'Escape') {
    draggedNodeIndex.value = -1
    dragOverNodeIndex.value = -1
    return
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

onMounted(() => {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const data = JSON.parse(raw)
      if (Array.isArray(data) && data.length > 0) {
        nodes.value = data.map((n, idx) => ({ id: idx + 1, header: String(n.header || `Node${idx + 1}`), expression: String(n.expression || '') }))
        nextNodeId = nodes.value.length + 1
      }
    }
  } catch (e) {}
})

function getWorkspaceSnapshot() {
  const entries = Array.from(nodeManager.nodes.entries())
  const list = entries.map(([id, data]) => ({ header: data.header, expression: data.expression || '' }))
  return list
}

function saveWorkspace() {
  try {
    const list = getWorkspaceSnapshot()
    localStorage.setItem(LS_KEY, JSON.stringify(list))
  } catch (e) {}
}

watch(() => Array.from(nodeManager.nodes.entries()), () => {
  saveWorkspace()
})


function loadWorkspaceFromArray(data) {
  if (!Array.isArray(data)) return
  nodes.value = data.map((n, idx) => ({ id: idx + 1, header: String(n.header || `Node${idx + 1}`), expression: String(n.expression || '') }))
  nextNodeId = nodes.value.length + 1
  saveWorkspace()
}

function clearAllNodes() {
  nodes.value = []
  nextNodeId = 1
  localStorage.setItem(LS_KEY, JSON.stringify([]))
}

defineExpose({ loadWorkspaceFromArray, clearAllNodes })
</script>

<template>
  <div class="canvas-container" data-testid="canvas" :class="{ 'canvas-gap-large': nodes.length >= 3 }">
    <button class="add-node-button" data-testid="add-node" @click="addNode">Add Node</button>
    <div class="node-container" data-testid="node-container">
      <div class="quick-start" v-if="nodes.length <= 2">
        <h3 class="quick-start-title">Quick Start</h3>
        <ul class="quick-start-list">
          <li>Add a node and enter a math expression (e.g., <code>2 + 3 * 4</code>)</li>
          <li>Click the header of the result to rename this node (e.g., from <code>Node1</code> to <code>R</code>)</li>
          <li>Reference other nodes by their header (e.g., <code>R / 5</code>)</li>
          <li>Click the Instruction button for all available operators and functions</li>
        </ul>
      </div>
      <Node v-for="(node, index) in nodes" :key="node.id" :header="node.header" :initialExpression="node.expression" @delete="deleteNode(node.id)" :draggable="true" :class="{
        'dragging': draggedNodeIndex === index,
        'drag-over': dragOverNodeIndex === index
      }" @dragstart="onDragStart(index)" @dragover.prevent="onDragOver(index)" @dragleave="onDragLeave" @drop.prevent="onDrop(index)" @dragend="onDragEnd" />
    </div>
  </div>
</template>

<style scoped>
.canvas-container {
  display: flex;
  align-items: flex-start;
  gap: var(--space-6);
  width: 100%;
  max-width: 800px;
}

.canvas-gap-large {
  gap: var(--space-8);
}

.node-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  flex: 1;
  min-width: 0;
}

.add-node-button {
  background-color: var(--color-white);
  color: var(--color-ink);
  border: 1px solid var(--color-mist);
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  align-self: flex-start;
  position: sticky;
  top: var(--space-4);
  height: auto;
  min-height: 44px;
  box-shadow: var(--shadow-sm);
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  flex-shrink: 0;
}

.add-node-button:hover {
  background-color: var(--color-paper);
  border-color: var(--color-cloud);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.add-node-button:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

.quick-start {
  background: var(--color-white);
  border: 1px solid var(--color-mist);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5);
  margin-bottom: var(--space-3);
  box-shadow: var(--shadow-sm);
  width: 100%;
  max-width: 600px;
  position: relative;
}

.quick-start-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink);
  margin: 0 0 var(--space-3) 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.quick-start-title::before {
  content: '💡';
  font-size: 15px;
}

.quick-start-list {
  list-style: none;
  padding-left: 0;
  margin: 0;
  color: var(--color-slate);
}

.quick-start-list li {
  font-size: 13px;
  margin: var(--space-2) 0;
  padding-left: var(--space-5);
  position: relative;
  line-height: 1.5;
}

.quick-start-list li::before {
  content: '•';
  position: absolute;
  left: var(--space-2);
  color: var(--color-accent);
  font-weight: bold;
}

.quick-start-list code {
  background: var(--color-paper);
  color: var(--color-ink);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  font-size: 12px;
  border: 1px solid var(--color-mist);
  font-family: var(--font-mono);
}

.node-container :deep(.node.dragging) {
  opacity: 0.6;
  transform: scale(0.96) rotate(1deg);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2);
  cursor: grabbing;
  z-index: 100;
}

.node-container :deep(.node.drag-over) {
  position: relative;
}

.node-container :deep(.node.drag-over::before) {
  content: '';
  position: absolute;
  top: -10px;
  left: var(--space-5);
  right: var(--space-5);
  height: 3px;
  background: linear-gradient(90deg, var(--color-accent), var(--color-accent-light), var(--color-accent));
  border-radius: 2px;
  box-shadow: 0 0 12px var(--color-accent-glow);
  animation: dropIndicator 1s ease-in-out infinite;
}

@keyframes dropIndicator {
  0%, 100% { opacity: 0.7; transform: scaleX(0.95); }
  50% { opacity: 1; transform: scaleX(1); }
}

@media (max-width: 768px) {
  .canvas-container {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-4);
  }

  .add-node-button {
    position: relative;
    top: 0;
    width: 100%;
    justify-content: center;
  }

  .quick-start {
    padding: var(--space-3) var(--space-4);
  }
}
</style>
