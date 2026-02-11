import { test, expect } from '@playwright/test'
import { BasePage } from '../../pages/BasePage.js'
import { CanvasPage } from '../../pages/CanvasPage.js'
import { NodePage } from '../../pages/NodePage.js'
import { AppPage } from '../../pages/AppPage.js'

test.describe('复杂场景测试', () => {
  test('计算器模拟 - 多步计算', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 创建一个复杂的多步计算场景
    // 计算: ((10 + 20) * 3 - 15) / 5 = 15

    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, '10')

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(1, '20')

    await canvas.addNode()
    await node.setHeader(2, 'Sum')
    await node.setExpression(2, 'A + B')

    await canvas.addNode()
    await node.setHeader(3, 'Product')
    await node.setExpression(3, 'Sum * 3')

    await canvas.addNode()
    await node.setHeader(4, 'Subtract')
    await node.setExpression(4, 'Product - 15')

    await canvas.addNode()
    await node.setHeader(5, 'Final')
    await node.setExpression(5, 'Subtract / 5')

    // 验证结果
    await node.expectResult(0, 10)
    await node.expectResult(1, 20)
    await node.expectResult(2, 30)
    await node.expectResult(3, 90)
    await node.expectResult(4, 75)
    await node.expectResult(5, 15)

    // 修改中间值验证级联更新
    await node.setExpression(0, '15')
    await node.expectResult(2, 35)
    await node.expectResult(3, 105)
    await node.expectResult(4, 90)
    await node.expectResult(5, 18)
  })

  test('金融计算模拟', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 本金
    await canvas.addNode()
    await node.setHeader(0, 'Principal')
    await node.setExpression(0, '10000')

    // 年利率
    await canvas.addNode()
    await node.setHeader(1, 'Rate')
    await node.setExpression(1, '0.05')

    // 年数
    await canvas.addNode()
    await node.setHeader(2, 'Years')
    await node.setExpression(2, '10')

    // 复利终值 = P * (1 + r)^n
    await canvas.addNode()
    await node.setHeader(3, 'FinalAmount')
    await node.setExpression(3, 'Principal * pow(1 + Rate, Years)')

    // 利息
    await canvas.addNode()
    await node.setHeader(4, 'Interest')
    await node.setExpression(4, 'FinalAmount - Principal')

    // 验证
    const result = await node.resultAt(3).textContent()
    const interest = await node.resultAt(4).textContent()

    expect(parseFloat(result || '0')).toBeCloseTo(16288.9, 0)
    expect(parseFloat(interest || '0')).toBeCloseTo(6288.9, 0)
  })

  test('三角函数综合计算', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 角度
    await canvas.addNode()
    await node.setHeader(0, 'Angle')
    await node.setExpression(0, '30')

    // 弧度 = 角度 * π / 180
    await canvas.addNode()
    await node.setHeader(1, 'Radians')
    await node.setExpression(1, 'Angle * pi / 180')

    // sin(角度)
    await canvas.addNode()
    await node.setHeader(2, 'SinVal')
    await node.setExpression(2, 'sin(Radians)')

    // cos(角度)
    await canvas.addNode()
    await node.setHeader(3, 'CosVal')
    await node.setExpression(3, 'cos(Radians)')

    // sin² + cos² = 1
    await canvas.addNode()
    await node.setHeader(4, 'Identity')
    await node.setExpression(4, 'pow(SinVal, 2) + pow(CosVal, 2)')

    await node.expectResult(4, 1)
  })

  test('递归展开的树形依赖', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 构建一个树形依赖结构
    //       Root
    //      /    \
    //   Left    Right
    //   /  \     /  \
    // LL   LR   RL   RR

    await canvas.addNode()
    await node.setHeader(0, 'Root')
    await node.setExpression(0, '10')

    await canvas.addNode()
    await node.setHeader(1, 'Left')
    await node.setExpression(1, 'Root * 2')

    await canvas.addNode()
    await node.setHeader(2, 'Right')
    await node.setExpression(2, 'Root * 3')

    await canvas.addNode()
    await node.setHeader(3, 'LL')
    await node.setExpression(3, 'Left + 1')

    await canvas.addNode()
    await node.setHeader(4, 'LR')
    await node.setExpression(4, 'Left + 2')

    await canvas.addNode()
    await node.setHeader(5, 'RL')
    await node.setExpression(5, 'Right + 1')

    await canvas.addNode()
    await node.setHeader(6, 'RR')
    await node.setExpression(6, 'Right + 2')

    await node.expectResult(0, 10)
    await node.expectResult(1, 20)
    await node.expectResult(2, 30)
    await node.expectResult(3, 21)
    await node.expectResult(4, 22)
    await node.expectResult(5, 31)
    await node.expectResult(6, 32)

    // 修改 Root 验证整棵树更新
    await node.setExpression(0, '5')
    await node.expectResult(1, 10)
    await node.expectResult(2, 15)
    await node.expectResult(3, 11)
    await node.expectResult(4, 12)
    await node.expectResult(5, 16)
    await node.expectResult(6, 17)
  })

  test('节点聚合计算', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 创建多个数值节点
    const values = [10, 20, 30, 40, 50]
    for (let i = 0; i < values.length; i++) {
      await canvas.addNode()
      await node.setHeader(i, `Val${i}`)
      await node.setExpression(i, String(values[i]))
    }

    // 求和节点
    await canvas.addNode()
    await node.setHeader(5, 'Sum')
    await node.setExpression(5, 'Val0 + Val1 + Val2 + Val3 + Val4')

    // 平均值节点
    await canvas.addNode()
    await node.setHeader(6, 'Avg')
    await node.setExpression(6, 'Sum / 5')

    // 最大值节点
    await canvas.addNode()
    await node.setHeader(7, 'Max')
    await node.setExpression(7, 'Val4')

    // 最小值节点
    await canvas.addNode()
    await node.setHeader(8, 'Min')
    await node.setExpression(8, 'Val0')

    await node.expectResult(5, 150)
    await node.expectResult(6, 30)
    await node.expectResult(7, 50)
    await node.expectResult(8, 10)
  })
})

