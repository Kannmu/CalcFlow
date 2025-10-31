

import { ref, reactive } from 'vue'

class NodeManager {
    constructor() {
        this.nodes = reactive(new Map())
        this.dependencyGraph = reactive(new Map())
        this.reverseDependencyGraph = reactive(new Map())
    }

    registerNode(nodeId, nodeData) {
        this.nodes.set(nodeId, nodeData)
        if (!this.dependencyGraph.has(nodeId)) {
            this.dependencyGraph.set(nodeId, new Set())
        }
        if (!this.reverseDependencyGraph.has(nodeId)) {
            this.reverseDependencyGraph.set(nodeId, new Set())
        }
    }

    unregisterNode(nodeId) {
        const dependents = this.dependencyGraph.get(nodeId) || new Set()
        const dependencies = this.reverseDependencyGraph.get(nodeId) || new Set()

        dependents.forEach(dependentId => {
            const deps = this.reverseDependencyGraph.get(dependentId)
            if (deps) {
                deps.delete(nodeId)
            }
        })

        dependencies.forEach(dependencyId => {
            const deps = this.dependencyGraph.get(dependencyId)
            if (deps) {
                deps.delete(nodeId)
            }
        })

        this.nodes.delete(nodeId)
        this.dependencyGraph.delete(nodeId)
        this.reverseDependencyGraph.delete(nodeId)
    }

    updateNode(nodeId, nodeData) {
        if (this.nodes.has(nodeId)) {
            this.nodes.set(nodeId, { ...this.nodes.get(nodeId), ...nodeData })
        }
    }

    getNode(nodeId) {
        return this.nodes.get(nodeId)
    }

    getNodeByHeader(header) {
        for (const [nodeId, nodeData] of this.nodes.entries()) {
            if (nodeData.header === header) {
                return { nodeId, ...nodeData }
            }
        }
        return null
    }

    addDependency(dependentNodeId, dependencyNodeId) {
        if (!this.dependencyGraph.has(dependencyNodeId)) {
            this.dependencyGraph.set(dependencyNodeId, new Set())
        }
        if (!this.reverseDependencyGraph.has(dependentNodeId)) {
            this.reverseDependencyGraph.set(dependentNodeId, new Set())
        }

        this.dependencyGraph.get(dependencyNodeId).add(dependentNodeId)
        this.reverseDependencyGraph.get(dependentNodeId).add(dependencyNodeId)
    }

    removeDependency(dependentNodeId, dependencyNodeId) {
        const dependents = this.dependencyGraph.get(dependencyNodeId)
        if (dependents) {
            dependents.delete(dependentNodeId)
        }

        const dependencies = this.reverseDependencyGraph.get(dependentNodeId)
        if (dependencies) {
            dependencies.delete(dependencyNodeId)
        }
    }

    getDependents(nodeId) {
        return Array.from(this.dependencyGraph.get(nodeId) || [])
    }

    getDependencies(nodeId) {
        return Array.from(this.reverseDependencyGraph.get(nodeId) || [])
    }

    detectCircularDependency(nodeId, visited = new Set(), recursionStack = new Set()) {
        if (recursionStack.has(nodeId)) {
            return true
        }
        if (visited.has(nodeId)) {
            return false
        }

        visited.add(nodeId)
        recursionStack.add(nodeId)

        const dependencies = this.reverseDependencyGraph.get(nodeId) || new Set()
        for (const depId of dependencies) {
            if (this.detectCircularDependency(depId, visited, recursionStack)) {
                return true
            }
        }

        recursionStack.delete(nodeId)
        return false
    }

    getTopologicalOrder() {
        const visited = new Set()
        const stack = []

        const dfs = (nodeId) => {
            if (visited.has(nodeId)) return
            visited.add(nodeId)

            const dependencies = this.reverseDependencyGraph.get(nodeId) || new Set()
            for (const depId of dependencies) {
                dfs(depId)
            }
            stack.push(nodeId)
        }

        for (const nodeId of this.nodes.keys()) {
            if (!visited.has(nodeId)) {
                dfs(nodeId)
            }
        }

        return stack
    }

    triggerDependentUpdates(nodeId) {
        const visited = new Set()
        const stack = [nodeId]
        while (stack.length) {
            const curr = stack.pop()
            const deps = this.dependencyGraph.get(curr) || new Set()
            for (const d of deps) {
                if (!visited.has(d)) {
                    visited.add(d)
                    stack.push(d)
                }
            }
        }
        visited.delete(nodeId)
        const closure = Array.from(visited)
        const order = this.getTopologicalOrder()
        const sorted = closure.sort((a, b) => order.indexOf(a) - order.indexOf(b))
        const updateCallbacks = []
        sorted.forEach(id => {
            const node = this.getNode(id)
            if (node && node.updateCallback) {
                updateCallbacks.push(() => node.updateCallback())
            }
        })
        Promise.resolve().then(() => {
            updateCallbacks.forEach(fn => fn())
        })
    }
}

export const nodeManager = new NodeManager()

export function generateRandomColor(str, saturation, lightness) {
    let hash = 0;
    if (str.length === 0) return '#ffffff';
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }

    const hue = Math.abs(hash) % 360;

    const sat_variation = (Math.abs(hash) >> 8) % 21 - 10;
    const light_variation = (Math.abs(hash) >> 16) % 31 - 15;

    const new_saturation = Math.max(20, Math.min(60, saturation + sat_variation));
    const new_lightness = Math.max(70, Math.min(80, lightness + light_variation));

    const s = new_saturation / 100;
    const l = new_lightness / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= hue && hue < 60) {
        r = c; g = x; b = 0;
    } else if (60 <= hue && hue < 120) {
        r = x; g = c; b = 0;
    } else if (120 <= hue && hue < 180) {
        r = 0; g = c; b = x;
    } else if (180 <= hue && hue < 240) {
        r = 0; g = x; b = c;
    } else if (240 <= hue && hue < 300) {
        r = x; g = 0; b = c;
    } else if (300 <= hue && hue < 360) {
        r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    b = Math.round((b + m) * 255).toString(16).padStart(2, '0');

    return `#${r}${g}${b}`;
}