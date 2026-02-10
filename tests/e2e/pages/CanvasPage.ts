import { expect, type Page } from '@playwright/test'
import { selectors } from '../fixtures/selectors.js'

export class CanvasPage {
  constructor(private readonly page: Page) {}

  async addNode() {
    await this.page.click(selectors.addNode)
  }

  nodeList() {
    return this.page.locator(selectors.node)
  }

  async expectNodeCount(count: number) {
    await expect(this.nodeList()).toHaveCount(count)
  }

  async clearAll() {
    await this.page.click(selectors.navClean)
  }
}
