import { mathRegistry } from './registry.js'

let mathjsLoader = null
let mathjsModule = null

async function loadMathjs() {
  if (mathjsModule) return mathjsModule
  if (!mathjsLoader) {
    mathjsLoader = import('mathjs')
  }
  mathjsModule = await mathjsLoader
  return mathjsModule
}

function decodeElements(expression) {
  if (!expression) return []
  const tokens = []
  const expr = String(expression).trim()
  let i = 0
  const isLetter = c => /[a-zA-Z_]/.test(c)
  const isDigit = c => /[0-9]/.test(c)
  while (i < expr.length) {
    const c = expr[i]
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue }
    if (isDigit(c) || (c === '.' && i + 1 < expr.length && isDigit(expr[i + 1]))) {
      const start = i
      let hasDot = c === '.'
      i++
      while (i < expr.length) {
        const ch = expr[i]
        if (isDigit(ch)) { i++; continue }
        if (ch === '.') { if (hasDot) break; hasDot = true; i++; continue }
        break
      }
      const value = expr.slice(start, i)
      tokens.push({ type: 'number', value })
      continue
    }
    if (isLetter(c)) {
      const start = i
      i++
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) i++
      const ident = expr.slice(start, i)
      let j = i
      while (j < expr.length && /\s/.test(expr[j])) j++
      if (expr[j] === '(') {
        tokens.push({ type: 'function', value: ident.toLowerCase() })
      } else {
        const cdef = mathRegistry.getConstant(ident)
        if (cdef) {
          tokens.push({ type: 'constant', value: ident.toLowerCase() })
        } else {
          tokens.push({ type: 'reference', value: ident })
        }
      }
      continue
    }
    if ('+-*/^%'.includes(c)) { tokens.push({ type: 'operator', value: c }); i++; continue }
    if (c === '(' || c === ')') { tokens.push({ type: 'parenthesis', value: c }); i++; continue }
    if (c === ',') { tokens.push({ type: 'comma', value: ',' }); i++; continue }
    i++
  }
  return tokens
}

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
    let node = parsePower()
    while (true) {
      const t = peek()
      if (t && t.type === 'operator' && (t.value === '*' || t.value === '/' || t.value === '%')) {
        consume()
        const right = parsePower()
        node = { type: 'BinaryOp', op: t.value, left: node, right }
      } else {
        break
      }
    }
    return node
  }
  function parsePower() {
    let node = parseFactor()
    const t = peek()
    if (t && t.type === 'operator' && t.value === '^') {
      consume()
      const right = parsePower()
      node = { type: 'BinaryOp', op: '^', left: node, right }
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
  function isComplexNode(n) { return n && (n.type === 'BinaryOp' || n.type === 'Function' || n.type === 'Group') }
  function latexOf(n) {
    if (!n) return ''
    if (n.type === 'Number') return String(n.value)
    if (n.type === 'Reference') return n.name
    if (n.type === 'Constant') return n.name === 'pi' ? '\\pi' : n.name
    if (n.type === 'UnaryOp') {
      const inner = latexOf(n.expr)
      const def = mathRegistry.getUnaryOperator(n.op)
      if (def) {
        return def.latex({ inner, ctx: { exprNode: n.expr, wrapParens, isComplexNode } })
      }
      if (isComplexNode(n.expr)) {
        return '-' + wrapParens(inner)
      } else {
        return '-' + inner
      }
    }
    if (n.type === 'BinaryOp') {
      const left = latexOf(n.left)
      const right = latexOf(n.right)
      const def = mathRegistry.getOperator(n.op)
      if (def) {
        return def.latex({ left, right, ctx: { leftNode: n.left, rightNode: n.right, wrapParens, needsParens } })
      }
      const sym = n.op === '*' ? '\\cdot' : n.op
      return left + ' ' + sym + ' ' + right
    }
    if (n.type === 'Group') return wrapParens(latexOf(n.expr))
    if (n.type === 'Function') {
      const def = mathRegistry.getFunction(n.name)
      const argsLatex = n.args.map(a => latexOf(a))
      if (def) {
        const ctx = { argsNodes: n.args, wrapParens, needsParens }
        if (def.arity === 1) {
          return def.latex(argsLatex[0] || '', ctx)
        }
        if (def.arity === 2) {
          return def.latex(argsLatex[0] || '', argsLatex[1] || '', ctx)
        }
        return def.latex(...argsLatex, ctx)
      }
      const one = { sin: '\\sin', cos: '\\cos', tan: '\\tan', ln: '\\ln', asin: '\\arcsin', acos: '\\arccos', atan: '\\arctan' }
      if (one[n.name]) {
        const arg = argsLatex[0] || ''
        return one[n.name] + '\\left(' + arg + '\\right)'
      }
      const joined = argsLatex.join(',\\,')
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

function precedence(op) {
  const def = mathRegistry.getOperator(op)
  return def ? def.precedence : 0
}

function isRightAssociative(op) {
  const def = mathRegistry.getOperator(op)
  return def ? def.associativity === 'right' : false
}

function evaluateTokens(tokens, scope) {
  if (!tokens || tokens.length === 0) return 0
  const output = []
  const ops = []
  for (const token of tokens) {
    if (token.type === 'number' || token.type === 'reference' || token.type === 'constant') {
      output.push(token)
      continue
    }
    if (token.type === 'function') {
      ops.push(token)
      continue
    }
    if (token.type === 'operator') {
      while (ops.length && ops[ops.length - 1].type === 'operator') {
        const topOp = ops[ops.length - 1].value
        const pTop = precedence(topOp)
        const pTok = precedence(token.value)
        const rightAssoc = isRightAssociative(token.value)
        if (pTop > pTok || (pTop === pTok && !rightAssoc)) {
          output.push(ops.pop())
        } else {
          break
        }
      }
      ops.push(token)
      continue
    }
    if (token.type === 'comma') {
      while (ops.length && !(ops[ops.length - 1].type === 'parenthesis' && ops[ops.length - 1].value === '(')) {
        output.push(ops.pop())
      }
      continue
    }
    if (token.type === 'parenthesis') {
      if (token.value === '(') {
        ops.push(token)
      } else {
        while (ops.length && !(ops[ops.length - 1].type === 'parenthesis' && ops[ops.length - 1].value === '(')) {
          output.push(ops.pop())
        }
        if (ops.length === 0) return 'Error'
        ops.pop()
        if (ops.length && ops[ops.length - 1].type === 'function') {
          output.push(ops.pop())
        }
      }
      continue
    }
  }
  while (ops.length) {
    const top = ops[ops.length - 1]
    if (top.type === 'parenthesis' && top.value === '(') return 'Error'
    output.push(ops.pop())
  }
  const stack = []
  for (const t of output) {
    if (t.type === 'number') { stack.push(parseFloat(t.value)); continue }
    if (t.type === 'reference') {
      const key = String(t.value)
      const v = scope && Object.prototype.hasOwnProperty.call(scope, key) ? scope[key] : undefined
      const num = typeof v === 'number' ? v : (v != null ? parseFloat(String(v)) : NaN)
      stack.push(isFinite(num) ? num : 0)
      continue
    }
    if (t.type === 'constant') {
      const cdef = mathRegistry.getConstant(t.value)
      const v = cdef && typeof cdef.value !== 'undefined' ? cdef.value : NaN
      stack.push(v)
      continue
    }
    if (t.type === 'operator') {
      if (stack.length < 2) return 'Error'
      const b = stack.pop()
      const a = stack.pop()
      const def = mathRegistry.getOperator(t.value)
      const v = def ? def.compute(a, b) : NaN
      stack.push(v)
      continue
    }
    if (t.type === 'function') {
      const def = mathRegistry.getFunction(t.value)
      if (!def) return 'Error'
      const aCount = typeof def.arity === 'number' ? def.arity : (Array.isArray(def.arity) ? def.arity[0] : 0)
      if (stack.length < aCount) return 'Error'
      const args = []
      for (let i = 0; i < aCount; i++) args.unshift(stack.pop())
      const v = def.compute(...args)
      stack.push(v)
      continue
    }
  }
  if (stack.length === 0) return 0
  const res = stack[stack.length - 1]
  return isNaN(res) ? 'Error' : res
}

async function evaluateExpression(expression, scope) {
  try {
    const { evaluate } = await loadMathjs()
    const v = evaluate(String(expression || ''), scope || {})
    return typeof v === 'number' && isFinite(v) ? v : (typeof v === 'bigint' ? Number(v) : NaN)
  } catch (e) {
    const tokens = decodeElements(expression)
    return evaluateTokens(tokens, scope || {})
  }
}

async function latexFromExpression(expression, result) {
  try {
    const { parse } = await loadMathjs()
    const node = parse(String(expression || ''))
    const left = node ? node.toTex() : ''
    const right = formatResultLatex(result)
    return left + ' = ' + right
  } catch (e) {
    const tokens = decodeElements(expression)
    const ast = parseTokens(tokens)
    const left = astToLatex(ast)
    const right = formatResultLatex(result)
    return left + ' = ' + right
  }
}

export { decodeElements, parseTokens, astToLatex, formatResultLatex, evaluateExpression, latexFromExpression }