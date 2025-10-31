<script setup>
import { ref, computed, watch, toRefs, onMounted, onUnmounted, nextTick } from 'vue'
import Element from './Element.vue'
import LatexRenderer from './LatexRenderer.vue'
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
    if (!expression) return [];
    const tokens = [];
    const expr = String(expression).trim();
    let i = 0;

    const isLetter = (c) => /[a-zA-Z_]/.test(c);
    const isDigit = (c) => /[0-9]/.test(c);

    while (i < expr.length) {
        const c = expr[i];

        if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }

        if (isDigit(c) || (c === '.' && i + 1 < expr.length && isDigit(expr[i + 1]))) {
            const start = i;
            let hasDot = c === '.';
            i++;
            while (i < expr.length) {
                const ch = expr[i];
                if (isDigit(ch)) { i++; continue; }
                if (ch === '.') {
                    if (hasDot) break;
                    hasDot = true; i++; continue;
                }
                break;
            }
            const value = expr.slice(start, i);
            tokens.push({ type: 'number', value });
            continue;
        }

        if (isLetter(c)) {
            const start = i;
            i++;
            while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) i++;
            const ident = expr.slice(start, i);

            let j = i;
            while (j < expr.length && /\s/.test(expr[j])) j++;
            if (expr[j] === '(') {
                tokens.push({ type: 'function', value: ident.toLowerCase() });
            } else {
                if (ident.toLowerCase() === 'pi') {
                    tokens.push({ type: 'constant', value: ident.toLowerCase() });
                } else {
                    tokens.push({ type: 'reference', value: ident });
                }
            }
            continue;
        }

        if ('+-*/'.includes(c)) { tokens.push({ type: 'operator', value: c }); i++; continue; }
        if (c === '(' || c === ')') { tokens.push({ type: 'parenthesis', value: c }); i++; continue; }
        if (c === ',') { tokens.push({ type: 'comma', value: ',' }); i++; continue; }

        i++;
    }

    return tokens;
}

const elementBackgroundColor = computed(() => generateRandomColor(props.header + expression.value + "Node", 25, 100))

const decodedElements = computed(() => decodeElements(expression.value));

function parseTokens(tokens) {
    let pos = 0
    function peek() { return tokens[pos] || null }
    function consume() { return tokens[pos++] }
    function parseExpression() {
        let node = parseTerm()
        while (true) {
            const t = peek()
            if (t && t.type === 'operator' && (t.value === '+' || t.value === '-')) {
                consume()
                const right = parseTerm()
                node = { type: 'BinaryOp', op: t.value, left: node, right }
            } else {
                break
            }
        }
        return node
    }
    function parseTerm() {
        let node = parseFactor()
        while (true) {
            const t = peek()
            if (t && t.type === 'operator' && (t.value === '*' || t.value === '/')) {
                consume()
                const right = parseFactor()
                node = { type: 'BinaryOp', op: t.value, left: node, right }
            } else {
                break
            }
        }
        return node
    }
    function parseFactor() {
        const t = peek()
        if (!t) return { type: 'Number', value: 0 }
        if (t.type === 'operator' && t.value === '-') {
            consume()
            const e = parseFactor()
            return { type: 'UnaryOp', op: '-', expr: e }
        }
        if (t.type === 'number') { consume(); return { type: 'Number', value: t.value } }
        if (t.type === 'reference') { consume(); return { type: 'Reference', name: t.value } }
        if (t.type === 'constant') { consume(); return { type: 'Constant', name: t.value } }
        if (t.type === 'function') {
            const fn = t.value
            consume()
            const p = peek()
            if (!p || p.type !== 'parenthesis' || p.value !== '(') {
                return { type: 'Reference', name: fn }
            }
            consume()
            const args = []
            if (peek() && !(peek().type === 'parenthesis' && peek().value === ')')) {
                args.push(parseExpression())
                while (peek() && peek().type === 'comma') {
                    consume()
                    args.push(parseExpression())
                }
            }
            if (peek() && peek().type === 'parenthesis' && peek().value === ')') consume()
            return { type: 'Function', name: fn, args }
        }
        if (t.type === 'parenthesis' && t.value === '(') {
            consume()
            const node = parseExpression()
            if (peek() && peek().type === 'parenthesis' && peek().value === ')') consume()
            return { type: 'Group', expr: node }
        }
        consume()
        return { type: 'Reference', name: String(t.value || '') }
    }
    return parseExpression()
}

function astToLatex(node) {
    function wrapParens(s) { return "\\left(" + s + "\\right)" }
    function needsParens(n) { return n && n.type === 'BinaryOp' }
    function latexOf(n) {
        if (!n) return ''
        if (n.type === 'Number') return String(n.value)
        if (n.type === 'Reference') return n.name
        if (n.type === 'Constant') return n.name === 'pi' ? '\\pi' : n.name
        if (n.type === 'UnaryOp') {
            const inner = latexOf(n.expr)
            if (n.expr && (n.expr.type === 'BinaryOp' || n.expr.type === 'Function' || n.expr.type === 'Group')) {
                return '-' + wrapParens(inner)
            } else {
                return '-' + inner
            }
        }
        if (n.type === 'BinaryOp') {
            if (n.op === '/') return '\\frac{' + latexOf(n.left) + '}{' + latexOf(n.right) + '}'
            const sym = n.op === '*' ? '\\cdot' : n.op
            const left = latexOf(n.left)
            const right = latexOf(n.right)
            return left + ' ' + sym + ' ' + right
        }
        if (n.type === 'Group') return wrapParens(latexOf(n.expr))
        if (n.type === 'Function') {
            const nm = n.name
            if (nm === 'sqrt') {
                const arg = latexOf(n.args[0] || { type: 'Number', value: 0 })
                return '\\sqrt{' + arg + '}'
            }
            if (nm === 'pow') {
                const a = n.args[0] ? latexOf(n.args[0]) : ''
                const b = n.args[1] ? latexOf(n.args[1]) : ''
                const base = needsParens(n.args[0]) ? wrapParens(a) : a
                return base + '^{' + b + '}'
            }
            if (nm === 'log') {
                const a = n.args[0] ? latexOf(n.args[0]) : ''
                const b = n.args[1] ? latexOf(n.args[1]) : ''
                return '\\log_{' + b + '}\\left(' + a + '\\right)'
            }
            const one = { sin: '\\sin', cos: '\\cos', tan: '\\tan', ln: '\\ln' }
            if (one[nm]) {
                const arg = latexOf(n.args[0] || { type: 'Number', value: 0 })
                return one[nm] + '\\left(' + arg + '\\right)'
            }
            const joined = n.args.map(a => latexOf(a)).join(',\\,')
            return n.name + '\\left(' + joined + '\\right)'
        }
        return ''
    }
    return latexOf(node)
}

