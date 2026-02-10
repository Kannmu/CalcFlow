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
  gap: 15px;
}

.canvas-gap-large {
  gap: 24px;
}

.node-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.add-node-button {
  background-color: #ffffff;
  color: #000000;
  border: 3px solid #000000;
  border-radius: 8px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  align-self: flex-start;
  position: sticky;
  top: 15px;
  height: 50px;
}

.add-node-button:hover {
  background-color: #f0f0f0;
}


.quick-start {
  background: #ffffff;
  border: 3px solid #000000;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

.quick-start-title {
  font-size: 16px;
  font-weight: bold;
  color: #000000;
  margin: 0 0 6px 0;
}

.quick-start-list {
  list-style: disc;
  padding-left: 16px;
  margin: 0;
  color: #000000;
}

.quick-start-list li {
  font-size: 14px;
  margin: 4px 0;
}

.quick-start-list code {
  background: #f1f5f9;
  color: #213b1e;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
}

.node-container :deep(.node.dragging) {
  opacity: 0.4;
  transform: scale(0.98);
}

.node-container :deep(.node.drag-over) {
  position: relative;
}

.node-container :deep(.node.drag-over::after) {
  content: '';
  position: absolute;
  top: -8px;
  left: 0;
  right: 0;
  height: 4px;
  background: #3b82f6;
  border-radius: 2px;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
}
</style>
