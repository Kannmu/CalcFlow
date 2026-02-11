import { test, expect } from '@playwright/test'
import { BasePage } from '../../pages/BasePage.js'
import { CanvasPage } from '../../pages/CanvasPage.js'
import { NodePage } from '../../pages/NodePage.js'

test.describe('表达式边界情况', () => {
  test('空表达式应该显示为0', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '')
    await node.expectResult(0, 0)
  })

  test('仅包含空白字符的表达式', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '   \t\n  ')
    await node.expectResult(0, 0)
  })

  test('超长表达式计算', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    // 构建超长表达式: 1+1+1+... (100次)
    const longExpr = Array(100).fill('1').join(' + ')
    await node.setExpression(0, longExpr)
    await node.expectResult(0, 100)
  })

  test('极大数值计算', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '1e308')
    const resultText = await node.resultAt(0).textContent()
    expect(resultText).toMatch(/1e\+?308|Infinity/)
  })

  test('极小数值计算', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '1e-308')
    const resultText = await node.resultAt(0).textContent()
    expect(resultText).toMatch(/1e-?308|0/)
  })

  test('除零应该返回Error', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '10 / 0')
    await node.expectError(0)
  })

  test('负数除零', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '-10 / 0')
    await node.expectError(0)
  })

  test('取模零', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '10 % 0')
    await node.expectError(0)
  })

  test('负数取模', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '-10 % 3')
    await node.expectResult(0, -1)
  })

  test('浮点数精度问题', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    // 经典的 0.1 + 0.2 精度问题
    await node.setExpression(0, '0.1 + 0.2')
    const resultText = await node.resultAt(0).textContent()
    const result = parseFloat(resultText || '0')
    // 结果应该接近 0.3
    expect(Math.abs(result - 0.3)).toBeLessThan(0.0001)
  })

  test('多重括号嵌套', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '((((1 + 2) * 3) - 4) / 5)')
    await node.expectResult(0, 1)
  })

  test('不匹配的括号应该报错', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '(1 + 2')
    await node.expectError(0)
  })

  test('多余的右括号', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '1 + 2)')
    await node.expectError(0)
  })

  test('幂运算右结合性', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    // 2^3^2 应该等于 2^(3^2) = 2^9 = 512，而不是 (2^3)^2 = 64
    await node.setExpression(0, '2 ^ 3 ^ 2')
    await node.expectResult(0, 512)
  })

  test('负数幂运算', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '(-2) ^ 3')
    await node.expectResult(0, -8)
  })

  test('负数的分数幂', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    // (-8)^(1/3) 应该等于 -2，但 JavaScript 返回 NaN
    await node.setExpression(0, '(-8) ^ 0.5')
    const result = await node.resultAt(0).textContent()
    // 可能返回 Error 或 NaN
    expect(result).toMatch(/Error|NaN/)
  })

  test('前置多个负号', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '--5')
    // 取决于解析器实现，可能返回 5 或 Error
    const result = await node.resultAt(0).textContent()
    expect(result).toMatch(/5|Error/)
  })

  test('特殊字符和符号', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '1 + @#$%')
    await node.expectError(0)
  })

  test('只有运算符的表达式', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '+ - * /')
    await node.expectError(0)
  })

  test('开头和结尾的运算符', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    // 表达式引擎会清理开头和结尾的运算符
    await node.setExpression(0, '+ 5 +')
    // 清理后变成 '5'，结果应该是 5
    await node.expectResult(0, 5)
  })
})

test.describe('数学函数边界', () => {
  test('sqrt负数', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'sqrt(-1)')
    await node.expectError(0)
  })

  test('ln非正数', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'ln(0)')
    await node.expectError(0)
  })

  test('log底数为1', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'log(10, 1)')
    await node.expectError(0)
  })

  test('log负数参数', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'log(-10, 2)')
    await node.expectError(0)
  })

  test('三角函数特殊角度', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    // sin(pi) 应该接近 0
    await node.setExpression(0, 'sin(pi)')
    const resultText = await node.resultAt(0).textContent()
    const result = parseFloat(resultText || '0')
    expect(Math.abs(result)).toBeLessThan(0.0001)
  })

  test('acos超出范围', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'acos(2)')
    await node.expectError(0)
  })

  test('tan(pi/2)应该接近无穷大', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'tan(pi / 2)')
    const resultText = await node.resultAt(0).textContent()
    // 由于浮点数精度，结果应该是非常大的数或 Error
    const result = parseFloat(resultText || '0')
    expect(Math.abs(result) > 1e10 || resultText === 'Error').toBeTruthy()
  })

  test('函数参数不足', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'pow(2)')
    await node.expectError(0)
  })

  test('函数多余参数', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    // 多余的参数应该被忽略
    await node.setExpression(0, 'sin(0, 1, 2)')
    await node.expectResult(0, 0)
  })

  test('不存在的函数', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'unknown_func(1)')
    await node.expectError(0)
  })

  test('函数嵌套调用', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'sin(cos(sqrt(16)))')
    const resultText = await node.resultAt(0).textContent()
    const result = parseFloat(resultText || '0')
    expect(Math.abs(result - Math.sin(Math.cos(4))) < 0.0001).toBeTruthy()
  })

  test('pow函数与^运算符结果一致', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'pow(2, 10)')
    const powResult = await node.resultAt(0).textContent()

    await canvas.addNode()
    await node.setExpression(1, '2 ^ 10')
    const opResult = await node.resultAt(1).textContent()

    expect(powResult).toBe(opResult)
  })
})

test.describe('常量和特殊值', () => {
  test('pi常量', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'pi')
    const resultText = await node.resultAt(0).textContent()
    const result = parseFloat(resultText || '0')
    expect(Math.abs(result - Math.PI) < 0.0001).toBeTruthy()
  })

  test('PI大写', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'PI')
    const resultText = await node.resultAt(0).textContent()
    const result = parseFloat(resultText || '0')
    expect(Math.abs(result - Math.PI) < 0.0001).toBeTruthy()
  })

  test('混合大小写常量', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'Pi')
    const resultText = await node.resultAt(0).textContent()
    const result = parseFloat(resultText || '0')
    expect(Math.abs(result - Math.PI) < 0.0001).toBeTruthy()
  })

  test('常量与运算符结合', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '2 * pi')
    const resultText = await node.resultAt(0).textContent()
    const result = parseFloat(resultText || '0')
    expect(Math.abs(result - 2 * Math.PI) < 0.0001).toBeTruthy()
  })

  test('科学计数法', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '1.5e3 + 2.5e-2')
    await node.expectResult(0, 1500.025)
  })
})