function formatResultLatex(val) {
    if (typeof val !== 'number') {
        const s = String(val)
        return '\\text{' + s.replace(/\\/g, '\\\\').replace(/[{}]/g, '') + '}'
    }
    const s = String(val)
    const absValue = Math.abs(val)
    const integerPartLength = Math.trunc(absValue).toString().length
    const decimalPart = s.split('.')[1]
    if (integerPartLength > 6 || (decimalPart && decimalPart.length > 3)) {
        const expStr = val.toExponential(4).toLowerCase()
        const m = expStr.match(/^(-?\d+(?:\.\d+)?)e([+-]?\d+)$/)
        if (m) {
            return m[1] + ' \\times 10^{' + m[2] + '}'
        }
        return expStr
    }
    return s
}

const latexExpression = computed(() => {
    const tokens = decodeElements(expression.value)
    const ast = parseTokens(tokens)
    const left = astToLatex(ast)
    const right = formatResultLatex(result.value)
    return left + ' = ' + right
})

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

    const output = [];
    const ops = [];

    for (const token of tokens) {
        if (token.type === 'number' || token.type === 'reference' || token.type === 'constant') {
            output.push(token);
            continue;
        }

        if (token.type === 'function') {
            ops.push(token);
            continue;
        }

        if (token.type === 'operator') {
            while (ops.length && ops[ops.length - 1].type === 'operator' && precedence(ops[ops.length - 1].value) >= precedence(token.value)) {
                output.push(ops.pop());
            }
            ops.push(token);
            continue;
        }

        if (token.type === 'comma') {
            while (ops.length && !(ops[ops.length - 1].type === 'parenthesis' && ops[ops.length - 1].value === '(')) {
                output.push(ops.pop());
            }
            continue;
        }

        if (token.type === 'parenthesis') {
            if (token.value === '(') {
                ops.push(token);
            } else {
                while (ops.length && !(ops[ops.length - 1].type === 'parenthesis' && ops[ops.length - 1].value === '(')) {
                    output.push(ops.pop());
                }
                if (ops.length === 0) return 'Error';
                ops.pop();
                if (ops.length && ops[ops.length - 1].type === 'function') {
                    output.push(ops.pop());
                }
            }
            continue;
        }
    }

    while (ops.length) {
        const top = ops[ops.length - 1];
        if (top.type === 'parenthesis' && top.value === '(') return 'Error';
        output.push(ops.pop());
    }

    const stack = [];
    for (const t of output) {
        if (t.type === 'number') {
            stack.push(parseFloat(t.value));
            continue;
        }

        if (t.type === 'reference') {
            const referencedNode = nodeManager.getNodeByHeader(t.value);
            if (referencedNode) {
                const r = referencedNode.result;
                stack.push(typeof r === 'number' ? r : (parseFloat(r) || 0));
            } else {
                stack.push(0);
            }
            continue;
        }

        if (t.type === 'constant') {
            stack.push(Math.PI);
            continue;
        }

        if (t.type === 'operator') {
            if (stack.length < 2) return 'Error';
            const b = stack.pop();
            const a = stack.pop();
            const v = applyOp(t.value, b, a);
            stack.push(v);
            continue;
        }

        if (t.type === 'function') {
            const name = t.value;
            if (name === 'pow' || name === 'log') {
                if (stack.length < 2) return 'Error';
                const b = stack.pop();
                const a = stack.pop();
                if (name === 'pow') {
                    stack.push(Math.pow(a, b));
                } else {
                    const valid = a > 0 && b > 0 && b !== 1;
                    stack.push(valid ? (Math.log(a) / Math.log(b)) : NaN);
                }
            } else if (name === 'sin' || name === 'cos' || name === 'tan' || name === 'sqrt' || name === 'ln') {
                if (stack.length < 1) return 'Error';
                const a = stack.pop();
                if (name === 'sin') stack.push(Math.sin(a));
                else if (name === 'cos') stack.push(Math.cos(a));
                else if (name === 'tan') stack.push(Math.tan(a));
                else if (name === 'sqrt') stack.push(a < 0 ? NaN : Math.sqrt(a));
                else if (name === 'ln') stack.push(a <= 0 ? NaN : Math.log(a));
            } else {
                return 'Error';
            }
            continue;
        }
    }

    if (stack.length === 0) return 0;
    const res = stack[stack.length - 1];
    return isNaN(res) ? 'Error' : res;
}

function updateDependencies() {
    const tokens = decodedElements.value;
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
    
    const tokens = decodedElements.value;
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
            <input class="node-expression-input" v-model="expression" @change="cleanExpression" placeholder="Enter expression here" />
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
.node-latex {
    margin-bottom: 6px;
}
</style>
