<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Copy, GitBranch, GripVertical, Trash2, TriangleAlert } from 'lucide-vue-next'
import Element from './Element.vue'
import LatexRenderer from './LatexRenderer.vue'
import { generateRandomColor, nodeManager } from '../utils.js'
import { decodeElements, latexFromExpression } from '../math/expression-engine.js'
import { useAutocomplete } from '../composables/useAutocomplete.js'
import { useNodeCalculation } from '../composables/useNodeCalculation.js'
import { useHighlighter } from '../composables/useHighlighter.js'

const props = defineProps({
  nodeKey: [String, Number],
  position: Number,
  header: String,
  initialExpression: String,
})

const emit = defineEmits(['delete', 'duplicate', 'update'])

const editableHeader = ref(props.header || 'Node')
const expression = ref(props.initialExpression || '')
const result = ref(0)
const nodeId = ref(`node_${props.nodeKey ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`}`)
const expressionInputRef = ref(null)
const latexExpression = ref('')
let latexVersion = 0
let isMounted = false

watch(() => props.header, (value) => {
  if (typeof value === 'string' && value !== editableHeader.value) editableHeader.value = value
})

watch(() => props.initialExpression, (value) => {
  if (typeof value === 'string' && value !== expression.value) expression.value = value
})

const knownHeaders = computed(() => Array.from(nodeManager.nodes.values()).map((node) => node.header).filter(Boolean))
const decodedElements = computed(() => decodeElements(expression.value, knownHeaders.value))
const dependencyHeaders = computed(() => [...new Set(
  decodedElements.value.filter((token) => token.type === 'reference').map((token) => token.value),
)])
const isError = computed(() => ['Error', 'Circular Dependency', 'Self Reference'].includes(result.value))
const errorMessage = computed(() => {
  if (result.value === 'Circular Dependency') return 'This reference closes a dependency loop.'
  if (result.value === 'Self Reference') return 'A node cannot use its own output.'
  if (result.value === 'Error') return 'The expression could not be evaluated.'
  return ''
})
const nodeAccent = computed(() => generateRandomColor(editableHeader.value, 42, 48))

const { highlightedInputHtml } = useHighlighter(expression)
const {
  suggestionsOpen,
  suggestionItems,
  selectedSuggestionIndex,
  onExpressionInput,
  onExpressionFocus,
  onExpressionBlur,
  onExpressionKeydown,
  applySuggestionAt,
} = useAutocomplete(expression, expressionInputRef)

const { debouncedRecalculate, recalculate, updateDependencies, disposeCalculation } = useNodeCalculation({
  expression,
  editableHeader,
  nodeId,
  result,
})

function emitState() {
  emit('update', {
    header: editableHeader.value,
    expression: expression.value,
    result: result.value,
    dependencies: dependencyHeaders.value,
    hasError: isError.value,
  })
}

async function updateLatexExpression() {
  const version = ++latexVersion
  if (!expression.value.trim()) {
    latexExpression.value = ''
    return
  }
  const latex = await latexFromExpression(expression.value, result.value, knownHeaders.value)
  if (version === latexVersion) latexExpression.value = latex
}

function onElementUpdate(index, newValue) {
  const tokens = decodedElements.value.map((token) => ({ ...token }))
  if (!tokens[index]) return
  tokens[index].value = String(newValue)
  expression.value = tokens.map((token) => token.value).join(' ')
}

function notifyCopied(value) {
  window.dispatchEvent(new CustomEvent('calcflow:toast', {
    detail: { message: `${value} copied`, type: 'success' },
  }))
}

function cleanExpression() {
  const trimmed = expression.value.trim()
  if (!/[\p{L}\p{N}_)]/u.test(trimmed)) {
    expression.value = trimmed
    return
  }
  expression.value = trimmed.replace(/^\++\s*/, '').replace(/[+\-*\/\^%]+\s*$/, '').trim()
}

watch(expression, () => {
  nodeManager.updateNode(nodeId.value, { expression: expression.value })
  if (isMounted) debouncedRecalculate()
  updateLatexExpression()
  emitState()
}, { immediate: true })

watch(result, () => {
  updateLatexExpression()
  emitState()
})

watch(editableHeader, () => {
  nodeManager.updateNode(nodeId.value, { header: editableHeader.value })
  emitState()
})

watch(dependencyHeaders, emitState)

onMounted(() => {
  isMounted = true
  nodeManager.registerNode(nodeId.value, {
    header: editableHeader.value,
    expression: expression.value,
    result: result.value,
    updateCallback: recalculate,
    dependencyCallback: updateDependencies,
  })
  nextTick(emitState)
})

onUnmounted(() => {
  isMounted = false
  disposeCalculation()
  nodeManager.unregisterNode(nodeId.value)
})
</script>

<template>
  <article class="node" data-testid="node" :class="{ error: isError }" :style="{ '--node-accent': nodeAccent }">
    <header class="node-header">
      <div class="node-identity">
        <button type="button" class="icon-button drag-handle" title="Drag to reorder" aria-label="Drag to reorder">
          <GripVertical :size="17" />
        </button>
        <div>
          <span class="node-kicker">Node {{ String(position || 1).padStart(2, '0') }}</span>
          <span class="node-name">{{ editableHeader || 'Untitled' }}</span>
        </div>
      </div>

      <div class="node-header-end">
        <span class="node-status" :class="{ 'is-error': isError }">
          <TriangleAlert v-if="isError" :size="13" />
          <span v-else class="status-dot"></span>
          {{ isError ? 'Check' : 'Live' }}
        </span>
        <div class="node-actions">
          <button type="button" class="icon-button" title="Duplicate node" aria-label="Duplicate node" @click="emit('duplicate')">
            <Copy :size="16" />
          </button>
          <button type="button" class="icon-button delete-button" data-testid="node-delete" title="Delete node" aria-label="Delete node" @click="emit('delete')">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
    </header>

    <div v-if="isError" class="node-error-badge" data-testid="node-error" :title="errorMessage">
      <TriangleAlert :size="15" />
      <span>{{ errorMessage }}</span>
    </div>

    <div class="formula-stage">
      <div v-if="latexExpression" class="node-latex">
        <LatexRenderer :latex="latexExpression" />
      </div>

      <div v-if="expression" class="node-elements">
        <div class="node-elements-input">
          <template v-for="(element, index) in decodedElements" :key="`${index}:${element.value}`">
            <Element
              v-if="element.type === 'reference'"
              :header="element.value"
              :content="nodeManager.getNodeByHeader(element.value)?.result ?? 0"
              :is-ref="true"
              :is-result="false"
              :is-missing="!nodeManager.getNodeByHeader(element.value)"
              @update:content="onElementUpdate(index, $event)"
            />
            <span v-else-if="element.type === 'function'" class="node-elements-function">{{ element.value }}</span>
            <span v-else-if="element.type === 'operator'" class="node-elements-operator">{{ element.value }}</span>
            <span v-else-if="element.type === 'parenthesis'" class="node-elements-parenthesis">{{ element.value }}</span>
            <span v-else-if="element.type === 'comma'" class="node-elements-comma">,</span>
            <span v-else-if="element.type === 'constant'" class="node-elements-constant">{{ element.value }}</span>
            <Element
              v-else-if="element.type === 'number'"
              header="Const"
              :content="element.value"
              :is-result="false"
              @update:content="onElementUpdate(index, $event)"
            />
          </template>
        </div>
        <span class="node-elements-equal">=</span>
        <div class="node-elements-output">
          <Element
            :header="editableHeader"
            :content="result"
            :is-result="true"
            @update:header="editableHeader = $event"
            @copy="notifyCopied"
          />
        </div>
      </div>

      <div v-else class="formula-empty">
        <div class="formula-empty-copy">
          <span>f</span>
          <p>Enter an expression to begin</p>
        </div>
        <span class="node-elements-equal">=</span>
        <Element
          :header="editableHeader"
          :content="result"
          :is-result="true"
          @update:header="editableHeader = $event"
          @copy="notifyCopied"
        />
      </div>
    </div>

    <div class="node-expression">
      <label class="expression-label" :for="`expression-${nodeKey}`">Expression</label>
      <div class="expression-container">
        <div class="expression-highlighter" aria-hidden="true" v-html="highlightedInputHtml"></div>
        <input
          :id="`expression-${nodeKey}`"
          ref="expressionInputRef"
          v-model="expression"
          class="node-expression-input"
          data-testid="node-expression"
          autocomplete="off"
          spellcheck="false"
          placeholder="e.g. sqrt(A ^ 2 + B ^ 2)"
          @input="onExpressionInput"
          @keydown="onExpressionKeydown"
          @focus="onExpressionFocus"
          @blur="onExpressionBlur"
          @change="cleanExpression"
        />
        <div v-if="suggestionsOpen" class="autocomplete-menu">
          <button
            v-for="(item, index) in suggestionItems"
            :key="`${item.type}:${item.label}`"
            type="button"
            class="autocomplete-item"
            :class="{ active: index === selectedSuggestionIndex }"
            @mousedown.prevent="applySuggestionAt(index)"
          >
            <span class="autocomplete-type">{{ item.type === 'function' ? 'fn' : item.type === 'constant' ? 'const' : 'node' }}</span>
            <span class="autocomplete-label">{{ item.label }}</span>
          </button>
        </div>
      </div>
    </div>

    <footer class="node-footer">
      <span v-if="dependencyHeaders.length" class="dependency-readout">
        <GitBranch :size="13" /> Reads {{ dependencyHeaders.join(', ') }}
      </span>
      <span v-else class="dependency-readout is-muted">Independent value</span>
      <span class="result-readout">{{ expression ? `Output · ${editableHeader || 'Untitled'}` : 'Awaiting input' }}</span>
    </footer>
  </article>
</template>

<style scoped>
.node {
  position: relative;
  width: 100%;
  min-width: 0;
  overflow: visible;
  background: rgba(251, 252, 250, 0.94);
  border: 1px solid var(--color-mist);
  border-top-color: var(--node-accent);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  animation: nodeAppear 240ms ease both;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}
.node:hover { box-shadow: var(--shadow-md); border-color: var(--color-cloud); border-top-color: var(--node-accent); }
.node.error { border-color: rgba(185, 71, 61, 0.45); border-top-color: var(--color-error); }

.node-header {
  min-height: 66px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-mist);
}
.node-identity, .node-header-end, .node-actions { display: flex; align-items: center; }
.node-identity { min-width: 0; gap: var(--space-2); }
.node-header-end { gap: var(--space-3); flex-shrink: 0; }
.node-actions { gap: 2px; }
.node-kicker { display: block; color: var(--color-silver); font-family: var(--font-mono); font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.1em; }
.node-name { display: block; max-width: min(42vw, 360px); margin-top: 2px; overflow: hidden; color: var(--color-ink); font-size: 0.82rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }

.icon-button {
  width: 34px;
  height: 34px;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-slate);
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease, opacity 140ms ease;
}
.icon-button:hover { background: var(--color-paper); color: var(--color-ink); }
.drag-handle { cursor: grab; }
.drag-handle:active { cursor: grabbing; }
.delete-button { opacity: 0.55; }
.node:hover .delete-button { opacity: 0.8; transition-duration: 0s; }
.delete-button:hover { background: var(--color-error-bg); color: var(--color-error); opacity: 1; }

.node-status { display: inline-flex; align-items: center; gap: 6px; color: var(--color-success); font-family: var(--font-mono); font-size: 0.62rem; text-transform: uppercase; }
.node-status.is-error { color: var(--color-error); }
.status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

.node-error-badge {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 9px var(--space-4);
  background: var(--color-error-bg);
  border-bottom: 1px solid rgba(185, 71, 61, 0.18);
  color: var(--color-error);
  font-size: 0.75rem;
}

.formula-stage { min-height: 132px; display: grid; place-items: center; padding: var(--space-5); overflow: hidden; }
.node-latex { width: 100%; margin-bottom: var(--space-4); overflow-x: auto; color: var(--color-ink); text-align: center; font-size: clamp(1rem, 2vw, 1.28rem); }
.node-elements { max-width: 100%; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: var(--space-2); }
.node-elements-input { min-width: 0; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 3px; }
.node-elements-function { color: var(--color-accent); font-family: var(--font-mono); font-size: 0.82rem; font-weight: 650; }
.node-elements-operator, .node-elements-parenthesis, .node-elements-comma, .node-elements-constant, .node-elements-equal { font-family: var(--font-mono); }
.node-elements-operator { color: var(--color-copper); font-weight: 650; }
.node-elements-parenthesis, .node-elements-comma, .node-elements-equal { color: var(--color-silver); }
.node-elements-constant { color: var(--color-success); }
.node-elements-equal { margin: 0 var(--space-1); font-size: 1rem; }
.formula-empty { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: var(--space-3); color: var(--color-silver); }
.formula-empty-copy { display: flex; align-items: center; gap: var(--space-3); }
.formula-empty-copy > span { width: 32px; height: 32px; display: grid; place-items: center; border: 1px solid var(--color-cloud); border-radius: 50%; font-family: Georgia, serif; font-style: italic; }
.formula-empty p { font-size: 0.78rem; }

.node-expression { padding: 0 var(--space-4) var(--space-4); }
.expression-label { display: block; margin-bottom: 7px; color: var(--color-slate); font-family: var(--font-mono); font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.1em; }
.expression-container { position: relative; min-height: 44px; }
.expression-highlighter, .node-expression-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 44px;
  padding: 11px var(--space-3);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 0.82rem;
  line-height: 20px;
  text-align: left;
  white-space: pre;
  overflow: hidden;
}
.expression-highlighter { pointer-events: none; background: var(--color-paper); border: 1px solid var(--color-mist); color: var(--color-ink); }
.node-expression-input { z-index: 1; background: transparent; border: 1px solid transparent; color: transparent; caret-color: var(--color-accent); }
.node-expression-input:focus { outline: none; border-color: var(--color-accent); box-shadow: var(--shadow-focus); }
.node-expression-input::placeholder { color: var(--color-silver); opacity: 0.9; }

:deep(.hl-number) { color: #386db2; }
:deep(.hl-operator) { color: var(--color-copper); font-weight: 650; }
:deep(.hl-function) { color: #765297; }
:deep(.hl-reference) { color: var(--color-accent); font-weight: 650; }
:deep(.hl-parenthesis), :deep(.hl-comma) { color: var(--color-slate); }
:deep(.hl-constant) { color: var(--color-success); }
:deep(.hl-placeholder) { color: var(--color-silver); }

.autocomplete-menu { position: absolute; z-index: 50; top: calc(100% + 7px); left: 0; width: min(280px, 100%); max-height: 230px; overflow-y: auto; padding: 5px; background: var(--color-white); border: 1px solid var(--color-mist); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); }
.autocomplete-item { width: 100%; display: flex; align-items: center; gap: var(--space-3); padding: 9px var(--space-2); border-radius: var(--radius-sm); background: transparent; color: var(--color-ink); cursor: pointer; text-align: left; }
.autocomplete-item:hover, .autocomplete-item.active { background: var(--color-paper); }
.autocomplete-type { min-width: 36px; color: var(--color-slate); font-family: var(--font-mono); font-size: 0.58rem; text-transform: uppercase; }
.autocomplete-label { font-family: var(--font-mono); font-size: 0.78rem; }

.node-footer { min-height: 38px; display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: 0 var(--space-4); border-top: 1px solid var(--color-mist); color: var(--color-slate); font-family: var(--font-mono); font-size: 0.62rem; }
.dependency-readout { min-width: 0; display: flex; align-items: center; gap: 6px; overflow: hidden; color: var(--color-accent); text-overflow: ellipsis; white-space: nowrap; }
.dependency-readout.is-muted { color: var(--color-silver); }
.result-readout { flex-shrink: 0; }

@media (max-width: 600px) {
  .node-header { align-items: flex-start; padding: var(--space-3); }
  .node-header-end { gap: var(--space-1); }
  .node-status { display: none; }
  .node-name { max-width: 42vw; }
  .formula-stage { min-height: 118px; padding: var(--space-4) var(--space-3); }
  .node-expression { padding: 0 var(--space-3) var(--space-3); }
  .node-footer { padding: 0 var(--space-3); }
  .result-readout { display: none; }
}
</style>
