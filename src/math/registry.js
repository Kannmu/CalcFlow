const mathRegistry = (function () {
  const operators = new Map()
  const unaryOperators = new Map()
  const functions = new Map()
  const constants = new Map()

  function registerOperator(symbol, def) {
    operators.set(symbol, def)
  }

  function registerUnaryOperator(symbol, def) {
    unaryOperators.set(symbol, def)
  }

  function registerFunction(name, def) {
    functions.set(String(name).toLowerCase(), def)
  }
  function registerConstant(name, def) {
    constants.set(String(name).toLowerCase(), def)
  }

  function getOperator(symbol) {
    return operators.get(symbol)
  }

  function getUnaryOperator(symbol) {
    return unaryOperators.get(symbol)
  }

  function getFunction(name) {
    return functions.get(String(name).toLowerCase())
  }
  function getConstant(name) {
    return constants.get(String(name).toLowerCase())
  }

  function operatorSymbols() {
    return Array.from(operators.keys())
  }
  function functionNames() {
    return Array.from(functions.keys())
  }
  function constantNames() {
    return Array.from(constants.keys())
  }

  function initDefaults() {
    registerOperator('+', {
      precedence: 1,
      associativity: 'left',
      compute: (a, b) => a + b,
      latex: ({ left, right }) => left + ' + ' + right,
    })

    registerOperator('-', {
      precedence: 1,
      associativity: 'left',
      compute: (a, b) => a - b,
      latex: ({ left, right }) => left + ' - ' + right,
    })

    registerOperator('*', {
      precedence: 2,
      associativity: 'left',
      compute: (a, b) => a * b,
      latex: ({ left, right }) => left + ' \\cdot ' + right,
    })

    registerOperator('/', {
      precedence: 2,
      associativity: 'left',
      compute: (a, b) => (b === 0 ? NaN : a / b),
      latex: ({ left, right }) => '\\frac{' + left + '}{' + right + '}',
    })

    registerOperator('%', {
      precedence: 2,
      associativity: 'left',
      compute: (a, b) => (b === 0 ? NaN : a % b),
      latex: ({ left, right }) => left + ' \\bmod ' + right,
    })

    registerOperator('^', {
      precedence: 3,
      associativity: 'right',
      compute: (a, b) => Math.pow(a, b),
      latex: ({ left, right, ctx }) => {
        const base = ctx && ctx.needsParens(ctx.leftNode) ? ctx.wrapParens(left) : left
        return base + '^{' + right + '}'
      },
    })

    registerUnaryOperator('-', {
      compute: (a) => -a,
      latex: ({ inner, ctx }) => {
        const s = inner
        if (ctx && ctx.isComplexNode(ctx.exprNode)) {
          return '-' + ctx.wrapParens(s)
        }
        return '-' + s
      },
    })

    registerFunction('sqrt', {
      arity: 1,
      compute: (a) => (a < 0 ? NaN : Math.sqrt(a)),
      latex: (a) => '\\sqrt{' + a + '}',
    })

    registerFunction('pow', {
      arity: 2,
      compute: (a, b) => Math.pow(a, b),
      latex: (a, b, ctx) => {
        const base = ctx.needsParens(ctx.argsNodes[0]) ? ctx.wrapParens(a) : a
        return base + '^{' + b + '}'
      },
    })

    registerFunction('log', {
      arity: 2,
      compute: (a, b) => {
        const valid = a > 0 && b > 0 && b !== 1
        return valid ? Math.log(a) / Math.log(b) : NaN
      },
      latex: (a, b) => '\\log_{' + b + '}\\left(' + a + '\\right)',
    })

    const oneArg = [
      ['sin', '\\sin', Math.sin],
      ['cos', '\\cos', Math.cos],
      ['tan', '\\tan', Math.tan],
      ['ln', '\\ln', (x) => (x <= 0 ? NaN : Math.log(x))],
      ['asin', '\\arcsin', Math.asin],
      ['acos', '\\arccos', Math.acos],
      ['atan', '\\arctan', Math.atan],
    ]
    for (const [name, latexName, fn] of oneArg) {
      registerFunction(name, {
        arity: 1,
        compute: (a) => fn(a),
        latex: (a) => latexName + '\\left(' + a + '\\right)',
      })
    }

    registerConstant('pi', { value: Math.PI })
  }

  initDefaults()

  return {
    registerOperator,
    registerUnaryOperator,
    registerFunction,
    registerConstant,
    getOperator,
    getUnaryOperator,
    getFunction,
    getConstant,
    operatorSymbols,
    functionNames,
    constantNames,
  }
})()

export { mathRegistry }