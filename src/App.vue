<script setup>
import { ref } from 'vue'
import Canvas from './components/Canvas.vue'
import Instruction from './components/Instruction.vue'
const instructionRef = ref(null)
</script>

<template>
  <div class="app-container">
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

          <a href="#" class="nav-link" @click.prevent="instructionRef?.togglePanel()">
            <svg class="nav-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Instructions
          </a>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <Canvas />
    </main>

    <footer class="app-footer">
      <div class="footer-content">
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
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.app-header {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  padding: 2rem 0;
  text-align: center;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.app-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.app-logo {
  width: 100px;
  height: auto;
}

.app-title {
  font-size: 4.5rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.025em;
  background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-subtitle {
  font-size: 1.125rem;
  color: #64748b;
  margin: 0 0 1.5rem 0;
  font-weight: 400;
}

.app-nav {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 1rem;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 0.75rem;
  color: #475569;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.nav-link:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(148, 163, 184, 0.8);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.nav-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.app-main {
  flex: 1;
  padding: 3rem 2rem;
  display: flex;
  justify-content: center;
}

.app-footer {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  padding: 2rem 0;
  text-align: center;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.footer-text {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 0.5rem 0;
}

.footer-description {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0;
}

.footer-link {
  color: #475569;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.footer-link:hover {
  color: #1e293b;
}

@media (max-width: 768px) {
  .app-title {
    font-size: 2.25rem;
  }
  
  .app-subtitle {
    font-size: 1rem;
  }
  
  .header-content,
  .footer-content {
    padding: 0 1rem;
  }
  
  .app-main {
    padding: 2rem 1rem;
  }
}
</style>
