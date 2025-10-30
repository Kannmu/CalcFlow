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
  <button class="add-node-button" @click="addNode">Add Node</button>
  <div class="node-container">
    <Node v-for="node in nodes" :key="node.id" :header="node.header" @delete="deleteNode(node.id)" />
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.node-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 10px;
  gap: 10px;
}
.add-node-button {
  background-color: #ffffff;
  color: #000000;
  border: 2px solid #000000;
  border-radius: 8px;
  padding: 5px 10px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
}
.add-node-button:hover {
  background-color: #f0f0f0;
}
</style>