test.describe('错误恢复测试', () => {
  test('错误修复后级联恢复', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // A -> B -> C
    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, '10')

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(1, 'A * 2')

    await canvas.addNode()
    await node.setHeader(2, 'C')
    await node.setExpression(2, 'B + 5')

    await node.expectResult(2, 25)

    // 让 A 报错
    await node.setExpression(0, '1 / 0')
    await node.expectError(0)
    await node.expectError(1)
    await node.expectError(2)

    // 修复 A
    await node.setExpression(0, '20')
    await node.expectResult(0, 20)
    await node.expectResult(1, 40)
    await node.expectResult(2, 45)
  })

  test('部分节点错误不影响其他分支', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    //      A
    //     / \
    //    B   C
    //   /     \
    //  D       E

    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, '100')

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(1, 'A / 0') // 错误

    await canvas.addNode()
    await node.setHeader(2, 'C')
    await node.setExpression(2, 'A + 1') // 正确

    await canvas.addNode()
    await node.setHeader(3, 'D')
    await node.setExpression(3, 'B + 1') // 依赖错误节点

    await canvas.addNode()
    await node.setHeader(4, 'E')
    await node.setExpression(4, 'C + 1') // 依赖正确节点

    // B 和 D 应该报错
    await node.expectError(1)
    await node.expectError(3)

    // A, C, E 应该正常
    await node.expectResult(0, 100)
    await node.expectResult(2, 101)
    await node.expectResult(4, 102)
  })

  test('循环依赖解除后恢复', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // A -> B -> C -> D -> B (循环)
    await canvas.addNode()
    await node.setHeader(0, 'A')
    await node.setExpression(0, '10')

    await canvas.addNode()
    await node.setHeader(1, 'B')
    await node.setExpression(1, 'A + 1')

    await canvas.addNode()
    await node.setHeader(2, 'C')
    await node.setExpression(2, 'B + 1')

    await canvas.addNode()
    await node.setHeader(3, 'D')
    await node.setExpression(3, 'C + 1')

    await node.expectResult(3, 13)

    // 创建循环
    await node.setExpression(1, 'D + 1')
    await node.expectError(1)
    await node.expectError(2)
    await node.expectError(3)

    // A 不受影响
    await node.expectResult(0, 10)

    // 解除循环
    await node.setExpression(1, 'A + 1')
    await node.expectResult(1, 11)
    await node.expectResult(2, 12)
    await node.expectResult(3, 13)
  })
})

