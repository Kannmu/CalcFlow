export const WORKSPACE_STORAGE_KEY = 'calcflow_workspace'
export const WORKSPACE_VERSION = 2

const MAX_NODES = 200
const MAX_HEADER_LENGTH = 256
const MAX_EXPRESSION_LENGTH = 10_000

function normalizeText(value, fallback, maxLength) {
  if (value === null || value === undefined) return fallback
  return String(value).slice(0, maxLength)
}

export function normalizeWorkspace(payload) {
  const source = Array.isArray(payload) ? payload : payload?.nodes

  if (!Array.isArray(source)) {
    throw new TypeError('Workspace must contain a node list')
  }

  if (source.length > MAX_NODES) {
    throw new RangeError(`Workspace cannot contain more than ${MAX_NODES} nodes`)
  }

  return source.map((node, index) => ({
    header: normalizeText(node?.header, `Node${index + 1}`, MAX_HEADER_LENGTH) || `Node${index + 1}`,
    expression: normalizeText(node?.expression, '', MAX_EXPRESSION_LENGTH),
  }))
}

export function createWorkspaceDocument(nodes) {
  return {
    version: WORKSPACE_VERSION,
    savedAt: new Date().toISOString(),
    nodes: normalizeWorkspace(nodes),
  }
}

export function readStoredWorkspace(storage = window.localStorage) {
  try {
    const raw = storage.getItem(WORKSPACE_STORAGE_KEY)
    if (!raw) return []
    return normalizeWorkspace(JSON.parse(raw))
  } catch {
    return []
  }
}

export function writeStoredWorkspace(nodes, storage = window.localStorage) {
  try {
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(createWorkspaceDocument(nodes)))
    return true
  } catch {
    return false
  }
}
