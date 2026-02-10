import { test } from '@playwright/test'
import { BasePage } from './pages/BasePage.js'
import { CanvasPage } from './pages/CanvasPage.js'
import { NodePage } from './pages/NodePage.js'
import { AppPage } from './pages/AppPage.js'
import { testData } from './fixtures/testData.js'

test('端到端完整流程', async ({ page }) => {
  const base = new BasePage(page)
  const canvas = new CanvasPage(page)
  const node = new NodePage(page)
  const app = new AppPage(page)

  await base.goto()
  await base.waitForReady()

  await canvas.addNode()
  await node.setHeader(0, 'A')
  await node.setExpression(0, testData.expressionB)

  await canvas.addNode()
  await node.setExpression(1, testData.expressionRefA)
  await node.expectResult(1, 15)
  await node.expectLatexRendered(1)

  await app.clickExport()

  await app.openInstructions()
  await app.closeInstructionsWithOverlay()

  await app.clickClean()
  await canvas.expectNodeCount(0)
})
