import { ref, computed, nextTick } from 'vue'
import { nodeManager } from '../utils.js'
import { mathRegistry } from '../math/registry.js'

function useAutocomplete(expression, expressionInputRef) {
  const suggestionsOpen = ref(false)
  const suggestionItems = ref([])
  const selectedSuggestionIndex = ref(0)

  const functionNames = computed(() => {
    return typeof mathRegistry.functionNames === 'function' ? mathRegistry.functionNames() : []
  })
  const constantNames = computed(() => {
    return typeof mathRegistry.constantNames === 'function' ? mathRegistry.constantNames() : []
  })
  const nodeHeaders = computed(() => {
    const headers = []
    for (const node of nodeManager.nodes.values()) {
      const h = node.header
      if (typeof h === 'string' && h) headers.push(h)
    }
    return Array.from(new Set(headers))
  })

  function currentPrefix() {
    const el = expressionInputRef.value
    const pos = el ? el.selectionStart : String(expression.value || '').length
    const before = String(expression.value || '').slice(0, pos)
    const m = before.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/)
    return m ? m[1] : ''
  }

  function buildSuggestions(prefix) {
    const p = String(prefix || '').toLowerCase()
    if (!p) {
      suggestionItems.value = []
      suggestionsOpen.value = false
      return
    }
    const fItems = functionNames.value.filter(n => n.toLowerCase().startsWith(p)).map(n => ({ label: n, type: 'function' }))
    const cItems = constantNames.value.filter(n => n.toLowerCase().startsWith(p)).map(n => ({ label: n, type: 'constant' }))
    const nItems = nodeHeaders.value.filter(h => h.toLowerCase().startsWith(p)).map(h => ({ label: h, type: 'node' }))
    const merged = [...fItems, ...cItems, ...nItems]
    suggestionItems.value = merged.slice(0, 8)
    selectedSuggestionIndex.value = 0
    suggestionsOpen.value = suggestionItems.value.length > 0
  }

  function applySuggestionAt(index) {
    const item = suggestionItems.value[index]
    if (!item) return
    const el = expressionInputRef.value
    const pos = el ? el.selectionStart : String(expression.value || '').length
    const before = String(expression.value || '').slice(0, pos)
    const after = String(expression.value || '').slice(pos)
    const m = before.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/)
    const start = m ? before.lastIndexOf(m[1]) : pos
    const newBefore = m ? before.slice(0, start) + item.label : before + item.label
    let newValue = newBefore + after
    if (item.type === 'function') {
      const def = mathRegistry.getFunction(item.label)
      const aCount = def && typeof def.arity === 'number' ? def.arity : (def && Array.isArray(def.arity) ? def.arity[0] : 1)
      const placeholder = aCount > 1 ? '( , )' : '( )'
      const labelEndPos = (m ? start + item.label.length : pos + item.label.length)
      const tail = newValue.slice(labelEndPos)
      let applied = false
      if (tail.startsWith('(')) {
        const mm = tail.match(/^\(\s*\)/)
        if (mm) {
          newValue = newValue.slice(0, labelEndPos) + placeholder + tail.slice(mm[0].length)
          applied = true
        }
      } else {
        newValue = newValue.slice(0, labelEndPos) + placeholder + tail
        applied = true
      }
      if (applied) {
        nextTick(() => {
          const input = expressionInputRef.value
          if (input) {
            const caret = labelEndPos + 1
            input.setSelectionRange(caret, caret)
          }
        })
      }
    }
    expression.value = newValue
    suggestionsOpen.value = false
  }

  function onExpressionInput() {
    buildSuggestions(currentPrefix())
  }
  function onExpressionFocus() {
    buildSuggestions(currentPrefix())
  }
  function onExpressionBlur() {
    suggestionsOpen.value = false
  }
  function onExpressionKeydown(e) {
    if (e.key === 'Tab' && !suggestionsOpen.value) {
      const input = expressionInputRef.value
      const pos = input ? input.selectionStart : 0
      const s = String(expression.value || '')
      const lp = s.lastIndexOf('(', pos)
      if (lp !== -1) {
        const comma = s.indexOf(',', lp)
        const close = s.indexOf(')', lp)
        if (close !== -1) {
          if (comma !== -1 && pos <= comma) {
            e.preventDefault()
            nextTick(() => {
              const el2 = expressionInputRef.value
              if (el2) {
                const target = comma + 2
                el2.setSelectionRange(target, target)
              }
            })
            return
          }
          if (pos <= close) {
            e.preventDefault()
            nextTick(() => {
              const el3 = expressionInputRef.value
              if (el3) {
                const target = close + 1
                el3.setSelectionRange(target, target)
              }
            })
            return
          }
        }
      }
    }
    if (!suggestionsOpen.value) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (selectedSuggestionIndex.value < suggestionItems.value.length - 1) selectedSuggestionIndex.value++
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (selectedSuggestionIndex.value > 0) selectedSuggestionIndex.value--
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      applySuggestionAt(selectedSuggestionIndex.value)
      return
    }
    if (e.key === 'Escape') {
      suggestionsOpen.value = false
      return
    }
  }

  return {
    suggestionsOpen,
    suggestionItems,
    selectedSuggestionIndex,
    onExpressionInput,
    onExpressionFocus,
    onExpressionBlur,
    onExpressionKeydown,
    applySuggestionAt,
  }
}

export { useAutocomplete }