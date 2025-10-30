<script setup>
import Node from './Node.vue'
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const nodes = ref([{ id: 1, header: "Node1" }])
let nextNodeId = 2

const addButtonRef = ref(null)
const nodeContainerRef = ref(null)

function updateButtonHeight() {
  if (!addButtonRef.value) return
  if (nodes.value.length === 0) {
    addButtonRef.value.style.height = ''
    return
  }
  const h = nodeContainerRef.value ? nodeContainerRef.value.offsetHeight : 0
  addButtonRef.value.style.height = `${h}px`
}

function addNode() {
  nodes.value.push({ id: nextNodeId++, header: `Node${nextNodeId - 1}` })
  nextTick(() => updateButtonHeight())
}

function deleteNode(id) {
  nodes.value = nodes.value.filter(node => node.id !== id)
  nextTick(() => updateButtonHeight())
}

let ro = null

onMounted(() => {
  nextTick(() => {
    updateButtonHeight()
    if (nodeContainerRef.value) {
      ro = new ResizeObserver(() => {
        updateButtonHeight()
      })
      ro.observe(nodeContainerRef.value)
    }
  })
})

onUnmounted(() => {
  if (ro && nodeContainerRef.value) {
    ro.unobserve(nodeContainerRef.value)
    ro.disconnect()
    ro = null
  }
})
</script>

<template>
  <div class="canvas-container">
    <button ref="addButtonRef" class="add-node-button" @click="addNode">Add Node</button>
    <div ref="nodeContainerRef" class="node-container">
      <Node v-for="node in nodes" :key="node.id" :header="node.header" @delete="deleteNode(node.id)" />
    </div>
  </div>
</template>

<style scoped>
.canvas-container {
  display: flex;
  align-items: flex-start;
  gap: 15px;
}

.node-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
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
  align-self: stretch;
}

.add-node-button:hover {
  background-color: #f0f0f0;
}
</style>
