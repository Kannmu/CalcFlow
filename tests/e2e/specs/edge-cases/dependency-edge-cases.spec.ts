import { test, expect } from '@playwright/test'
import { BasePage } from '../../pages/BasePage.js'
import { CanvasPage } from '../../pages/CanvasPage.js'
import { NodePage } from '../../pages/NodePage.js'

test.describe('深层依赖链', () => {
  test('10层依赖链', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 创建10个节点，每个依赖前一个
    for (let i = 0; i < 10; i++) {
      await canvas.addNode()
      if (i === 0) {
        await node.setHeader(i, 'A')
        await node.setExpression(i, '1')
      } else {
        const prevHeader = String.fromCharCode(64 + i) // A, B, C, ...
        const currHeader = String.fromCharCode(65 + i) // B, C, D, ...
        await node.setHeader(i, currHeader)
        await node.setExpression(i, `${prevHeader} + 1`)
      }
    }

    // 最后一个节点应该是 10
    await node.expectResult(9, 10)
  })

  test('修改链头触发级联更新', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 创建5层链 A->B->C->D->E
    for (let i = 0; i < 5; i++) {
      await canvas.addNode()
      const header = String.fromCharCode(65 + i)
      await node.setHeader(i, header)
      if (i === 0) {
        await node.setExpression(i, '10')
      } else {
        const prevHeader = String.fromCharCode(64 + i)
        await node.setExpression(i, `${prevHeader} * 2`)
      }
    }

    // E 应该是 10 * 2^4 = 160
    await node.expectResult(4, 160)

    // 修改 A 的值
    await node.setExpression(0, '5')

    // E 应该更新为 5 * 2^4 = 80
    await node.expectResult(4, 80)
  })

  test('菱形依赖结构', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // A
    // |\
    // B C
    // |/
    // D

    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, '10')

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(1, 'A * 2')

    await canvas.addNode()
    await node.setHeader(2, 'C')
    await node.setExpression(2, 'A + 5')

    await canvas.addNode()
    await node.setHeader(3, 'D')
    await node.setExpression(3, 'B + C')

    // D = B + C = (10*2) + (10+5) = 20 + 15 = 35
    await node.expectResult(3, 35)

    // 修改 A
    await node.setExpression(0, '20')

    // D = (20*2) + (20+5) = 40 + 25 = 65
    await node.expectResult(3, 65)
  })

  test('星型依赖结构', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 创建一个中心节点，多个节点引用它
    await canvas.addNode()
    await node.setHeader(0, 'Center')
    await node.setExpression(0, '100')

    for (let i = 1; i <= 5; i++) {
      await canvas.addNode()
      await node.setHeader(i, `Leaf${i}`)
      await node.setExpression(i, `Center / ${i}`)
    }

    // 验证所有叶子节点
    await node.expectResult(1, 100)
    await node.expectResult(2, 50)
    await node.expectResult(3, 33.333)
    await node.expectResult(4, 25)
    await node.expectResult(5, 20)
  })

  test('互相引用导致循环依赖', async ({ page }) => {
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

    // 让 A 引用 B，形成循环
    await node.setExpression(0, 'B * 2')

    // 两个节点都应该报错
    await node.expectError(0)
    await node.expectError(1)
  })

  test('三节点循环依赖', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, 'B + 1')

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(1, 'C + 1')

    await canvas.addNode()
    await node.setHeader(2, 'C')
    await node.setExpression(2, 'A + 1')

    // 所有节点都应该报错
    await node.expectError(0)
    await node.expectError(1)
    await node.expectError(2)
  })

  test('间接循环依赖', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // A -> B -> C -> D -> B (循环)
    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, '1')

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(1, 'A + 1')

    await canvas.addNode()
    await node.setHeader(2, 'C')
    await node.setExpression(2, 'B + 1')

    await canvas.addNode()
    await node.setHeader(3, 'D')
    await node.setExpression(3, 'C + 1')

    // 初始状态正常
    await node.expectResult(3, 4)

    // 让 D 引用 B，形成循环
    await node.setExpression(3, 'B * 2')

    // B, C, D 都应该报错
    await node.expectError(1)
    await node.expectError(2)
    await node.expectError(3)

    // A 不应该报错
    await node.expectResult(0, 1)
  })

  test('解除循环依赖后恢复正常', async ({ page }) => {
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

    // 创建循环
    await node.setExpression(0, 'B * 2')
    await node.expectError(0)
    await node.expectError(1)

    // 解除循环
    await node.setExpression(0, '20')

    // 应该恢复正常
    await node.expectResult(0, 20)
    await node.expectResult(1, 25)
  })

  test('删除被依赖的节点', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, '100')

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(1, 'A + 1')

    await node.expectResult(1, 101)

    // 删除 A
    await page.click('[data-testid="node-delete"]')
    await page.waitForTimeout(200)

    // 现在只有一个节点
    await canvas.expectNodeCount(1)

    // B 应该报错（引用不存在的 A）
    await node.expectError(0)
  })

  test('删除中间节点影响下游', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // A -> B -> C
    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, '10')

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(1, 'A * 2')

    await canvas.addNode()
    await node.setHeader(2, 'C')
    await node.setExpression(2, 'B + 1')

    await node.expectResult(2, 21)

    // 删除 B
    const deleteButtons = await page.locator('[data-testid="node-delete"]').all()
    await deleteButtons[1].click()
    await page.waitForTimeout(200)

    // C 应该报错（引用不存在的 B）
    await node.expectError(1)

    // A 应该正常
    await node.expectResult(0, 10)
  })

  test('重命名节点更新依赖', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setHeader(0, 'X')
    await node.setExpression(0, '100')

    await canvas.addNode()
    await node.setHeader(1, 'Y')
    await node.setExpression(1, 'X + 1')

    await node.expectResult(1, 101)

    // 重命名 X 为 Z
    await node.setHeader(0, 'Z')

    // Y 引用不存在的 X，应该报错
    await node.expectError(1)

    // 更新 Y 的表达式引用 Z
    await node.setExpression(1, 'Z + 1')
    await node.expectResult(1, 101)
  })

  test('错误状态传播', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // A -> B -> C, 让 A 报错
    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, '10')

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(1, 'A * 2')

    await canvas.addNode()
    await node.setHeader(2, 'C')
    await node.setExpression(2, 'B + 1')

    await node.expectResult(2, 21)

    // 让 A 报错
    await node.setExpression(0, '10 / 0')
    await node.expectError(0)

    // 错误应该传播到 B 和 C
    await node.expectError(1)
    await node.expectError(2)
  })

  test('循环依赖错误传播', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // A -> B <-> C (循环)
    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, '10')

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(1, 'A + C')

    await canvas.addNode()
    await node.setHeader(2, 'C')
    await node.setExpression(2, 'B + 1')

    // 所有涉及循环的节点都报错
    await node.expectError(1)
    await node.expectError(2)

    // A 正常
    await node.expectResult(0, 10)
  })

  test('快速连续修改依赖', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, '1')

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(1, 'A + 1')

    // 快速连续修改 A
    const input = node.expressionInputAt(0)
    for (let i = 2; i <= 10; i++) {
      await input.fill(String(i))
      await page.waitForTimeout(50) // 比防抖时间更短
    }

    // 等待防抖完成
    await page.waitForTimeout(200)

    // 最终结果应该是正确的
    await node.expectResult(0, 10)
    await node.expectResult(1, 11)
  })

  test('复杂依赖图', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    //      A
    //     / \
    //    B   C
    //   / \ / \
    //  D   E   F

    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, '10')

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(1, 'A * 2')

    await canvas.addNode()
    await node.setHeader(2, 'C')
    await node.setExpression(2, 'A + 5')

    await canvas.addNode()
    await node.setHeader(3, 'D')
    await node.setExpression(3, 'B + 1')

    await canvas.addNode()
    await node.setHeader(4, 'E')
    await node.setExpression(4, 'B + C')

    await canvas.addNode()
    await node.setHeader(5, 'F')
    await node.setExpression(5, 'C * 2')

    // 验证所有节点
    await node.expectResult(0, 10)
    await node.expectResult(1, 20)
    await node.expectResult(2, 15)
    await node.expectResult(3, 21)
    await node.expectResult(4, 35)
    await node.expectResult(5, 30)
  })

  test('引用不存在的节点', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'NonExistent + 1')

    // 应该使用 0 作为默认值
    await node.expectResult(0, 1)
  })

  test('节点名与函数名冲突', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 创建一个名为 sin 的节点
    await canvas.addNode()
    await node.setHeader(0, 'sin')
    await node.setExpression(0, '10')

    // 另一个节点引用 sin
    await canvas.addNode()
    await node.setExpression(1, 'sin + 5')

    // 应该引用节点 sin，而不是 sin 函数
    await node.expectResult(1, 15)
  })
})
