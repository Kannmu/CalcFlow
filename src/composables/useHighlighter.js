import { computed } from 'vue'
import { mathRegistry } from '../math/registry.js'

function useHighlighter(expression) {
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function highlightExpressionHtml(expr) {
    if (!expr) return ''
    const e = String(expr)
    let i = 0
    let out = ''
    const isLetter = c => /[a-zA-Z_]/.test(c)
    const isDigit = c => /[0-9]/.test(c)
    while (i < e.length) {
      const c = e[i]
      if (c === ' ' || c === '\t' || c === '\n') {
        out += escapeHtml(c)
        i++
        continue
      }
      if (isDigit(c) || (c === '.' && i + 1 < e.length && isDigit(e[i + 1]))) {
        const start = i
        let hasDot = c === '.'
        i++
        while (i < e.length) {
          const ch = e[i]
          if (isDigit(ch)) { i++; continue }
          if (ch === '.') { if (hasDot) break; hasDot = true; i++; continue }
          break
        }
        const value = e.slice(start, i)
        out += '<span class="hl-number">' + escapeHtml(value) + '</span>'
        continue
      }
      if (isLetter(c)) {
        const start = i
        i++
        while (i < e.length && /[a-zA-Z0-9_]/.test(e[i])) i++
        const ident = e.slice(start, i)
        let j = i
        while (j < e.length && /\s/.test(e[j])) j++
        if (e[j] === '(') {
          out += '<span class="hl-function">' + escapeHtml(ident) + '</span>'
        } else {
          const cdef = mathRegistry.getConstant(ident)
          if (cdef) {
            out += '<span class="hl-constant">' + escapeHtml(ident) + '</span>'
          } else {
            out += '<span class="hl-reference">' + escapeHtml(ident) + '</span>'
          }
        }
        continue
      }
      if ('+-*/^%'.includes(c)) { out += '<span class="hl-operator">' + escapeHtml(c) + '</span>'; i++; continue }
      if (c === '(' || c === ')') { out += '<span class="hl-parenthesis">' + escapeHtml(c) + '</span>'; i++; continue }
      if (c === ',') { out += '<span class="hl-comma">' + escapeHtml(c) + '</span>'; i++; continue }
      out += escapeHtml(c)
      i++
    }
    return out
  }

  const highlightedInputHtml = computed(() => {
    if (!expression.value) return ''
    return highlightExpressionHtml(expression.value)
  })

  return {
    highlightedInputHtml,
  }
}

export { useHighlighter }