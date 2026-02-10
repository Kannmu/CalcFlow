import { expect, type FilePayload, type Page } from '@playwright/test'
import { selectors } from '../fixtures/selectors.js'

export class AppPage {
  constructor(private readonly page: Page) {}

  async openInstructions() {
    await this.page.click(selectors.navInstructions)
    await expect(this.page.locator(selectors.instructionPanel)).toHaveClass(/is-open/)
  }

  async closeInstructionsWithOverlay() {
    await this.page.click(selectors.instructionOverlay)
    await expect(this.page.locator(selectors.instructionPanel)).not.toHaveClass(/is-open/)
  }

  async clickClean() {
    await this.page.click(selectors.navClean)
  }

  async clickExport() {
    await this.page.click(selectors.navExport)
  }

  async clickImport() {
    await this.page.click(selectors.navImport)
  }

  async setImportFile(filePayload: FilePayload | string) {
    await this.page.setInputFiles(selectors.importInput, filePayload)
  }
}
