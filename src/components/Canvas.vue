<script setup>
import Node from './Node.vue'
import { ref } from 'vue'

const nodes = ref([{ id: 1, header: "Node1" }])
let nextNodeId = 2

function addNode() {
  nodes.value.push({ id: nextNodeId++, header: `Node${nextNodeId - 1}` })
}

function deleteNode(id) {
  nodes.value = nodes.value.filter(node => node.id !== id)
}
</script>

<template>
  <div class="canvas-container">
    <button class="add-node-button" @click="addNode">Add Node</button>
    <div class="node-container">
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
  flex: 1;
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
  min-height: fit-content;
}

.add-node-button:hover {
  background-color: #f0f0f0;
}
</style>
