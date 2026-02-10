import { expect, type Page } from '@playwright/test'

export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto() {
    await this.page.goto('/')
  }

  async waitForReady() {
    await expect(this.page.locator('body')).toBeVisible()
  }
}
