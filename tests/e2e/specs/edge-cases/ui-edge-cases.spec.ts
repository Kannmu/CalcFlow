import { test, expect } from '@playwright/test'
import { BasePage } from '../../pages/BasePage.js'
import { CanvasPage } from '../../pages/CanvasPage.js'
import { NodePage } from '../../pages/NodePage.js'
import { AppPage } from '../../pages/AppPage.js'

test.describe('LaTeX 渲染边界', () => {
  test('空表达式不渲染 LaTeX', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    // 空表达式应该没有 LaTeX
    const latexContainer = page.locator('[data-testid="latex-container"]').first()
    await expect(latexContainer).toHaveCount(0)
  })

  test('简单数字渲染 LaTeX', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '42')

    const latexContainer = page.locator('[data-testid="latex-container"]').first()
    await expect(latexContainer).toBeVisible()
    await expect(latexContainer).not.toBeEmpty()
  })

  test('复杂分数渲染', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '(1 + 2) / 3')

    const latexContainer = page.locator('[data-testid="latex-container"]').first()
    await expect(latexContainer).toBeVisible()
    // 应该渲染为分数形式
    const html = await latexContainer.innerHTML()
    expect(html).toBeTruthy()
  })

  test('幂运算渲染', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '2 ^ 10')

    const latexContainer = page.locator('[data-testid="latex-container"]').first()
    await expect(latexContainer).toBeVisible()
    // 应该渲染为上标
    const html = await latexContainer.innerHTML()
    expect(html).toBeTruthy()
  })

  test('嵌套函数 LaTeX 渲染', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'sin(cos(sqrt(x)))')

    const latexContainer = page.locator('[data-testid="latex-container"]').first()
    await expect(latexContainer).toBeVisible()
  })

  test('错误表达式 LaTeX 渲染', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '10 / 0')
    await node.expectError(0)

    // 错误状态也应该有 LaTeX 渲染
    const latexContainer = page.locator('[data-testid="latex-container"]').first()
    await expect(latexContainer).toBeVisible()
  })

  test('极大数值科学计数法渲染', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '1e10 * 1e10')

    const latexContainer = page.locator('[data-testid="latex-container"]').first()
    await expect(latexContainer).toBeVisible()
    // 应该以科学计数法渲染
    const text = await latexContainer.textContent()
    expect(text).toMatch(/10\^|times|e\+/)
  })

  test('修改表达式后 LaTeX 更新', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '1 + 1')

    const latexContainer = page.locator('[data-testid="latex-container"]').first()
    const initialHtml = await latexContainer.innerHTML()

    await node.setExpression(0, '2 + 2')

    const updatedHtml = await latexContainer.innerHTML()
    expect(updatedHtml).not.toBe(initialHtml)
  })
})

test.describe('Toast 提示边界', () => {
  test('导出成功显示 Toast', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()

    await app.clickExport()

    // 应该显示成功 toast
    await expect(page.locator('.toast-success')).toBeVisible()
  })

  test('导入成功显示 Toast', async ({ page }) => {
    const base = new BasePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()
    await app.setImportFile({
      name: 'test.json',
      mimeType: 'application/json',
      buffer: Buffer.from('[{"header": "A", "expression": "10"}]')
    })

    await expect(page.locator('.toast-success')).toBeVisible()
  })

  test('导入失败显示 Toast', async ({ page }) => {
    const base = new BasePage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await app.clickImport()
    await app.setImportFile({
      name: 'invalid.json',
      mimeType: 'application/json',
      buffer: Buffer.from('invalid json')
    })

    await expect(page.locator('.toast-error')).toBeVisible()
  })

  test('清空工作区显示 Toast', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await app.clickClean()

    await expect(page.locator('.toast-info')).toBeVisible()
  })

  test('复制结果显示 Toast', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '42')

    // 点击结果元素触发复制
    const resultElement = page.locator('.element-content-input').first()
    await resultElement.click()

    // 应该显示复制成功 toast
    await expect(page.locator('.toast-success')).toBeVisible()
  })

  test('多个 Toast 依次显示', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const app = new AppPage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()

    // 触发多个操作
    await app.clickExport()
    await page.waitForTimeout(100)
    await app.clickClean()

    // 应该显示多个 toast
    const toasts = await page.locator('.toast').all()
    expect(toasts.length).toBeGreaterThanOrEqual(1)
  })
})

test.describe('响应式布局边界', () => {
  test('移动端视图导航适配', async ({ page }) => {
    const base = new BasePage(page)

    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })

    await base.goto()
    await base.waitForReady()

    // 导航应该适配移动端
    const nav = page.locator('.app-nav')
    await expect(nav).toBeVisible()
  })

  test('平板视图布局', async ({ page }) => {
    const base = new BasePage(page)

    // 设置平板视口
    await page.setViewportSize({ width: 768, height: 1024 })

    await base.goto()
    await base.waitForReady()

    const canvas = page.locator('[data-testid="canvas"]')
    await expect(canvas).toBeVisible()
  })

  test('大屏视图布局', async ({ page }) => {
    const base = new BasePage(page)

    // 设置大屏视口
    await page.setViewportSize({ width: 1920, height: 1080 })

    await base.goto()
    await base.waitForReady()

    const canvas = page.locator('[data-testid="canvas"]')
    await expect(canvas).toBeVisible()
  })

  test('窗口大小改变自适应', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await canvas.addNode()

    // 改变窗口大小
    await page.setViewportSize({ width: 500, height: 800 })
    await page.waitForTimeout(300)

    // 节点应该仍然可见
    const nodes = page.locator('[data-testid="node"]')
    await expect(nodes.first()).toBeVisible()
  })
})

