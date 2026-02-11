import { test, expect } from '@playwright/test'
import { BasePage } from '../../pages/BasePage.js'
import { CanvasPage } from '../../pages/CanvasPage.js'
import { NodePage } from '../../pages/NodePage.js'
import { AppPage } from '../../pages/AppPage.js'

test.describe('导入边界情况', () => {
  test('导入空JSON数组', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    await app.setImportFile({
      name: 'empty.json',
      mimeType: 'application/json',
      buffer: Buffer.from('[]')
    })

    await canvas.expectNodeCount(0)
  })

  test('导入空对象数组', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    await app.setImportFile({
      name: 'empty-objects.json',
      mimeType: 'application/json',
      buffer: Buffer.from('[{}, {}, {}]')
    })

    await canvas.expectNodeCount(3)
  })

  test('导入缺少header字段', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    await app.setImportFile({
      name: 'missing-header.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify([{ expression: '10 + 5' }]))
    })

    await canvas.expectNodeCount(1)
    await node.expectResult(0, 15)
  })

  test('导入缺少expression字段', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    await app.setImportFile({
      name: 'missing-expression.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify([{ header: 'Test' }]))
    })

    await canvas.expectNodeCount(1)
    await node.expectResult(0, 0)
  })

  test('导入包含循环依赖的工作区', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    const circularWorkspace = [
      { header: 'A', expression: 'B + 1' },
      { header: 'B', expression: 'A + 1' }
    ]

    await app.setImportFile({
      name: 'circular.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(circularWorkspace))
    })

    await canvas.expectNodeCount(2)
    await node.expectError(0)
    await node.expectError(1)
  })

  test('导入包含深层依赖的工作区', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    const deepWorkspace = [
      { header: 'A', expression: '1' },
      { header: 'B', expression: 'A + 1' },
      { header: 'C', expression: 'B + 1' },
      { header: 'D', expression: 'C + 1' },
      { header: 'E', expression: 'D + 1' }
    ]

    await app.setImportFile({
      name: 'deep.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(deepWorkspace))
    })

    await canvas.expectNodeCount(5)
    await node.expectResult(4, 5)
  })

  test('导入包含特殊字符的节点名', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    const specialWorkspace = [
      { header: 'Name with spaces', expression: '10' },
      { header: 'Name@#$', expression: '20' },
      { header: '中文', expression: '30' }
    ]

    await app.setImportFile({
      name: 'special.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(specialWorkspace))
    })

    await canvas.expectNodeCount(3)
  })

  test('导入无效JSON格式', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    await app.setImportFile({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"invalid: json}')
    })

    // 应该显示错误提示，节点数不变
    await canvas.expectNodeCount(0)
  })

  test('导入非数组JSON', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    await app.setImportFile({
      name: 'object.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"header": "A", "expression": "10"}')
    })

    // 非数组应该报错
    await canvas.expectNodeCount(0)
  })

  test('导入超大工作区', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    // 创建50个节点的工作区
    const largeWorkspace = []
    for (let i = 0; i < 50; i++) {
      largeWorkspace.push({
        header: `Node${i}`,
        expression: i === 0 ? '1' : `Node${i - 1} + 1`
      })
    }

    await app.clickImport()
    await app.setImportFile({
      name: 'large.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(largeWorkspace))
    })

    await canvas.expectNodeCount(50)
    await node.expectResult(49, 50)
  })

  test('导入嵌套引用', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    const nestedWorkspace = [
      { header: 'A', expression: '10' },
      { header: 'B', expression: 'sin(A) + cos(A)' },
      { header: 'C', expression: 'pow(B, 2)' },
      { header: 'D', expression: 'sqrt(C + 1)' }
    ]

    await app.setImportFile({
      name: 'nested.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(nestedWorkspace))
    })

    await canvas.expectNodeCount(4)

    // 验证计算链
    const a = 10
    const b = Math.sin(a) + Math.cos(a)
    const c = Math.pow(b, 2)
    const d = Math.sqrt(c + 1)

    const resultText = await node.resultAt(3).textContent()
    const result = parseFloat(resultText || '0')
    expect(Math.abs(result - d) < 0.001).toBeTruthy()
  })

  test('导入包含错误表达式的工作区', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    const errorWorkspace = [
      { header: 'Good', expression: '10' },
      { header: 'Bad', expression: '10 / 0' },
      { header: 'RefBad', expression: 'Bad + 1' }
    ]

    await app.setImportFile({
      name: 'error.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(errorWorkspace))
    })

    await canvas.expectNodeCount(3)
    await node.expectResult(0, 10)
    await node.expectError(1)
    await node.expectError(2)
  })

  test('导入后修改表达式', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    const workspace = [
      { header: 'A', expression: '10' },
      { header: 'B', expression: 'A + 5' }
    ]

    await app.setImportFile({
      name: 'test.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(workspace))
    })

    await node.expectResult(1, 15)

    // 修改导入的表达式
    await node.setExpression(0, '20')
    await node.expectResult(1, 25)
  })

  test('导入空文件', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    await app.setImportFile({
      name: 'empty.json',
      mimeType: 'application/json',
      buffer: Buffer.from('')
    })

    await canvas.expectNodeCount(0)
  })

  test('导入包含null值', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    await app.setImportFile({
      name: 'null.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify([{ header: null, expression: null }]))
    })

    await canvas.expectNodeCount(1)
  })

  test('导入包含undefined字符串', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    await app.setImportFile({
      name: 'undefined.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify([{ header: 'undefined', expression: 'undefined + 1' }]))
    })

    await canvas.expectNodeCount(1)
    // undefined 应该被视为 0
    await node.expectResult(0, 1)
  })
})

test.describe('导出边界情况', () => {
  test('导出空工作区', async ({ page }) => {
    const base = new BasePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      app.clickExport()
    ])

    expect(download.suggestedFilename()).toBe('calcflow_workspace.json')
  })

  test('导出包含错误节点', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '10 / 0')
    await node.expectError(0)

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      app.clickExport()
    ])

    expect(download.suggestedFilename()).toBe('calcflow_workspace.json')
  })

  test('导出包含循环依赖', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, 'B + 1')

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(1, 'A + 1')

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      app.clickExport()
    ])

    expect(download.suggestedFilename()).toBe('calcflow_workspace.json')
  })
})

test.describe('导入导出一致性', () => {
  test('导出后导入保持一致性', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    // 创建工作区
    await canvas.addNode()
    await node.setHeader(0, 'X')
    await node.setExpression(0, '10')

    await canvas.addNode()
    await node.setHeader(1, 'Y')
    await node.setExpression(1, 'X * 2')

    await node.expectResult(1, 20)

    // 导出
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      app.clickExport()
    ])

    // 清空
    await app.clickClean()
    await canvas.expectNodeCount(0)

    // 重新加载页面以确保干净状态
    await base.goto()
    await base.waitForReady()

    // 导入
    await app.clickImport()

    // 读取下载的文件内容
    const path = await download.path()
    const fs = require('fs')
    const content = fs.readFileSync(path, 'utf8')

    await app.setImportFile({
      name: 'calcflow_workspace.json',
      mimeType: 'application/json',
      buffer: Buffer.from(content)
    })

    await canvas.expectNodeCount(2)
    await node.expectResult(1, 20)
  })
})
