import { expect, type Page } from '@playwright/test'
import { selectors } from '../fixtures/selectors.js'

export async function expectHasNodes(page: Page, count: number) {
  await expect(page.locator(selectors.node)).toHaveCount(count)
}
