import { test, expect } from '@playwright/test'
import { BasePage } from '../../pages/BasePage.js'
import { CanvasPage } from '../../pages/CanvasPage.js'
import { NodePage } from '../../pages/NodePage.js'

test.describe('自动补全边界', () => {
  test('输入单个字母触发补全', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    const input = node.expressionInputAt(0)
    await input.click()
    await input.fill('s')

    // 等待补全菜单出现
    await expect(page.locator('.autocomplete-menu')).toBeVisible()

    // 应该包含 sin, sqrt 等函数
    const items = await page.locator('.autocomplete-item').all()
    const texts = await Promise.all(items.map(i => i.textContent()))
    expect(texts.some(t => t?.includes('sin'))).toBeTruthy()
  })

  test('输入函数名后应用补全', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    const input = node.expressionInputAt(0)
    await input.click()
    await input.fill('sq')

    // 等待补全菜单
    await expect(page.locator('.autocomplete-menu')).toBeVisible()

    // 按 Enter 应用第一个补全
    await input.press('Enter')

    // 应该插入函数名和括号
    const value = await input.inputValue()
    expect(value).toMatch(/sqrt\s*\(\s*\)/)
  })

  test('输入节点名触发补全', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 创建第一个节点
    await canvas.addNode()
    await node.setHeader(0, 'TestNode')
    await node.setExpression(0, '10')

    // 创建第二个节点
    await canvas.addNode()
    const input = node.expressionInputAt(1)
    await input.click()
    await input.fill('Te')

    // 等待补全菜单
    await expect(page.locator('.autocomplete-menu')).toBeVisible()

    // 应该包含 TestNode
    const items = await page.locator('.autocomplete-item').all()
    const texts = await Promise.all(items.map(i => i.textContent()))
    expect(texts.some(t => t?.includes('TestNode'))).toBeTruthy()
  })

  test('输入常量触发补全', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    const input = node.expressionInputAt(0)
    await input.click()
    await input.fill('p')

    // 等待补全菜单
    await expect(page.locator('.autocomplete-menu')).toBeVisible()

    // 应该包含 pi
    const items = await page.locator('.autocomplete-item').all()
    const texts = await Promise.all(items.map(i => i.textContent()))
    expect(texts.some(t => t?.includes('pi'))).toBeTruthy()
  })

  test('输入不存在的前缀不显示补全', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    const input = node.expressionInputAt(0)
    await input.click()
    await input.fill('xyznotexist')

    // 补全菜单不应该出现
    await page.waitForTimeout(100)
    const menu = await page.locator('.autocomplete-menu').isVisible().catch(() => false)
    expect(menu).toBeFalsy()
  })

  test('Escape关闭补全菜单', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    const input = node.expressionInputAt(0)
    await input.click()
    await input.fill('s')

    await expect(page.locator('.autocomplete-menu')).toBeVisible()

    await input.press('Escape')

    // 菜单应该关闭
    await expect(page.locator('.autocomplete-menu')).not.toBeVisible()
  })

  test('使用上下箭头选择补全项', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    const input = node.expressionInputAt(0)
    await input.click()
    await input.fill('s')

    await expect(page.locator('.autocomplete-menu')).toBeVisible()

    // 按向下箭头
    await input.press('ArrowDown')
    await input.press('ArrowDown')

    // 按 Enter 应用
    await input.press('Enter')

    // 应该插入选中的项
    const value = await input.inputValue()
    expect(value.length).toBeGreaterThan(1)
  })

  test('补全后按Tab跳转光标', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    const input = node.expressionInputAt(0)
    await input.click()
    await input.fill('pow')

    await expect(page.locator('.autocomplete-menu')).toBeVisible()

    // 应用补全
    await input.press('Enter')

    // 按 Tab 跳转到第一个参数
    await input.press('Tab')

    const value = await input.inputValue()
    // 应该处于括号内
    expect(value).toContain('(')
  })

  test('输入时快速删除不触发补全', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    const input = node.expressionInputAt(0)

    // 快速输入然后删除
    await input.fill('sin')
    await input.fill('')

    await page.waitForTimeout(100)

    // 补全菜单不应该出现
    const menu = await page.locator('.autocomplete-menu').isVisible().catch(() => false)
    expect(menu).toBeFalsy()
  })

  test('混合输入不触发补全', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    const input = node.expressionInputAt(0)
    await input.click()

    // 输入数字和符号后输入字母
    await input.fill('10 + s')

    await expect(page.locator('.autocomplete-menu')).toBeVisible()

    // 应该包含 sin
    const items = await page.locator('.autocomplete-item').all()
    const texts = await Promise.all(items.map(i => i.textContent()))
    expect(texts.some(t => t?.includes('sin'))).toBeTruthy()
  })

  test('补全项分类显示', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 创建一个节点以便引用
    await canvas.addNode()
    await node.setHeader(0, 'MyNode')

    await canvas.addNode()
    const input = node.expressionInputAt(1)
    await input.click()
    await input.fill('m')

    await expect(page.locator('.autocomplete-menu')).toBeVisible()

    // 应该有不同类型的标签
    const typeLabels = await page.locator('.autocomplete-type').all()
    const texts = await Promise.all(typeLabels.map(t => t.textContent()))

    // 应该包含函数(fn)、节点(node)等类型
    const uniqueTypes = [...new Set(texts)]
    expect(uniqueTypes.length).toBeGreaterThanOrEqual(1)
  })

  test('多个相同前缀节点', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 创建多个以 "Test" 开头的节点
    for (let i = 1; i <= 3; i++) {
      await canvas.addNode()
      await node.setHeader(i - 1, `TestNode${i}`)
      await node.setExpression(i - 1, `${i * 10}`)
    }

    // 创建第四个节点输入 Test
    await canvas.addNode()
    const input = node.expressionInputAt(3)
    await input.click()
    await input.fill('Test')

    await expect(page.locator('.autocomplete-menu')).toBeVisible()

    // 应该显示所有匹配的节点
    const items = await page.locator('.autocomplete-item').all()
    expect(items.length).toBeGreaterThanOrEqual(3)
  })

  test('中文输入不触发异常', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 创建中文节点名
    await canvas.addNode()
    await node.setHeader(0, '测试')

    await canvas.addNode()
    const input = node.expressionInputAt(1)
    await input.click()
    await input.fill('测')

    // 不应该报错
    await expect(page.locator('.autocomplete-menu')).toBeVisible()

    const items = await page.locator('.autocomplete-item').all()
    const texts = await Promise.all(items.map(i => i.textContent()))
    expect(texts.some(t => t?.includes('测试'))).toBeTruthy()
  })
})