test.describe('性能压力测试', () => {
  test('频繁修改触发多次计算', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setHeader(0, 'Base')
    await node.setExpression(0, '0')

    // 创建多个依赖节点
    for (let i = 1; i <= 10; i++) {
      await canvas.addNode()
      await node.setHeader(i, `Node${i}`)
      await node.setExpression(i, 'Base + ' + i)
    }

    // 快速修改 Base 100 次
    const input = node.expressionInputAt(0)
    for (let i = 1; i <= 100; i++) {
      await input.fill(String(i))
      await page.waitForTimeout(10)
    }

    // 等待防抖完成
    await page.waitForTimeout(300)

    // 最终结果应该一致
    await node.expectResult(0, 100)
    await node.expectResult(10, 110)
  })

  test('大量并发依赖更新', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    // 创建一个中心节点
    await canvas.addNode()
    await node.setHeader(0, 'Center')
    await node.setExpression(0, '1')

    // 创建 20 个依赖节点
    for (let i = 1; i <= 20; i++) {
      await canvas.addNode()
      await node.setExpression(i, `Center * ${i}`)
    }

    // 修改中心节点
    await node.setExpression(0, '10')

    // 所有依赖节点应该正确更新
    for (let i = 1; i <= 20; i++) {
      await node.expectResult(i, 10 * i)
    }
  })
})

test.describe('数据类型边界', () => {
  test('布尔值作为数字', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'true + false')

    // true 通常转为 1，false 转为 0
    const result = await node.resultAt(0).textContent()
    expect(['1', '0', 'Error']).toContain(result)
  })

  test('字符串数值运算', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '"10" + "20"')

    // 应该解析为数字或直接报错
    const result = await node.resultAt(0).textContent()
    expect(['30', 'Error', '1020']).toContain(result)
  })

  test('十六进制数', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '0x10')

    const result = await node.resultAt(0).textContent()
    // 十六进制 0x10 = 十进制 16
    expect(result).toMatch(/16|Error/)
  })

  test('八进制数', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '010')

    const result = await node.resultAt(0).textContent()
    // 可能是 10 或 8（如果解析为八进制）
    expect(['10', '8', 'Error']).toContain(result)
  })
})

test.describe('特殊数学场景', () => {
  test('浮点数精度极限', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '0.1 + 0.2 - 0.3')

    const result = await node.resultAt(0).textContent()
    const num = parseFloat(result || '0')
    // 结果应该非常接近 0
    expect(Math.abs(num)).toBeLessThan(0.0001)
  })

  test('极大数相加', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '1e200 + 1e200')

    const result = await node.resultAt(0).textContent()
    // 结果应该是 2e200 或 Infinity
    expect(result).toMatch(/2e\+?200|Infinity/)
  })

  test('极小正数', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '1e-300 * 1e-300')

    const result = await node.resultAt(0).textContent()
    // 结果应该是 1e-600 或 0（下溢）
    expect(result).toMatch(/1e-?600|0/)
  })

  test('NaN 传播', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, 'sqrt(-1)')
    await node.expectError(0)

    await canvas.addNode()
    await node.setExpression(1, '0 + 0') // 先设为有效值
    await node.expectResult(1, 0)

    // 引用错误节点
    await node.setExpression(1, '0 + Node1')
    // 由于 Node1 不存在，应该报错或使用 0
    const result = await node.resultAt(1).textContent()
    expect(result).toMatch(/Error|0/)
  })

  test('Infinity 运算', async ({ page }) => {
    const base = new BasePage(page)
    const canvas = new CanvasPage(page)
    const node = new NodePage(page)

    await base.goto()
    await base.waitForReady()

    await canvas.addNode()
    await node.setExpression(0, '1e309')

    await canvas.addNode()
    await node.setExpression(1, 'Infinity + 1')

    await canvas.addNode()
    await node.setExpression(2, 'Infinity - Infinity')

    // Infinity + 1 = Infinity
    const result1 = await node.resultAt(1).textContent()
    expect(result1).toMatch(/Infinity|Error/)

    // Infinity - Infinity = NaN
    const result2 = await node.resultAt(2).textContent()
    expect(result2).toMatch(/NaN|Error|0/)
  })
})
