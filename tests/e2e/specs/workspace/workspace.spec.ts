import { test, expect } from '@playwright/test'
import { BasePage } from '../../pages/BasePage.js'
import { CanvasPage } from '../../pages/CanvasPage.js'
import { NodePage } from '../../pages/NodePage.js'
import { AppPage } from '../../pages/AppPage.js'
import { testData } from '../../fixtures/testData.js'

const sampleWorkspace = [
  { header: 'A', expression: '10' },
  { header: 'B', expression: 'A + 5' }
]

test.describe('工作区操作', () => {
  test('Export 触发下载', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      app.clickExport()
    ])

    await expect(download.suggestedFilename()).toBe(testData.exportFileName)
  })

  test('Import 读取并恢复', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()

    const json = JSON.stringify(sampleWorkspace, null, 2)
    await app.setImportFile({
      name: 'workspace.json',
      mimeType: 'application/json',
      buffer: Buffer.from(json)
    })

    await canvas.expectNodeCount(2)
    await node.expectResult(1, 15)
  })

  test('Clean 清空工作区', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await canvas.addNode()
    await canvas.expectNodeCount(2)

    await app.clickClean()
    await canvas.expectNodeCount(0)
  })
})
