<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { ArrowUpRight, Braces, Command, X } from 'lucide-vue-next'
import LatexRenderer from './LatexRenderer.vue'

const emit = defineEmits(['use-example'])
const isOpen = ref(false)
const activeTab = ref('guide')
const closeButtonRef = ref(null)

const examples = [
  { name: 'Pythagorean distance', expression: 'sqrt(A ^ 2 + B ^ 2)', header: 'Distance' },
  { name: 'Compound growth', expression: 'Principal * (1 + Rate) ^ Years', header: 'Future' },
  { name: 'Wave composition', expression: 'sin(Phase) + cos(Phase)', header: 'Signal' },
]

const references = [
  { latex: 'x + y', syntax: 'x + y', label: 'Addition' },
  { latex: 'x - y', syntax: 'x - y', label: 'Subtraction' },
  { latex: 'x \\times y', syntax: 'x * y', label: 'Multiplication' },
  { latex: '\\frac{x}{y}', syntax: 'x / y', label: 'Division' },
  { latex: 'x^y', syntax: 'x ^ y', label: 'Exponent' },
  { latex: '\\sqrt{x}', syntax: 'sqrt(x)', label: 'Square root' },
  { latex: '\\sin(x)', syntax: 'sin(x)', label: 'Sine' },
  { latex: '\\log_y(x)', syntax: 'log(x, y)', label: 'Logarithm' },
  { latex: '\\ln(x)', syntax: 'ln(x)', label: 'Natural log' },
  { latex: '\\pi', syntax: 'pi', label: 'Constant' },
]

function openPanel() {
  isOpen.value = true
  nextTick(() => closeButtonRef.value?.focus())
}

function closePanel() {
  isOpen.value = false
}

function togglePanel() {
  if (isOpen.value) closePanel()
  else openPanel()
}

function handleKey(event) {
  if (event.key === 'Escape' && isOpen.value) closePanel()
}

watch(isOpen, (open) => {
  document.body.classList.toggle('is-panel-open', open)
  if (open) document.addEventListener('keydown', handleKey, true)
  else document.removeEventListener('keydown', handleKey, true)
})

onUnmounted(() => {
  document.body.classList.remove('is-panel-open')
  document.removeEventListener('keydown', handleKey, true)
})

defineExpose({ closePanel, openPanel, togglePanel })
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="overlay" @click="closePanel"></div>
    <aside class="instruction-panel" :class="{ 'is-open': isOpen }" :aria-hidden="!isOpen" aria-modal="true" aria-label="Formula guide" role="dialog">
      <header class="panel-header">
        <div>
          <span class="panel-kicker">Reference</span>
          <h3 class="panel-title">Formula guide</h3>
        </div>
        <button ref="closeButtonRef" type="button" class="close-button" aria-label="Close formula guide" title="Close" @click="closePanel">
          <X :size="19" />
        </button>
      </header>

      <div class="panel-tabs" role="tablist" aria-label="Guide sections">
        <button type="button" :class="{ active: activeTab === 'guide' }" role="tab" :aria-selected="activeTab === 'guide'" @click="activeTab = 'guide'">
          <Command :size="15" />Guide
        </button>
        <button type="button" :class="{ active: activeTab === 'reference' }" role="tab" :aria-selected="activeTab === 'reference'" @click="activeTab = 'reference'">
          <Braces :size="15" />Reference
        </button>
      </div>

      <div class="panel-content">
        <div v-if="activeTab === 'guide'" class="guide-view">
          <section class="guide-section">
            <span class="section-number">01</span>
            <div>
              <h4>Name an output</h4>
              <p>Click the output name on any node. A concise name such as <code>Radius</code> becomes a reusable variable.</p>
            </div>
          </section>
          <section class="guide-section">
            <span class="section-number">02</span>
            <div>
              <h4>Reference it downstream</h4>
              <p>Type the name inside another expression. Suggestions appear as soon as CalcFlow recognizes a function, constant, or node.</p>
            </div>
          </section>
          <section class="guide-section">
            <span class="section-number">03</span>
            <div>
              <h4>Change one value</h4>
              <p>Every dependent node recalculates in topological order. Circular and self-references remain visible instead of failing silently.</p>
            </div>
          </section>

          <section class="example-section">
            <span class="panel-kicker">Useful starting points</span>
            <button v-for="example in examples" :key="example.name" type="button" class="example-button" @click="emit('use-example', example)">
              <span>
                <strong>{{ example.name }}</strong>
                <code>{{ example.expression }}</code>
              </span>
              <ArrowUpRight :size="16" />
            </button>
          </section>
        </div>

        <div v-else class="reference-view">
          <p class="reference-intro">Use node names as variables. Operators follow standard precedence, and exponentiation is right-associative.</p>
          <ul class="operator-list">
            <li v-for="item in references" :key="item.syntax">
              <span class="operator-formula"><LatexRenderer :latex="item.latex" /></span>
              <span class="operator-copy">
                <small>{{ item.label }}</small>
                <code>{{ item.syntax }}</code>
              </span>
            </li>
          </ul>
          <div class="shortcut-panel">
            <span><kbd>Ctrl</kbd><span>+</span><kbd>Enter</kbd><small>Add node</small></span>
            <span><kbd>Ctrl</kbd><span>+</span><kbd>D</kbd><small>Duplicate last</small></span>
            <span><kbd>Tab</kbd><small>Accept suggestion</small></span>
            <span><kbd>Esc</kbd><small>Close menus</small></span>
          </div>
        </div>
      </div>
    </aside>
  </Teleport>
