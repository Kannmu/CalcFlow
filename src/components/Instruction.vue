<script setup>
import { ref } from 'vue'
import LatexRenderer from './LatexRenderer.vue'
const isOpen = ref(false)

const togglePanel = () => {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <div>
    <button class="instruction-button" @click="togglePanel">
      <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
    </button>
    <div class="instruction-panel" :class="{ 'is-open': isOpen }">
      <div class="panel-header">
        <h3 class="panel-title">Instructions</h3>
        <button class="close-button" @click="togglePanel">
          <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="panel-content">
        <p class="panel-description">Supported Operators:</p>
        <ul class="operator-list">
          <li>Addition: <code>+</code></li>
          <li>Subtraction: <code>-</code></li>
          <li>Multiplication: <code>*</code></li>
          <li>Division: <code>/</code></li>
          <li><LatexRenderer latex="x^y" displayMode="false"></LatexRenderer> <code>pow(x,y)</code></li>
          <li><LatexRenderer latex="\sin(x)" displayMode="false"></LatexRenderer> <code>sin(x)</code></li>
          <li><LatexRenderer latex="\cos(x)" displayMode="false"></LatexRenderer> <code>cos(x)</code></li>
          <li><LatexRenderer latex="\tan(x)" displayMode="false"></LatexRenderer> <code>tan(x)</code></li>
          <li><LatexRenderer latex="\sqrt{x}" displayMode="false"></LatexRenderer> <code>sqrt(x)</code></li>
          <li><LatexRenderer latex="\log_{y}(x)" displayMode="false"></LatexRenderer> <code>log(x,y)</code></li>
          <li><LatexRenderer latex="\ln(x)" displayMode="false"></LatexRenderer> <code>ln(x)</code></li>
        </ul>
      </div>
    </div>
    <div v-if="isOpen" class="overlay" @click="togglePanel"></div>
  </div>
</template>

<style scoped>
.instruction-button {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  width: 70px;
  height: 70px;
  background: white;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1001;
  transition: all 0.2s ease;
}

.instruction-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.icon {
  width: 24px;
  height: 24px;
  color: #475569;
}

.instruction-panel {
  position: fixed;
  top: 0;
  right: 0;
  transform: translateX(100%);
  width: 320px;
  height: 100%;
  background: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  z-index: 1002;
  display: flex;
  flex-direction: column;
}

.instruction-panel.is-open {
  transform: translateX(0);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.panel-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  margin: -0.5rem; /* Enlarge clickable area */
}

.panel-content {
  padding: 1.5rem;
  overflow-y: auto;
  flex-grow: 1;
}

.panel-description {
  font-size: 1rem;
  color: #64748b;
  margin: 0 0 1rem 0;
}

.operator-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.operator-list li {
  font-size: 1rem;
  color: #475569;
  margin-bottom: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0;
}

.operator-list code {
  background: #f1f5f9;
  color: #213b1e;
  padding: 0.25rem 0.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.2);
  z-index: 1000;
}
</style>
