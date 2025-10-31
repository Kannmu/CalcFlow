export type Associativity = 'left' | 'right'

export interface OperatorDef {
  precedence: number
  associativity: Associativity
  compute: (a: number, b: number) => number
  latex: (params: {
    left: string
    right: string
    ctx?: {
      leftNode: any
      rightNode: any
      wrapParens: (s: string) => string
      needsParens: (n: any) => boolean
    }
  }) => string
}

export interface UnaryOperatorDef {
  compute: (a: number) => number
  latex: (params: {
    inner: string
    ctx?: {
      exprNode: any
      wrapParens: (s: string) => string
      isComplexNode: (n: any) => boolean
    }
  }) => string
}

export interface FunctionDef {
  arity: number | [number, number]
  compute: (...args: number[]) => number
  latex: (
    ...args: [...argsLatex: string[], ctx: {
      argsNodes: any[]
      wrapParens: (s: string) => string
      needsParens: (n: any) => boolean
    }]
  ) => string
}

export interface MathRegistry {
  registerOperator: (symbol: string, def: OperatorDef) => void
  registerUnaryOperator: (symbol: string, def: UnaryOperatorDef) => void
  registerFunction: (name: string, def: FunctionDef) => void
  getOperator: (symbol: string) => OperatorDef | undefined
  getUnaryOperator: (symbol: string) => UnaryOperatorDef | undefined
  getFunction: (name: string) => FunctionDef | undefined
  operatorSymbols: () => string[]
}