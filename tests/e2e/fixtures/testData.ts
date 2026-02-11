export const testData = {
  expressionA: '2 + 3 * 4',
  expressionB: '10',
  expressionRefA: 'A + 5',
  expressionSelfRef: 'A + 1',
  expressionCircularA: 'B + 1',
  expressionCircularB: 'A + 1',
  exportFileName: 'calcflow_workspace.json',
  // 边界情况测试数据
  edgeCases: {
    // 数值边界
    veryLargeNumber: '1e308',
    verySmallNumber: '1e-308',
    divisionByZero: '10 / 0',
    moduloByZero: '10 % 0',
    floatPrecision: '0.1 + 0.2',

    // 括号边界
    unmatchedLeftParen: '(1 + 2',
    unmatchedRightParen: '1 + 2)',
    deepNesting: '((((1 + 2) * 3) - 4) / 5)',

    // 运算符边界
    powerRightAssociative: '2 ^ 3 ^ 2', // 应该是 512 不是 64
    multipleNegatives: '--5',
    onlyOperators: '+ - * /',

    // 函数边界
    sqrtNegative: 'sqrt(-1)',
    logNonPositive: 'ln(0)',
    logBaseOne: 'log(10, 1)',
    acosOutOfRange: 'acos(2)',

    // 空值边界
    emptyExpression: '',
    whitespaceOnly: '   \t\n  ',

    // 常量
    pi: 'pi',
    piUpperCase: 'PI',

    // 特殊数值
    infinity: '1e309',
    negativeInfinity: '-1e309',

    // 科学计数法
    scientificNotation: '1.5e3 + 2.5e-2',

    // 复杂表达式
    complexMath: 'sin(30) + cos(60) * sqrt(16)',
    nestedFunctions: 'sin(cos(sqrt(16)))',
  },

  // 依赖测试数据
  dependencyCases: {
    chain10: Array.from({ length: 10 }, (_, i) => ({
      header: String.fromCharCode(65 + i),
      expression: i === 0 ? '1' : `${String.fromCharCode(64 + i)} + 1`
    })),

    diamond: [
      { header: 'A', expression: '10' },
      { header: 'B', expression: 'A * 2' },
      { header: 'C', expression: 'A + 5' },
      { header: 'D', expression: 'B + C' }
    ],

    circular: [
      { header: 'A', expression: 'B + 1' },
      { header: 'B', expression: 'A + 1' }
    ],

    tree: [
      { header: 'Root', expression: '10' },
      { header: 'Left', expression: 'Root * 2' },
      { header: 'Right', expression: 'Root * 3' },
      { header: 'LL', expression: 'Left + 1' },
      { header: 'LR', expression: 'Left + 2' },
      { header: 'RL', expression: 'Right + 1' },
      { header: 'RR', expression: 'Right + 2' }
    ]
  }
}