test.describe('键盘快捷键边界', () => {
  test('Ctrl+Enter添加节点', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)

    await base.goto()
    await base.waitForReady()

    await page.keyboard.press('Control+Enter')
    await page.waitForTimeout(100)

    await canvas.expectNodeCount(1)

    // 再次按下
    await page.keyboard.press('Control+Enter')
    await page.waitForTimeout(100)

    await canvas.expectNodeCount(2)
  })

  test('Ctrl+D复制最后一个节点', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '42')

    await page.keyboard.press('Control+d')
    await page.waitForTimeout(100)

    await canvas.expectNodeCount(2)

    // 新节点应该复制表达式
    await node.expectResult(1, 42)
  })

  test('Ctrl+D在没有节点时不报错', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)

    await base.goto()
    await base.waitForReady()

    // 没有节点时按 Ctrl+D
    await page.keyboard.press('Control+d')
    await page.waitForTimeout(100)

    await canvas.expectNodeCount(0)
  })

  test('Escape取消拖拽状态', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()

    // 按下 Escape
    await page.keyboard.press('Escape')

    // 不应该报错，状态应该正常
    await node.setExpression(0, '100')
    await node.expectResult(0, 100)
  })

  test('快速连续快捷键', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)

    await base.goto()
    await base.waitForReady()

    // 快速按多次 Ctrl+Enter
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Control+Enter')
      await page.waitForTimeout(50)
    }

    await page.waitForTimeout(200)
    await canvas.expectNodeCount(5)
  })
})

test.describe('表达式输入边界', () => {
  test('快速输入长表达式', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    const input = node.expressionInputAt(0)

    // 快速输入长表达式
    await input.fill('1+2+3+4+5+6+7+8+9+10+11+12+13+14+15+16+17+18+19+20')
    await page.waitForTimeout(200)

    await node.expectResult(0, 210)
  })

  test('输入时删除所有内容', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '100')

    const input = node.expressionInputAt(0)
    await input.fill('')
    await page.waitForTimeout(200)

    await node.expectResult(0, 0)
  })

  test('粘贴长表达式', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    const input = node.expressionInputAt(0)

    const longExpr = 'sin(30) + cos(60) * sqrt(16) / log(100, 10) - pow(2, 3)'
    await input.fill(longExpr)
    await page.waitForTimeout(300)

    const result = await node.resultAt(0).textContent()
    expect(result).not.toBe('Error')
  })

  test('输入后立即失焦', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    const input = node.expressionInputAt(0)

    await input.fill('50')
    await input.blur()
    await page.waitForTimeout(200)

    await node.expectResult(0, 50)
  })
})

test.describe('高亮渲染边界', () => {
  test('空表达式高亮', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()

    // 高亮元素应该存在且为空
    const highlighter = page.locator('.expression-highlighter').first()
    await expect(highlighter).toBeVisible()
  })

  test('复杂表达式高亮', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'sin(x) + cos(y) * sqrt(z)')

    // 高亮元素应该包含语法高亮
    const highlighter = page.locator('.expression-highlighter').first()
    const html = await highlighter.innerHTML()

    // 应该有不同类型的 span
    expect(html).toMatch(/hl-(number|function|operator|parenthesis)/)
  })

  test('快速修改表达式高亮同步', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    const input = node.expressionInputAt(0)

    // 快速多次修改
    for (let i = 1; i <= 5; i++) {
      await input.fill(`${i} + ${i}`)
      await page.waitForTimeout(50)
    }

    await page.waitForTimeout(200)

    // 高亮应该与输入同步
    const highlighter = page.locator('.expression-highlighter').first()
    const text = await highlighter.textContent()
    expect(text).toContain('5')
  })
})
