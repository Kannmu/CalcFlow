import { ref } from 'vue'
import { nodeManager } from '../utils.js'
import { decodeElements as decodeElementsEngine, evaluateExpression } from '../math/expression-engine.js'

function useNodeCalculation({ expression, editableHeader, nodeId, result }) {
  const currentDependencies = ref(new Set())
  const lastExpression = ref('')
  const lastResult = ref(null)
  let recalculateTimer = null
  let disposed = false
  const seenReferenceHeaders = new Set()
  const reservedMissingValues = new Set(['undefined', 'null', 'nan', 'infinity', 'true', 'false'])

  function getKnownHeaders() {
    return Array.from(nodeManager.nodes.values()).map(node => node.header).filter(Boolean)
  }

  function updateDependencies() {
    const tokens = decodeElementsEngine(expression.value, getKnownHeaders())
    const newDependencies = new Set()
    for (const token of tokens) {
      if (token.type === 'reference') {
        if (reservedMissingValues.has(String(token.value).toLowerCase())) continue
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
          seenReferenceHeaders.add(token.value)
          newDependencies.add(referencedNode.nodeId)
        } else if (seenReferenceHeaders.has(token.value)) {
          result.value = 'Error'
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
    const expressionAtStart = expression.value
    if (!String(expression.value || '').trim()) {
      result.value = 0
      lastExpression.value = ''
      lastResult.value = 0
      nodeManager.updateNode(nodeId.value, {
        result: 0,
        header: editableHeader.value,
      })
      nodeManager.triggerDependentUpdates(nodeId.value)
      return
    }
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
      const dependencyStateChanged = lastExpression.value !== currentExpressionWithDeps
      lastExpression.value = currentExpressionWithDeps
      if (dependencyStateChanged) nodeManager.triggerDependentUpdates(nodeId.value)
      return
    }
    if (lastExpression.value === currentExpressionWithDeps && lastResult.value !== null) {
      result.value = lastResult.value
      return
    }
    const knownHeaders = getKnownHeaders()
    const tokens = decodeElementsEngine(expression.value, knownHeaders)
    const scope = {}
    for (const token of tokens) {
      if (token.type === 'reference') {
        if (reservedMissingValues.has(String(token.value).toLowerCase())) {
          scope[token.value] = 0
          continue
        }
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
        if (n) scope[token.value] = n.result
      }
    }
    const calculatedResult = await evaluateExpression(expression.value, scope, knownHeaders)
    if (disposed || expressionAtStart !== expression.value) return
    if (calculatedResult === 'Error' || isNaN(calculatedResult)) {
      result.value = 'Error'
    } else {
      result.value = Number.isFinite(calculatedResult) && Math.abs(calculatedResult) < Number.MAX_SAFE_INTEGER / 1e9
        ? Math.round(calculatedResult * 1e9) / 1e9
        : calculatedResult
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
    if (disposed) return
    if (recalculateTimer) clearTimeout(recalculateTimer)
    recalculateTimer = setTimeout(() => {
      recalculate()
    }, 20)
  }

  // 用于新节点注册时同步更新依赖
  function onNewNodeRegistered() {
    recalculate()
  }

  function disposeCalculation() {
    disposed = true
    if (recalculateTimer) clearTimeout(recalculateTimer)
  }

  return {
    currentDependencies,
    updateDependencies,
    recalculate,
    debouncedRecalculate,
    onNewNodeRegistered,
    disposeCalculation,
    lastExpression,
    lastResult,
  }
}

export { useNodeCalculation }
