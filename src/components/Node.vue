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

function decodeElements(expression) {
    return decodeElementsEngine(expression)
}

const elementBackgroundColor = computed(() => generateRandomColor(props.header + expression.value + "Node", 25, 100))

const decodedElements = computed(() => decodeElements(expression.value));

const { highlightedInputHtml } = useHighlighter(expression)

const latexExpression = computed(() => {
    return latexFromExpression(expression.value, result.value)
})

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

const { debouncedRecalculate } = useNodeCalculation({
    expression,
    editableHeader,
    nodeId,
    result,
})

watch(expression, () => {
    debouncedRecalculate();
}, { immediate: true });

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
    nodeManager.registerNode(nodeId.value, {
        header: editableHeader.value,
        result: result.value,
        updateCallback: debouncedRecalculate
    });
});

onUnmounted(() => {
    nodeManager.unregisterNode(nodeId.value);
});

</script>

<template>
    <div class="node" :class="{ error: isError }" :style="{ backgroundColor: elementBackgroundColor }">
        <button class="delete-button" @click="$emit('delete')">X</button>
        <div v-if="isError" class="node-error-badge">⚠️</div>
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
                <input ref="expressionInputRef" class="node-expression-input" v-model="expression" @input="onExpressionInput" @keydown="onExpressionKeydown" @focus="onExpressionFocus" @blur="onExpressionBlur" @change="cleanExpression" />
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
    background-color: #595959;
    padding: 5px;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 80px;
    border-radius: 8px;
}

.node.error {
    border-color: #ef4444;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.delete-button {
    position: absolute;
    top: -15px;
    right: -20px;
    background: rgb(253, 186, 186);
    color: rgb(0, 0, 0);
    border: 2px solid #000000;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    cursor: pointer;
    font-weight: bold;
    font-size: 18px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    line-height: 1;
}

.node-error-badge {
    position: absolute;
    top: -12px;
    left: -12px;
    background: #ff6e6e;
    color: #ffffff;
    border: 2px solid #000000;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    cursor: default;
    font-weight: bold;
    font-size: 18px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0;
    line-height: 1;
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
    margin-top: 5px;
    font-size: 16px;
    font-weight: bold;
    border: none;
    text-align: center;
    padding: 5px 0;
    width: 100%;
    background-color: transparent;
}

.node-expression:focus {
    background-color: rgba(255, 255, 255, 0.5);
    outline: 1px solid #ffffff;
    border-radius: 4px;
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
    background-color: rgba(255, 255, 255, 0.5);
    color: #000000;
    border-radius: 4px;
    padding: 5px 0;
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
    margin-top: 5px;
    font-size: 16px;
    font-weight: bold;
    border: none;
    text-align: center;
    padding: 5px 0;
    width: 100%;
    border-radius: 4px;
}
.node-expression-input:focus {
    border: 2px;
    background-color: transparent;
    outline: 1px solid #ffffff;
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
    top: 100%;
    background: #ffffff;
    border: 1px solid #000000;
    border-radius: 8px;
    padding: 4px;
    z-index: 1001;
    max-height: 180px;
    overflow-y: auto;
    min-width: 200px;
}
.autocomplete-item {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 6px 8px;
    cursor: pointer;
    color: #000000;
}
.autocomplete-item.active {
    background: #f0f0f0;
}
.autocomplete-type {
    font-size: 12px;
    color: #64748b;
}
.autocomplete-label {
    font-weight: 600;
}
</style>