</template>

<style scoped>
.overlay { position: fixed; z-index: 1100; inset: 0; background: rgba(23, 27, 32, 0.3); backdrop-filter: blur(3px); }
.instruction-panel {
  position: fixed;
  z-index: 1101;
  top: 0;
  right: 0;
  width: min(410px, 100vw);
  height: 100dvh;
  display: flex;
  flex-direction: column;
  transform: translateX(102%);
  background: var(--color-white);
  border-left: 1px solid var(--color-mist);
  box-shadow: var(--shadow-lg);
  visibility: hidden;
  transition: transform 240ms cubic-bezier(.22,.8,.3,1), visibility 240ms;
}
.instruction-panel.is-open { transform: translateX(0); visibility: visible; }
.panel-header { min-height: 82px; display: flex; align-items: center; justify-content: space-between; padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--color-mist); }
.panel-kicker { display: block; margin-bottom: 4px; color: var(--color-slate); font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; }
.panel-title { font-size: 1.3rem; font-weight: 600; }
.close-button { width: 38px; height: 38px; display: grid; place-items: center; border-radius: var(--radius-md); background: transparent; color: var(--color-slate); cursor: pointer; }
.close-button:hover { background: var(--color-paper); color: var(--color-ink); }
.panel-tabs { display: grid; grid-template-columns: 1fr 1fr; padding: var(--space-3) var(--space-5) 0; border-bottom: 1px solid var(--color-mist); }
.panel-tabs button { position: relative; min-height: 44px; display: flex; align-items: center; justify-content: center; gap: var(--space-2); background: transparent; color: var(--color-slate); cursor: pointer; font-size: 0.75rem; font-weight: 650; }
.panel-tabs button::after { content: ''; position: absolute; right: 16px; bottom: -1px; left: 16px; height: 2px; background: transparent; }
.panel-tabs button.active { color: var(--color-ink); }
.panel-tabs button.active::after { background: var(--color-accent); }
.panel-content { flex: 1; overflow-y: auto; padding: var(--space-6) var(--space-5) var(--space-10); }
.guide-section { display: grid; grid-template-columns: 34px 1fr; gap: var(--space-3); padding: 0 0 var(--space-6); }
.guide-section:not(:last-of-type) { margin-bottom: var(--space-5); border-bottom: 1px solid var(--color-mist); }
.section-number { color: var(--color-accent); font-family: var(--font-mono); font-size: 0.65rem; }
.guide-section h4 { margin: 0 0 var(--space-2); font-size: 0.9rem; }
.guide-section p, .reference-intro { color: var(--color-slate); font-size: 0.78rem; line-height: 1.65; }
code { padding: 2px 5px; background: var(--color-paper); border: 1px solid var(--color-mist); border-radius: var(--radius-sm); color: var(--color-ink-light); font-family: var(--font-mono); font-size: 0.68rem; }
.example-section { margin-top: var(--space-6); }
.example-button { width: 100%; min-height: 64px; display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3); background: transparent; border-bottom: 1px solid var(--color-mist); cursor: pointer; color: var(--color-slate); text-align: left; }
.example-button:hover { background: var(--color-paper); color: var(--color-accent); }
.example-button strong { display: block; margin-bottom: 6px; color: var(--color-ink); font-size: 0.78rem; }
.example-button code { display: block; max-width: 290px; overflow: hidden; border: 0; background: transparent; padding: 0; color: var(--color-slate); text-overflow: ellipsis; white-space: nowrap; }
.reference-intro { margin-bottom: var(--space-5); }
.operator-list { list-style: none; padding: 0; margin: 0; border-top: 1px solid var(--color-mist); }
.operator-list li { min-height: 62px; display: grid; grid-template-columns: 110px 1fr; align-items: center; border-bottom: 1px solid var(--color-mist); }
.operator-formula { overflow: hidden; color: var(--color-ink); }
.operator-copy { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.operator-copy small { color: var(--color-slate); font-size: 0.7rem; }
.shortcut-panel { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-top: var(--space-8); padding: var(--space-4); background: var(--color-paper); border-radius: var(--radius-md); }
.shortcut-panel > span { display: flex; align-items: center; gap: 4px; color: var(--color-slate); }
.shortcut-panel small { margin-left: 3px; font-size: 0.62rem; }
kbd { min-width: 24px; height: 22px; display: inline-grid; place-items: center; padding: 0 5px; background: var(--color-white); border: 1px solid var(--color-cloud); border-radius: var(--radius-sm); color: var(--color-ink); font-family: var(--font-mono); font-size: 0.58rem; }

@media (max-width: 560px) {
  .instruction-panel { top: auto; bottom: 0; width: 100%; height: min(82dvh, 720px); border-top: 1px solid var(--color-mist); border-left: 0; border-radius: var(--radius-lg) var(--radius-lg) 0 0; transform: translateY(102%); }
  .instruction-panel.is-open { transform: translateY(0); }
  .panel-header { min-height: 72px; }
  .panel-content { padding: var(--space-5) var(--space-4) var(--space-8); }
  .panel-tabs { padding-right: var(--space-4); padding-left: var(--space-4); }
}
</style>
