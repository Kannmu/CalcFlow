import { ref } from 'vue'
import { nodeManager } from '../utils.js'
import { decodeElements as decodeElementsEngine, evaluateExpression } from '../math/expression-engine.js'

function useNodeCalculation({ expression, editableHeader, nodeId, result }) {
  const currentDependencies = ref(new Set())
  const lastExpression = ref('')
  const lastResult = ref(null)
  let recalculateTimer = null

  function updateDependencies() {
    const tokens = decodeElementsEngine(expression.value)
    const newDependencies = new Set()
    for (const token of tokens) {
      if (token.type === 'reference') {
        const referencedNode = nodeManager.getNodeByHeader(token.value)
        if (referencedNode) {
          if (referencedNode.nodeId === nodeId.value) {
            result.value = 'Self Reference'
            currentDependencies.value.forEach(depNodeId => {
              nodeManager.removeDependency(nodeId.value, depNodeId)
            })
            currentDependencies.value.clear()
            return false
          }
          newDependencies.add(referencedNode.nodeId)
        }
      }
    }
    currentDependencies.value.forEach(depNodeId => {
      nodeManager.removeDependency(nodeId.value, depNodeId)
    })
    newDependencies.forEach(depNodeId => {
      nodeManager.addDependency(nodeId.value, depNodeId)
    })
    if (nodeManager.detectCircularDependency(nodeId.value)) {
      result.value = 'Circular Dependency'
      newDependencies.forEach(depNodeId => {
        nodeManager.removeDependency(nodeId.value, depNodeId)
      })
      currentDependencies.value.clear()
      return false
    }
    currentDependencies.value = newDependencies
    return true
  }

  async function recalculate() {
    const dependenciesUpdated = updateDependencies()
    if (!dependenciesUpdated) return
    const currentExpressionWithDeps = expression.value + JSON.stringify(
      Array.from(currentDependencies.value).map(depId => {
        const depNode = nodeManager.getNode(depId)
        return depNode ? depNode.result : 0
      })
    )
    if (lastExpression.value === currentExpressionWithDeps && lastResult.value !== null) {
      result.value = lastResult.value
      return
    }
    const tokens = decodeElementsEngine(expression.value)
    const scope = {}
    for (const token of tokens) {
      if (token.type === 'reference') {
        const n = nodeManager.getNodeByHeader(token.value)
        scope[token.value] = n ? n.result : 0
      }
    }
    const calculatedResult = await evaluateExpression(expression.value, scope)
    if (calculatedResult === 'Error' || isNaN(calculatedResult)) {
      result.value = 'Error'
    } else {
      result.value = Math.round(calculatedResult * 1e6) / 1e6
    }
    lastExpression.value = currentExpressionWithDeps
    lastResult.value = result.value
    nodeManager.updateNode(nodeId.value, {
      result: result.value,
      header: editableHeader.value,
    })
    nodeManager.triggerDependentUpdates(nodeId.value)
  }

  function debouncedRecalculate() {
    if (recalculateTimer) clearTimeout(recalculateTimer)
    recalculateTimer = setTimeout(() => {
      recalculate()
    }, 50)
  }

  return {
    currentDependencies,
    updateDependencies,
    recalculate,
    debouncedRecalculate,
    lastExpression,
    lastResult,
  }
}

export { useNodeCalculation }