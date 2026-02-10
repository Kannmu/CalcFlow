import { expect, type Locator, type Page } from '@playwright/test'
import { selectors } from '../fixtures/selectors.js'

export class NodePage {
  constructor(private readonly page: Page) {}

  nodeAt(index: number) {
    return this.page.locator(selectors.node).nth(index)
  }

  expressionInputAt(index: number) {
    return this.nodeAt(index).locator(selectors.nodeExpression)
  }

  resultAt(index: number) {
    return this.nodeAt(index).locator('.element-content-input').last()
  }

  headerInputAt(index: number) {
    return this.nodeAt(index).locator('.element-header-input')
  }

  async setHeader(index: number, value: string) {
    const header = this.headerInputAt(index)
    await header.click()
    await header.fill(value)
    await header.blur()
  }

  async setExpression(index: number, value: string) {
    const input = this.expressionInputAt(index)
    await input.click()
    await input.fill(value)
    await input.blur()
  }

  async expectResult(index: number, value: string | number) {
    await expect(this.resultAt(index)).toContainText(String(value))
  }

  async expectError(index: number) {
    await expect(this.nodeAt(index).locator(selectors.nodeError)).toBeVisible()
  }

  async expectLatexRendered(index: number) {
    const latex = this.nodeAt(index).locator(selectors.latexContainer)
    await expect(latex).toBeVisible()
    await expect(latex).not.toBeEmpty()
  }
}
