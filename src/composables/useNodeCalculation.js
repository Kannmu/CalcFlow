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
            // 同步更新nodeManager
            nodeManager.updateNode(nodeId.value, {
              result: result.value,
              header: editableHeader.value,
            })
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
      // 同步更新nodeManager，避免Vue watch的异步延迟
      nodeManager.updateNode(nodeId.value, {
        result: result.value,
        header: editableHeader.value,
      })
      // 不清除依赖关系，让错误状态在循环中传播
      currentDependencies.value = newDependencies
      return false
    }
    currentDependencies.value = newDependencies
    return true
  }

  async function recalculate() {
    const dependenciesUpdated = updateDependencies()
    const currentExpressionWithDeps = expression.value + JSON.stringify(
      Array.from(currentDependencies.value).map(depId => {
        const depNode = nodeManager.getNode(depId)
        return depNode ? depNode.result : 0
      })
    )
    if (!dependenciesUpdated) {
      // 即使依赖更新失败（如循环依赖），也触发依赖节点更新，让错误状态传播
      // 更新lastExpression以防止缓存过期值
      lastExpression.value = currentExpressionWithDeps
      nodeManager.triggerDependentUpdates(nodeId.value)
      return
    }
    if (lastExpression.value === currentExpressionWithDeps && lastResult.value !== null) {
      result.value = lastResult.value
      return
    }
    const tokens = decodeElementsEngine(expression.value)
    const scope = {}
    for (const token of tokens) {
      if (token.type === 'reference') {
        const n = nodeManager.getNodeByHeader(token.value)
        if (n && (n.result === 'Circular Dependency' || n.result === 'Self Reference' || n.result === 'Error')) {
          // 传播依赖节点的错误状态
          result.value = n.result
          lastExpression.value = currentExpressionWithDeps
          lastResult.value = result.value
          nodeManager.updateNode(nodeId.value, {
            result: result.value,
            header: editableHeader.value,
          })
          nodeManager.triggerDependentUpdates(nodeId.value)
          return
        }
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
    }, 100)
  }

  // 用于新节点注册时同步更新依赖
  function onNewNodeRegistered() {
    // 立即同步更新依赖关系，不延迟
    updateDependencies()
  }

  return {
    currentDependencies,
    updateDependencies,
    recalculate,
    debouncedRecalculate,
    onNewNodeRegistered,
    lastExpression,
    lastResult,
  }
}

export { useNodeCalculation }