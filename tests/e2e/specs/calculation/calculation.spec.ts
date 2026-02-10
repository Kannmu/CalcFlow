import { test } from '@playwright/test'
import { BasePage } from '../../pages/BasePage.js'
import { CanvasPage } from '../../pages/CanvasPage.js'
import { NodePage } from '../../pages/NodePage.js'
import { testData } from '../../fixtures/testData.js'

test.describe('计算与依赖', () => {
  test('新建节点并输入表达式得到正确结果', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, testData.expressionA)
    await node.expectResult(0, 14)
    await node.expectLatexRendered(0)
  })

  test('依赖节点变更触发下游更新', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await canvas.addNode()

    await node.setHeader(0, 'A')
    await node.setExpression(0, testData.expressionB)
    await node.setExpression(1, testData.expressionRefA)

    await node.expectResult(1, 15)

    await node.setExpression(0, '20')
    await node.expectResult(1, 25)
  })

  test('自引用与循环依赖提示', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, testData.expressionSelfRef)
    await node.expectError(0)

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(0, testData.expressionCircularA)
    await node.setExpression(1, testData.expressionCircularB)
    await node.expectError(0)
    await node.expectError(1)
  })
})
