<script setup>
import { ref, computed, watch, toRefs, onMounted, onUnmounted, nextTick } from 'vue'
import Element from './Element.vue'
import LatexRenderer from './LatexRenderer.vue'
import { generateRandomColor, nodeManager } from '../utils.js'
import { decodeElements as decodeElementsEngine, latexFromExpression } from '../math/expression-engine.js'
import { useAutocomplete } from '../composables/useAutocomplete.js'
import { useNodeCalculation } from '../composables/useNodeCalculation.js'
import { useHighlighter } from '../composables/useHighlighter.js'

const props = defineProps({
    header: String,
    initialExpression: String,
})

const { header } = toRefs(props)
const editableHeader = ref(header.value)

const expression = ref('')
const result = ref(0)

watch(() => props.initialExpression, (val) => {
    if (typeof val === 'string') {
        expression.value = val
    }
})

const nodeId = ref(`node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

const expressionInputRef = ref(null)
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

const isError = computed(() => {
    return result.value === 'Error' || result.value === 'Circular Dependency' || result.value === 'Self Reference'
})

const errorMessage = computed(() => {
    if (result.value === 'Circular Dependency') return 'Circular dependency detected between nodes'
    if (result.value === 'Self Reference') return 'Node cannot reference itself'
    if (result.value === 'Error') return 'Invalid expression. Please check your input'
    return ''
})

function decodeElements(expression) {
    return decodeElementsEngine(expression)
}

const elementBackgroundColor = computed(() => generateRandomColor(props.header + expression.value + "Node", 25, 100))

const decodedElements = computed(() => decodeElements(expression.value));

const { highlightedInputHtml } = useHighlighter(expression)

const latexExpression = ref('')

async function updateLatexExpression() {
    // Handle empty expression - show placeholder
    if (!expression.value || expression.value.trim() === '') {
        latexExpression.value = ''
        return
    }
    latexExpression.value = await latexFromExpression(expression.value, result.value)
}

function onElementUpdate(index, newValue) {
    const tokens = decodedElements.value.map(t => ({ ...t }));
    if (tokens[index]) {
        tokens[index].value = String(newValue);
        expression.value = tokens.map(t => t.value).join(' ');
    }
}

function onElementCopy(value) {
    // Dispatch custom event that App.vue can listen to
    window.dispatchEvent(new CustomEvent('calcflow:toast', {
        detail: { message: `Copied: ${value}`, type: 'success' }
    }))
}

function cleanExpression() {
    expression.value = expression.value.trim().replace(/^[\s+\-*\/\^%]+|[\s+\-*\/\^%]+$/g, '');
}

const { debouncedRecalculate, onNewNodeRegistered } = useNodeCalculation({
    expression,
    editableHeader,
    nodeId,
    result,
})

watch(expression, () => {
    debouncedRecalculate();
    updateLatexExpression()
}, { immediate: true });

watch(result, () => {
    updateLatexExpression()
})

watch(expression, (val) => {
    nodeManager.updateNode(nodeId.value, { expression: val })
})

watch(editableHeader, (newHeader) => {
    nodeManager.updateNode(nodeId.value, { header: newHeader });
});

onMounted(() => {
    if (typeof props.initialExpression === 'string') {
        expression.value = props.initialExpression
    }
    updateLatexExpression()
    nodeManager.registerNode(nodeId.value, {
        header: editableHeader.value,
        result: result.value,
        updateCallback: debouncedRecalculate,
        onNewNodeRegistered: onNewNodeRegistered
    });
});

onUnmounted(() => {
    nodeManager.unregisterNode(nodeId.value);
});

</script>

<template>
    <div class="node" data-testid="node" :class="{ error: isError }" :style="{ backgroundColor: elementBackgroundColor }">
        <button class="delete-button" data-testid="node-delete" @click="$emit('delete')">X</button>
        <div v-if="isError" class="node-error-badge" data-testid="node-error" :title="errorMessage">⚠️</div>
        <div v-if="latexExpression" class="node-latex">
            <LatexRenderer :latex="latexExpression" />
        </div>
        <div class="node-elements">
            <div class="node-elements-input">
                <span v-for="(element, index) in decodedElements" :key="index">
                    <span v-if="element.type === 'reference'">
                        
                        <Element :key="element.value" :header="element.value" 
                        :content="nodeManager.getNodeByHeader(element.value)?.result || 0" 
                        :isRef="true" :isResult="false" :isMissing="!nodeManager.getNodeByHeader(element.value)" @update:content="onElementUpdate(index, $event)" />

                    </span>
                    <span v-else-if="element.type === 'function'" class="node-elements-function">
                        {{ element.value }}
                    </span>
                    <span v-else-if="element.type === 'operator'" class="node-elements-operator">
                        {{ element.value }}
                    </span>
                    <span v-else-if="element.type === 'parenthesis'" class="node-elements-operator-parenthesis">
                        {{ element.value }}
                    </span>
                    <span v-else-if="element.type === 'comma'" class="node-elements-comma">
                        ,
                    </span>
                    <span v-else-if="element.type === 'constant'" class="node-elements-constant">
                        {{ element.value }}
                    </span>
                    <span v-else-if="element.type === 'number'">
                        <Element :key="element.value" :header="'Const'" :content="element.value" :isResult="false" @update:content="onElementUpdate(index, $event)" />
                    </span>
                </span>
            </div>

            <div class="node-elements-operator-equal">
                =
            </div>

            <div class="node-elements-output">
                <Element :header="props.header" :content="result" :isResult="true" @update:header="editableHeader = $event" @copy="onElementCopy" />
            </div>

        </div>

        <div class="node-expression">
            <div class="expression-container">
                <div class="expression-highlighter" v-html="highlightedInputHtml"></div>
                <input ref="expressionInputRef" class="node-expression-input" data-testid="node-expression" v-model="expression" @input="onExpressionInput" @keydown="onExpressionKeydown" @focus="onExpressionFocus" @blur="onExpressionBlur" @change="cleanExpression" placeholder="Enter expression..." />
                <div v-if="suggestionsOpen" class="autocomplete-menu">
                    <div v-for="(item, idx) in suggestionItems" :key="item.type + ':' + item.label" class="autocomplete-item" :class="{ active: idx === selectedSuggestionIndex }" @mousedown.prevent="applySuggestionAt(idx)">
                        <span class="autocomplete-type">{{ item.type === 'function' ? 'fn' : (item.type === 'constant' ? 'const' : 'node') }}</span>
                        <span class="autocomplete-label">{{ item.label }}</span>
                    </div>
                </div>
            </div>
        </div>

    </div>

</template>

<style>
.node {
    position: relative;
    border: 1px solid var(--color-mist);
    background-color: var(--color-white);
    padding: var(--space-4) var(--space-5);
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 120px;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: grab;
    animation: nodeAppear 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.node:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
    border-color: var(--color-cloud);
}

.node:active {
    cursor: grabbing;
}

.node.error {
    border-color: #fecaca;
    background-color: var(--color-error-bg);
    box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.1), var(--shadow-md);
}

.node.error:hover {
    box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.15), var(--shadow-lg);
}

.delete-button {
    position: absolute;
    top: var(--space-2);
    right: var(--space-2);
    background: var(--color-error-bg);
    color: var(--color-error);
    border: 1px solid #fecaca;
    border-radius: var(--radius-md);
    width: 28px;
    height: 28px;
    cursor: pointer;
    font-weight: 500;
    font-size: 13px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    opacity: 0.5;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--shadow-sm);
}

.node:hover .delete-button {
    opacity: 0.7;
}

.delete-button:hover {
    background: #fecaca;
    opacity: 1;
    transform: scale(1.05);
    border-color: #fca5a5;
}

.delete-button:active {
    transform: scale(0.95);
}

.node-error-badge {
    position: absolute;
    top: var(--space-2);
    left: var(--space-2);
    background: var(--color-error-bg);
    color: var(--color-error);
    border: 1px solid #fecaca;
    border-radius: var(--radius-md);
    width: 24px;
    height: 24px;
    cursor: help;
    font-weight: 500;
    font-size: 12px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    z-index: 10;
    transition: all 0.15s ease;
}

.node-error-badge:hover {
    background: #fecaca;
    transform: scale(1.1);
}

.node-elements {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--space-1);
}

.node-elements-input {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2px;
}

.node-elements-operator {
    color: var(--color-slate);
    font-size: 16px;
    font-weight: 500;
    margin: 0 2px;
}

.node-elements-operator-parenthesis {
    color: var(--color-silver);
    font-size: 18px;
    font-weight: 400;
    margin: 0 2px;
}

.node-elements-function {
    color: var(--color-accent);
    font-size: 15px;
    font-weight: 600;
    margin: 0 2px;
}

.node-elements-comma {
    color: var(--color-silver);
    font-size: 15px;
    margin: 0 2px;
}

.node-elements-constant {
    color: var(--color-success);
    font-size: 15px;
    font-weight: 500;
    margin: 0 2px;
}

.node-elements-operator-equal {
    color: var(--color-silver);
    font-size: 17px;
    font-weight: 400;
    margin: 0 var(--space-2);
}

.node-expression {
    color: var(--color-ink);
    margin-top: var(--space-3);
    font-size: 14px;
    font-weight: 400;
    border: none;
    text-align: center;
    padding: var(--space-2) 0;
    width: 100%;
    background-color: transparent;
}

.expression-container {
    position: relative;
    width: 100%;
    min-height: 34px;
}

.expression-highlighter {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    background-color: var(--color-paper);
    color: var(--color-ink);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 400;
    white-space: pre;
    text-align: center;
    border: 1px solid var(--color-mist);
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.node-expression-input {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: transparent;
    color: transparent;
    caret-color: var(--color-accent);
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 400;
    border: 1px solid transparent;
    text-align: center;
    padding: var(--space-2) var(--space-3);
    width: 100%;
    border-radius: var(--radius-md);
    transition: all 0.15s ease;
}

.node-expression-input:focus {
    outline: none;
    border-color: var(--color-accent);
    box-shadow: var(--shadow-focus);
}

.node-expression-input:focus + .expression-highlighter,
.node-expression-input:focus ~ .expression-highlighter {
    background-color: var(--color-white);
    border-color: var(--color-accent);
}

.node-expression-input::placeholder {
    color: var(--color-silver);
}

.node-latex {
    margin-bottom: var(--space-3);
    padding: var(--space-1) var(--space-4);
    background: var(--color-paper);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-mist);
    min-height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Syntax Highlighting Colors */
.hl-number { color: var(--color-accent); }
.hl-operator { color: var(--color-success); font-weight: 500; }
.hl-function { color: #7c3aed; }
.hl-reference { color: var(--color-ink); font-weight: 500; }
.hl-parenthesis { color: var(--color-slate); }
.hl-comma { color: var(--color-silver); }
.hl-constant { color: var(--color-success); }
.hl-placeholder { color: var(--color-silver); }

.autocomplete-menu {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: calc(100% + var(--space-2));
    background: var(--color-white);
    border: 1px solid var(--color-mist);
    border-radius: var(--radius-lg);
    padding: var(--space-1);
    z-index: 1001;
    max-height: 220px;
    overflow-y: auto;
    min-width: 180px;
    max-width: 260px;
    box-shadow: var(--shadow-xl);
}

.autocomplete-item {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    color: var(--color-ink);
    border-radius: var(--radius-md);
    transition: all 0.1s ease;
}

.autocomplete-item:hover,
.autocomplete-item.active {
    background: var(--color-paper);
}

.autocomplete-item.active {
    background: var(--color-accent-glow);
}

.autocomplete-type {
    font-size: 10px;
    color: var(--color-slate);
    text-transform: uppercase;
    font-weight: 600;
    padding: 2px 6px;
    background: var(--color-paper);
    border-radius: var(--radius-sm);
    flex-shrink: 0;
}

.autocomplete-item:hover .autocomplete-type,
.autocomplete-item.active .autocomplete-type {
    background: var(--color-accent-glow);
    color: var(--color-accent);
}

.autocomplete-label {
    font-weight: 500;
    color: var(--color-ink);
    flex: 1;
    font-size: 14px;
}
</style>
