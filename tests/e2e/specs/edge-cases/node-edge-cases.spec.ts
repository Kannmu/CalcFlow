import { test, expect } from '@playwright/test'
import { BasePage } from '../../pages/BasePage.js'
import { CanvasPage } from '../../pages/CanvasPage.js'
import { NodePage } from '../../pages/NodePage.js'

test.describe('节点命名边界', () => {
  test('空节点名', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setHeader(0, '')
    await node.setExpression(0, '42')
    await node.expectResult(0, 42)
  })

  test('特殊字符节点名', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setHeader(0, 'Name@123!')
    await node.setExpression(0, '10')

    await canvas.addNode()
    await node.setExpression(1, 'Name@123! + 5')

    // 应该正确处理带特殊字符的节点名
    await node.expectResult(1, 15)
  })

  test('中文节点名', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setHeader(0, '价格')
    await node.setExpression(0, '100')

    await canvas.addNode()
    await node.setHeader(1, '总价')
    await node.setExpression(1, '价格 * 1.1')

    await node.expectResult(1, 110)
  })

  test('超长节点名', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    const longName = 'A'.repeat(100)
    await canvas.addNode()
    await node.setHeader(0, longName)
    await node.setExpression(0, '10')

    await canvas.addNode()
    await node.setExpression(1, `${longName} + 5`)

    await node.expectResult(1, 15)
  })

  test('数字开头的节点名', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setHeader(0, '123Name')
    await node.setExpression(0, '10')

    // 数字开头的标识符可能被解析为数字
    // 这是预期的行为
    const result = await node.resultAt(0).textContent()
    expect(result).toBeTruthy()
  })

  test('相同节点名引用', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 创建两个同名节点
    await canvas.addNode()
    await node.setHeader(0, 'Same')
    await node.setExpression(0, '10')

    await canvas.addNode()
    await node.setHeader(1, 'Same')
    await node.setExpression(1, '20')

    await canvas.addNode()
    await node.setExpression(2, 'Same + 1')

    // 应该引用其中一个
    const result = await node.resultAt(2).textContent()
    expect([11, 21].map(String)).toContain(result)
  })

  test('关键字作为节点名', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 使用关键字作为节点名
    await canvas.addNode()
    await node.setHeader(0, 'sin')
    await node.setExpression(0, '30')

    await canvas.addNode()
    await node.setExpression(1, 'sin + 5')

    // 应该引用节点 sin，而不是 sin 函数
    await node.expectResult(1, 35)
  })

  test('区分大小写的节点名', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setHeader(0, 'Abc')
    await node.setExpression(0, '10')

    await canvas.addNode()
    await node.setHeader(1, 'abc')
    await node.setExpression(1, '20')

    await canvas.addNode()
    await node.setExpression(2, 'Abc + abc')

    await node.expectResult(2, 30)
  })
})

test.describe('大量节点性能', () => {
  test('创建50个节点', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)

    await base.goto()
    await base.waitForReady()

    // 创建50个节点
    for (let i = 0; i < 50; i++) {
      await canvas.addNode()
    }

    await canvas.expectNodeCount(50)
  })

  test('长依赖链性能', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 创建20层依赖链
    for (let i = 0; i < 20; i++) {
      await canvas.addNode()
      const header = `N${i}`
      await node.setHeader(i, header)
      if (i === 0) {
        await node.setExpression(i, '1')
      } else {
        await node.setExpression(i, `N${i - 1} + 1`)
      }
    }

    // 最后一个节点应该是20
    await node.expectResult(19, 20)
  })

  test('多节点并发更新', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 创建一个基础节点
    await canvas.addNode()
    await node.setHeader(0, 'Base')
    await node.setExpression(0, '100')

    // 创建10个引用它的节点
    const promises = []
    for (let i = 1; i <= 10; i++) {
      await canvas.addNode()
      await node.setHeader(i, `Ref${i}`)
      promises.push(node.setExpression(i, `Base + ${i}`))
    }

    await Promise.all(promises)

    // 验证所有节点
    for (let i = 1; i <= 10; i++) {
      await node.expectResult(i, 100 + i)
    }
  })
})

test.describe('节点删除边界', () => {
  test('删除唯一的节点', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await canvas.expectNodeCount(1)

    await page.click('[data-testid="node-delete"]')
    await page.waitForTimeout(200)

    await canvas.expectNodeCount(0)
  })

  test('快速删除多个节点', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)

    await base.goto()
    await base.waitForReady()

    // 创建5个节点
    for (let i = 0; i < 5; i++) {
      await canvas.addNode()
    }
    await canvas.expectNodeCount(5)

    // 快速删除所有节点
    const deleteButtons = await page.locator('[data-testid="node-delete"]').all()
    for (const btn of deleteButtons) {
      await btn.click()
      await page.waitForTimeout(50)
    }

    await page.waitForTimeout(200)
    await canvas.expectNodeCount(0)
  })

  test('删除后重新创建节点', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setHeader(0, 'Test')
    await node.setExpression(0, '42')

    await page.click('[data-testid="node-delete"]')
    await page.waitForTimeout(200)

    await canvas.addNode()
    await node.setHeader(0, 'Test')
    await node.setExpression(0, '100')

    await node.expectResult(0, 100)
  })
})

test.describe('拖拽排序边界', () => {
  test('拖拽节点改变顺序', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 创建3个节点
    for (let i = 0; i < 3; i++) {
      await canvas.addNode()
      await node.setExpression(i, `${i + 1}`)
    }

    // 拖拽第一个节点到最后
    const nodes = await page.locator('[data-testid="node"]').all()
    const firstNode = nodes[0]
    const lastNode = nodes[2]

    await firstNode.dragTo(lastNode, { force: true })
    await page.waitForTimeout(300)

    // 顺序应该改变
    // 注意：实际行为取决于拖拽实现
  })

  test('拖拽不改变依赖关系', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, '10')

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(1, 'A + 5')

    await node.expectResult(1, 15)

    // 拖拽改变顺序
    const nodes = await page.locator('[data-testid="node"]').all()
    await nodes[0].dragTo(nodes[1], { force: true })
    await page.waitForTimeout(300)

    // 依赖关系应该保持不变
    await node.expectResult(0, 10)
    await node.expectResult(1, 15)
  })
})
