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
    if (result.value === 'Circular Dependency') return '循环依赖：节点间形成了相互引用'
    if (result.value === 'Self Reference') return '自引用：节点不能引用自身'
    if (result.value === 'Error') return '表达式错误：请检查输入'
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
    latexExpression.value = await latexFromExpression(expression.value, result.value)
}

function onElementUpdate(index, newValue) {
    const tokens = decodedElements.value.map(t => ({ ...t }));
    if (tokens[index]) {
        tokens[index].value = String(newValue);
        expression.value = tokens.map(t => t.value).join(' ');
    }
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
        <div class="node-latex">
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
                <Element :header="props.header" :content="result" :isResult="true" @update:header="editableHeader = $event" />
            </div>

        </div>

        <div class="node-expression">
            <div class="expression-container">
                <div class="expression-highlighter" v-html="highlightedInputHtml"></div>
                <input ref="expressionInputRef" class="node-expression-input" data-testid="node-expression" v-model="expression" @input="onExpressionInput" @keydown="onExpressionKeydown" @focus="onExpressionFocus" @blur="onExpressionBlur" @change="cleanExpression" />
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
    border: 3px solid #000000;
    background-color: #f8f9fa;
    padding: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    transition: box-shadow 0.2s ease, transform 0.15s ease;
}

.node:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    transform: translateY(-1px);
}

.node.error {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15), 0 4px 16px rgba(239, 68, 68, 0.1);
    animation: errorPulse 2s ease-in-out infinite;
}

@keyframes errorPulse {
    0%, 100% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15), 0 4px 16px rgba(239, 68, 68, 0.1); }
    50% { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0.1), 0 4px 20px rgba(239, 68, 68, 0.15); }
}

.delete-button {
    position: absolute;
    top: 6px;
    right: 6px;
    background: #fee2e2;
    color: #dc2626;
    border: 2px solid #dc2626;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-weight: bold;
    font-size: 14px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    line-height: 1;
    opacity: 0;
    transition: opacity 0.2s ease, background-color 0.2s ease, transform 0.15s ease;
}

.node:hover .delete-button {
    opacity: 1;
}

.delete-button:hover {
    background: #fecaca;
    transform: scale(1.1);
}

.node-error-badge {
    position: absolute;
    top: 6px;
    left: 6px;
    background: #fee2e2;
    color: #dc2626;
    border: 2px solid #dc2626;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    cursor: help;
    font-weight: bold;
    font-size: 12px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    line-height: 1;
    z-index: 10;
}

.node-elements {
    display: flex;
    flex-direction: row;
    align-items: center;
}

.node-elements-input {
    display: flex;
    flex-direction: row;
    align-items: center;
}

.node-elements-operator {
    color: #000;
    font-size: 18px;
    font-weight: bold;
    margin: 0 3px;
}

.node-elements-operator-parenthesis {
    color: #000;
    font-size: 22px;
    font-weight: bold;
    margin: 0 3px;
}

.node-elements-function {
    color: #000;
    font-size: 18px;
    font-weight: bold;
    margin: 0 3px;
}

.node-elements-comma {
    color: #000;
    font-size: 18px;
    font-weight: bold;
    margin: 0 3px;
}

.node-elements-constant {
    color: #000;
    font-size: 18px;
    font-weight: bold;
    margin: 0 3px;
}

.node-elements-operator-equal {
    color: #000;
    font-size: 20px;
    font-weight: bold;
    margin: 0 10px;
}

.node-expression {
    color: #000000;
    margin-top: 8px;
    font-size: 16px;
    font-weight: bold;
    border: none;
    text-align: center;
    padding: 6px 0;
    width: 100%;
    background-color: transparent;
}

.node-expression:focus {
    background-color: rgba(255, 255, 255, 0.8);
    outline: 2px solid #3b82f6;
    border-radius: 6px;
}
.expression-container {
    position: relative;
    width: 100%;
}
.expression-highlighter {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    background-color: rgba(255, 255, 255, 0.7);
    color: #000000;
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 16px;
    font-weight: bold;
    white-space: pre;
    text-align: center;
}
.node-expression-input {
    position: relative;
    background-color: transparent;
    color: transparent;
    caret-color: #000000;
    margin-top: 6px;
    font-size: 16px;
    font-weight: bold;
    border: none;
    text-align: center;
    padding: 6px 8px;
    width: 100%;
    border-radius: 6px;
}
.node-expression-input:focus {
    background-color: transparent;
    outline: 2px solid #3b82f6;
}
.node-latex {
    margin-bottom: 6px;
}

.hl-number { color: #568ddf }
.hl-operator { color: #64ce7d; font-weight: bold }
.hl-function { color: #805cc4 }
.hl-reference { color: #0f1676; font-weight: 600 }
.hl-parenthesis { color: #000000; font-weight: bold }
.hl-comma { color: #000000 }
.hl-constant { color: #2da44e }
.hl-placeholder { color: #9ca3af }
.autocomplete-menu {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    top: calc(100% + 4px);
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 6px;
    z-index: 1001;
    max-height: 200px;
    overflow-y: auto;
    min-width: 220px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}
.autocomplete-item {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 8px 12px;
    cursor: pointer;
    color: #000000;
    border-radius: 6px;
    transition: background-color 0.15s ease;
}
.autocomplete-item:hover,
.autocomplete-item.active {
    background: #f1f5f9;
}
.autocomplete-type {
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 600;
    padding: 2px 6px;
    background: #e2e8f0;
    border-radius: 4px;
}
.autocomplete-label {
    font-weight: 600;
    color: #1e293b;
}
</style>
