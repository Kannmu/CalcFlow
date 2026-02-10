import { test, expect } from '@playwright/test'
import { BasePage } from '../../pages/BasePage.js'
import { AppPage } from '../../pages/AppPage.js'
import { selectors } from '../../fixtures/selectors.js'

test('Instructions 面板开关', async ({ page }) => {
  const base = new BasePage(page)
  const app = new AppPage(page)

  await base.goto()
  await base.waitForReady()

  await app.openInstructions()
  await expect(page.locator(selectors.instructionPanel)).toBeVisible()

  await app.closeInstructionsWithOverlay()
  await expect(page.locator(selectors.instructionPanel)).not.toHaveClass(/is-open/)
})
