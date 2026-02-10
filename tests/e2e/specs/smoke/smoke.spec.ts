import { test, expect } from '@playwright/test'
import { selectors } from '../../fixtures/selectors.js'
import { BasePage } from '../../pages/BasePage.js'

test('页面加载与核心元素存在', async ({ page }) => {
  const base = new BasePage(page)
  await base.goto()
  await base.waitForReady()

  await expect(page.locator(selectors.addNode)).toBeVisible()
  await expect(page.locator(selectors.canvas)).toBeVisible()
  await expect(page.locator(selectors.navClean)).toBeVisible()
  await expect(page.locator(selectors.navExport)).toBeVisible()
  await expect(page.locator(selectors.navImport)).toBeVisible()
  await expect(page.locator(selectors.navInstructions)).toBeVisible()
})
