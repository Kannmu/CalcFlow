import { expect, type Locator } from '@playwright/test'
import { selectors } from '../fixtures/selectors.js'

export class LatexComponent {
  constructor(private readonly root: Locator) {}

  async expectRendered() {
    const latex = this.root.locator(selectors.latexContainer)
    await expect(latex).toBeVisible()
    await expect(latex).not.toBeEmpty()
  }
}
