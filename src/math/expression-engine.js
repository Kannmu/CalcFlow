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

function decodeElements(expression, referenceNames = []) {
  if (!expression) return []
  const tokens = []
  const expr = String(expression).trim()
  const knownReferences = [...new Set(referenceNames.filter(Boolean).map(String))]
    .sort((a, b) => b.length - a.length)
  let i = 0
  const isLetter = c => /[a-zA-Z_]/.test(c)
  const isDigit = c => /[0-9]/.test(c)
  const isIdentifierPart = c => Boolean(c && /[a-zA-Z0-9_]/.test(c))
  const matchKnownReference = (offset) => knownReferences.find((name) => {
    if (!expr.startsWith(name, offset)) return false
    const before = expr[offset - 1]
    const after = expr[offset + name.length]
    if (isIdentifierPart(name[0]) && isIdentifierPart(before)) return false
    if (isIdentifierPart(name[name.length - 1]) && isIdentifierPart(after)) return false
    if (isIdentifierPart(name[0]) && expr.slice(offset + name.length).trimStart().startsWith('(')) return false
    return true
  })
  while (i < expr.length) {
    const c = expr[i]
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue }
    const knownReference = matchKnownReference(i)
    if (knownReference) {
      tokens.push({ type: 'reference', value: knownReference })
      i += knownReference.length
      continue
    }
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
      if ((expr[i] === 'e' || expr[i] === 'E') && (isDigit(expr[i + 1]) || ((expr[i + 1] === '+' || expr[i + 1] === '-') && isDigit(expr[i + 2])))) {
        i++
        if (expr[i] === '+' || expr[i] === '-') i++
        while (i < expr.length && isDigit(expr[i])) i++
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
  let previousToken = null
  for (const rawToken of tokens) {
    const isUnaryMinus = rawToken.type === 'operator' && rawToken.value === '-' && (
      !previousToken ||
      previousToken.type === 'operator' ||
      previousToken.type === 'unary' ||
      previousToken.type === 'comma' ||
      (previousToken.type === 'parenthesis' && previousToken.value === '(')
    )
    const token = isUnaryMinus ? { type: 'unary', value: '-' } : rawToken
    if (token.type === 'number' || token.type === 'reference' || token.type === 'constant') {
      output.push(token)
      previousToken = token
      continue
    }
    if (token.type === 'function') {
      ops.push({ ...token })
      previousToken = token
      continue
    }
    if (token.type === 'unary') {
      ops.push(token)
      previousToken = token
      continue
    }
    if (token.type === 'operator') {
      while (ops.length && (ops[ops.length - 1].type === 'operator' || ops[ops.length - 1].type === 'unary')) {
        const topToken = ops[ops.length - 1]
        const pTop = topToken.type === 'unary' ? 4 : precedence(topToken.value)
        const pTok = precedence(token.value)
        const rightAssoc = isRightAssociative(token.value)
        if (pTop > pTok || (pTop === pTok && !rightAssoc)) {
          output.push(ops.pop())
        } else {
          break
        }
      }
      ops.push(token)
      previousToken = token
      continue
    }
    if (token.type === 'comma') {
      let openingIndex = ops.length - 1
      while (openingIndex >= 0 && !(ops[openingIndex].type === 'parenthesis' && ops[openingIndex].value === '(')) {
        openingIndex--
      }
      if (
        openingIndex < 1 ||
        ops[openingIndex - 1].type !== 'function' ||
        !previousToken ||
        previousToken.type === 'comma' ||
        (previousToken.type === 'parenthesis' && previousToken.value === '(')
      ) {
        return 'Error'
      }
      while (ops.length - 1 > openingIndex) {
        output.push(ops.pop())
      }
      ops[openingIndex].argumentCount++
      previousToken = token
      continue
    }
    if (token.type === 'parenthesis') {
      if (token.value === '(') {
        const isFunctionCall = previousToken && previousToken.type === 'function'
        ops.push({ ...token, isFunctionCall, argumentCount: 0 })
      } else {
        while (ops.length && !(ops[ops.length - 1].type === 'parenthesis' && ops[ops.length - 1].value === '(')) {
          output.push(ops.pop())
        }
        if (ops.length === 0) return 'Error'
        const opening = ops.pop()
        if (opening.isFunctionCall) {
          if (!previousToken || previousToken.type === 'comma') return 'Error'
          const hasArguments = !(previousToken.type === 'parenthesis' && previousToken.value === '(')
          const argumentCount = hasArguments ? opening.argumentCount + 1 : 0
          if (!ops.length || ops[ops.length - 1].type !== 'function') return 'Error'
          output.push({ ...ops.pop(), argumentCount })
        }
      }
      previousToken = token
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
    if (t.type === 'unary') {
      if (stack.length < 1) return 'Error'
      const value = stack.pop()
      const def = mathRegistry.getUnaryOperator(t.value)
      stack.push(def ? def.compute(value) : NaN)
      continue
    }
    if (t.type === 'function') {
      const def = mathRegistry.getFunction(t.value)
      if (!def) return 'Error'
      const requiredArgumentCount = typeof def.arity === 'number' ? def.arity : (Array.isArray(def.arity) ? def.arity[0] : 0)
      const providedArgumentCount = Number.isInteger(t.argumentCount) ? t.argumentCount : requiredArgumentCount
      if (providedArgumentCount < requiredArgumentCount || stack.length < providedArgumentCount) return 'Error'
      const providedArgs = stack.splice(stack.length - providedArgumentCount, providedArgumentCount)
      const v = def.compute(...providedArgs.slice(0, requiredArgumentCount))
      stack.push(v)
      continue
    }
  }
  if (stack.length === 0) return 0
  if (stack.length !== 1) return 'Error'
  const res = stack[stack.length - 1]
  return isNaN(res) ? 'Error' : res
}

async function evaluateExpression(expression, scope, referenceNames = Object.keys(scope || {})) {
  const tokens = decodeElements(expression, referenceNames)
  const customResult = evaluateTokens(tokens, scope || {})
  const reservedValues = new Set(['undefined', 'null', 'nan', 'infinity', 'true', 'false'])
  if (
    tokens.length === 1 &&
    tokens[0].type === 'reference' &&
    !Object.prototype.hasOwnProperty.call(scope || {}, tokens[0].value) &&
    !reservedValues.has(String(tokens[0].value).toLowerCase())
  ) {
    return 'Error'
  }
  const normalizedSource = String(expression || '').replace(/\s/g, '').toLowerCase()
  const normalizedTokens = tokens.map(token => token.value).join('').toLowerCase()
  if (customResult !== 'Error' || normalizedSource === normalizedTokens) return customResult
  try {
    const { evaluate } = await loadMathjs()
    const v = evaluate(String(expression || ''), scope || {})
    return typeof v === 'number' && isFinite(v) ? v : (typeof v === 'bigint' ? Number(v) : NaN)
  } catch (e) {
    return customResult
  }
}

async function latexFromExpression(expression, result, referenceNames = []) {
  const source = String(expression || '')
  const tokens = decodeElements(source, referenceNames)
  const normalizedSource = source.replace(/\s/g, '').toLowerCase()
  const normalizedTokens = tokens.map(token => token.value).join('').toLowerCase()
  if (tokens.length && normalizedSource === normalizedTokens) {
    const left = astToLatex(parseTokens(tokens))
    if (left) return left + ' = ' + formatResultLatex(result)
  }

  try {
    const { parse } = await loadMathjs()
    const node = parse(source)
    const left = node ? node.toTex() : ''
    const right = formatResultLatex(result)
    return left + ' = ' + right
  } catch (e) {
    const ast = parseTokens(tokens)
    const left = astToLatex(ast)
    const right = formatResultLatex(result)
    return left + ' = ' + right
  }
}

export { decodeElements, parseTokens, astToLatex, formatResultLatex, evaluateExpression, latexFromExpression }