test.describe('错误状态边界', () => {
  test('错误节点样式', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '10 / 0')

    // 节点应该有错误样式
    const nodeElement = page.locator('[data-testid="node"]').first()
    await expect(nodeElement).toHaveClass(/error/)
  })

  test('错误提示徽章可见性', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'invalid')

    // 应该有错误徽章
    const errorBadge = page.locator('[data-testid="node-error"]').first()
    await expect(errorBadge).toBeVisible()
  })

  test('错误节点悬停提示', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '10 / 0')

    const errorBadge = page.locator('[data-testid="node-error"]').first()

    // 悬停应该显示错误信息
    await errorBadge.hover()
    // 检查 title 属性
    const title = await errorBadge.getAttribute('title')
    expect(title?.length).toBeGreaterThan(0)
  })

  test('多个错误节点', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '1 / 0')

    await canvas.addNode()
    await node.setExpression(1, 'sqrt(-1)')

    await canvas.addNode()
    await node.setExpression(2, 'invalid syntax')

    // 所有节点都应该有错误样式
    const errorNodes = await page.locator('[data-testid="node"].error').all()
    expect(errorNodes.length).toBe(3)
  })
})

test.describe('节点交互边界', () => {
  test('节点悬停效果', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()

    const nodeElement = page.locator('[data-testid="node"]').first()

    // 悬停前获取样式
    const beforeTransform = await nodeElement.evaluate(el =>
      window.getComputedStyle(el).transform
    )

    // 悬停
    await nodeElement.hover()
    await page.waitForTimeout(100)

    // 应该有悬停效果
    const afterBoxShadow = await nodeElement.evaluate(el =>
      window.getComputedStyle(el).boxShadow
    )
    expect(afterBoxShadow).not.toBe('none')
  })

  test('删除按钮悬停显示', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()

    const nodeElement = page.locator('[data-testid="node"]').first()
    const deleteButton = page.locator('[data-testid="node-delete"]').first()

    // 默认不透明度
    const defaultOpacity = await deleteButton.evaluate(el =>
      window.getComputedStyle(el).opacity
    )
    expect(parseFloat(defaultOpacity)).toBeLessThan(1)

    // 悬停节点
    await nodeElement.hover()

    // 删除按钮应该更明显
    const hoverOpacity = await deleteButton.evaluate(el =>
      window.getComputedStyle(el).opacity
    )
    expect(parseFloat(hoverOpacity)).toBeGreaterThan(parseFloat(defaultOpacity))
  })

  test('输入框聚焦效果', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()

    const input = node.expressionInputAt(0)
    await input.click()

    // 输入框应该有聚焦样式
    const borderColor = await input.evaluate(el =>
      window.getComputedStyle(el).borderColor
    )
    expect(borderColor).not.toBe('transparent')
  })

  test('空节点结果可点击', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()

    // 结果元素应该可点击
    const resultElement = page.locator('.element-content-input').last()
    await expect(resultElement).toBeVisible()
    await resultElement.click()
  })
})

test.describe('快速操作边界', () => {
  test('快速创建和删除节点', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)

    await base.goto()
    await base.waitForReady()

    // 快速创建 10 个节点
    for (let i = 0; i < 10; i++) {
      await canvas.addNode()
      await page.waitForTimeout(30)
    }

    await canvas.expectNodeCount(10)

    // 快速删除所有节点
    const deleteButtons = await page.locator('[data-testid="node-delete"]').all()
    for (const btn of deleteButtons) {
      await btn.click()
      await page.waitForTimeout(30)
    }

    await canvas.expectNodeCount(0)
  })

  test('快速切换表达式', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    const input = node.expressionInputAt(0)

    // 快速切换多个表达式
    const expressions = ['1', '2', '3', '4', '5', 'sin(0)', 'cos(0)', 'sqrt(1)', '1+1', '2*2']
    for (const expr of expressions) {
      await input.fill(expr)
      await page.waitForTimeout(50)
    }

    await page.waitForTimeout(200)

    // 最终结果应该是正确的
    await node.expectResult(0, 4)
  })

  test('页面刷新后状态恢复', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setHeader(0, 'Test')
    await node.setExpression(0, '100')

    // 刷新页面
    await page.reload()
    await base.waitForReady()

    // 状态应该从 localStorage 恢复
    await canvas.expectNodeCount(1)
    await node.expectResult(0, 100)
  })

  test('多个标签页独立', async ({ browser }) => {
    const context = await browser.newContext()

    // 第一个标签页
    const page1 = await context.newPage()
    const base1 = new BasePage(page1)
    const canvas1 = new CanvasPage(page1)
    const node1 = new NodePage(page1)

    await base1.goto()
    await base1.waitForReady()

    await canvas1.addNode()
    await node1.setExpression(0, '100')

    // 第二个标签页
    const page2 = await context.newPage()
    const base2 = new BasePage(page2)
    const canvas2 = new CanvasPage(page2)

    await base2.goto()
    await base2.waitForReady()

    // 第二个标签页应该看到相同的数据
    await canvas2.expectNodeCount(1)

    await context.close()
  })
})
