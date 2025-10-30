<script setup>
import { ref, computed, watch, toRefs, onMounted, onUnmounted, nextTick } from 'vue'
import Element from './Element.vue'
import { generateRandomColor, nodeManager } from '../utils.js'

const props = defineProps({
    header: String,
})

const { header } = toRefs(props)
const editableHeader = ref(header.value)

const expression = ref('')
const result = ref(0)

const nodeId = ref(`node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)

const currentDependencies = ref(new Set())

const lastExpression = ref('')
const lastResult = ref(null)

let recalculateTimer = null

function decodeElements(expression) {
    if (!expression) {
        return [];
    }
    const regex = /(\d+\.?\d*)|([a-zA-Z_][a-zA-Z0-9_]*)|([+\-*/()])/g;
    const tokens = [];
    let match;

    while ((match = regex.exec(expression)) !== null) {
        const value = match[0];
        let type = 'unknown';
        if (match[1]) {
            type = 'number';
        } else if (match[2]) {
            type = 'reference';
        } else if (match[3]) {
            if ('+-*/'.includes(value)) {
                type = 'operator';
            } else if ('()'.includes(value)) {
                type = 'parenthesis';
            }
        }

        tokens.push({ type, value });
    }

    return tokens;
}

const elementBackgroundColor = computed(() => generateRandomColor(props.header + expression.value + "Node", 25, 100))

const decodedElements = computed(() => decodeElements(expression.value));

function onElementUpdate(index, newValue) {
    const tokens = decodedElements.value.map(t => ({ ...t }));
    if (tokens[index]) {
        tokens[index].value = String(newValue);
        expression.value = tokens.map(t => t.value).join(' ');
    }
}

function cleanExpression() {
    expression.value = expression.value.trim().replace(/^[\s+\-*\/]+|[\s+\-*\/]+$/g, '');
}

function precedence(op) {
    if (op === '+' || op === '-') return 1;
    if (op === '*' || op === '/') return 2;
    return 0;
}

function applyOp(op, b, a) {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return b === 0 ? NaN : a / b;
    }
    return NaN;
}

function evaluate(tokens) {
    if (!tokens || tokens.length === 0) return 0;

    let values = [];
    let ops = [];

    const applyTopOp = () => {
        if (ops.length === 0 || values.length < 2) return false;
        const op = ops[ops.length - 1];
        if (op === '(') return false;

        ops.pop();
        const val2 = values.pop();
        const val1 = values.pop();
        values.push(applyOp(op, val2, val1));
        return true;
    };

    for (const token of tokens) {
        if (token.type === 'number') {
            values.push(parseFloat(token.value));
        } else if (token.type === 'reference') {
            const referencedNode = nodeManager.getNodeByHeader(token.value);
            if (referencedNode) {
                values.push(referencedNode.result || 0);
            } else {
                values.push(0);
            }
        } else if (token.value === '(') {
            ops.push(token.value);
        } else if (token.value === ')') {
            while (ops.length && ops[ops.length - 1] !== '(') {
                if (!applyTopOp()) return NaN;
            }
            if (ops.length === 0) return NaN;
            ops.pop();
        } else if (token.type === 'operator') {
            while (ops.length && precedence(ops[ops.length - 1]) >= precedence(token.value)) {
                if (!applyTopOp()) break;
            }
            ops.push(token.value);
        }
    }

    while (ops.length > 0) {
        if (ops[ops.length - 1] === '(') return NaN;
        if (!applyTopOp()) break;
    }

    if (values.length > 0) {
        const lastValue = values[values.length - 1];
        return isNaN(lastValue) ? 'Error' : lastValue;
    }

    return 0;
}

function updateDependencies() {
    const tokens = decodeElements(expression.value);
    const newDependencies = new Set();

    for (const token of tokens) {
        if (token.type === 'reference') {
            const referencedNode = nodeManager.getNodeByHeader(token.value);
            if (referencedNode) {
                if (referencedNode.nodeId === nodeId.value) {
                    result.value = "Self Reference";
                    currentDependencies.value.forEach(depNodeId => {
                        nodeManager.removeDependency(nodeId.value, depNodeId);
                    });
                    currentDependencies.value.clear();
                    return false;
                }
                newDependencies.add(referencedNode.nodeId);
            }
        }
    }

    currentDependencies.value.forEach(depNodeId => {
        nodeManager.removeDependency(nodeId.value, depNodeId);
    });

    newDependencies.forEach(depNodeId => {
        nodeManager.addDependency(nodeId.value, depNodeId);
    });

    if (nodeManager.detectCircularDependency(nodeId.value)) {
        console.warn(`Circular dependency detected, involving node: ${editableHeader.value}`);
        result.value = "Circular Dependency";
        
        newDependencies.forEach(depNodeId => {
            nodeManager.removeDependency(nodeId.value, depNodeId);
        });
        currentDependencies.value.clear();
        
        return false;
    }

    currentDependencies.value = newDependencies;
    return true;
}

function recalculate() {
    const dependenciesUpdated = updateDependencies();
    if (!dependenciesUpdated) {
        return;
    }
    
    const currentExpressionWithDeps = expression.value + JSON.stringify(
        Array.from(currentDependencies.value).map(depId => {
            const depNode = nodeManager.getNode(depId);
            return depNode ? depNode.result : 0;
        })
    );
    
    if (lastExpression.value === currentExpressionWithDeps && lastResult.value !== null) {
        result.value = lastResult.value;
        return;
    }
    
    const tokens = decodeElements(expression.value);
    const calculatedResult = evaluate(tokens);
    if (calculatedResult === 'Error' || isNaN(calculatedResult)) {
        result.value = "Error";
    } else {
        result.value = Math.round(calculatedResult * 1e6) / 1e6;
    }
    
    lastExpression.value = currentExpressionWithDeps;
    lastResult.value = result.value;
    
    nodeManager.updateNode(nodeId.value, { 
        result: result.value,
        header: editableHeader.value 
    });
    
    nodeManager.triggerDependentUpdates(nodeId.value);
}

function debouncedRecalculate() {
    if (recalculateTimer) {
        clearTimeout(recalculateTimer);
    }
    recalculateTimer = setTimeout(() => {
        recalculate();
    }, 50);
}

watch(expression, () => {
    debouncedRecalculate();
}, { immediate: true });

watch(editableHeader, (newHeader) => {
    nodeManager.updateNode(nodeId.value, { header: newHeader });
});

onMounted(() => {
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
    <div class="node" :style="{ backgroundColor: elementBackgroundColor }">
        <button class="delete-button" @click="$emit('delete')">X</button>
        <div class="node-elements">
            <div class="node-elements-input">
                <span v-for="(element, index) in decodedElements" :key="index">
                    <span v-if="element.type === 'reference'">
                        
                        <Element :key="element.value" :header="element.value" 
                        :content="nodeManager.getNodeByHeader(element.value)?.result || 0" 
                        :isRef="true" :isResult="false" @update:content="onElementUpdate(index, $event)" />

                    </span>
                    <span v-else-if="element.type === 'operator'" class="node-elements-operator">
                        {{ element.value }}
                    </span>
                    <span v-else-if="element.type === 'parenthesis'" class="node-elements-operator-parenthesis">
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
            <input class="node-expression-input" v-model="expression" @change="cleanExpression" />
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

.delete-button {
    position: absolute;
    top: -10px;
    right: -10px;
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
.node-expression-input {
    color: #000000;
    margin-top: 5px;
    font-size: 16px;
    font-weight: bold;
    border: none;
    text-align: center;
    padding: 5px 0;
    width: 100%;
    border-radius: 4px;
    background-color: rgba(255, 255, 255, 0.5);
}
.node-expression-input:focus {
    border: 2px;
    background-color: rgba(255, 255, 255, 0.5);
    outline: 1px solid #ffffff;
}
</style>
