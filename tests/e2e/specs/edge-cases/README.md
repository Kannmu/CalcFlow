# CalcFlow 边界情况测试套件

本目录包含 CalcFlow 项目的全面边界情况 (Edge Cases) 测试，旨在尽可能全面多角度地测试整个页面及对应的功能。

## 测试分类

### 1. expression-edge-cases.spec.ts - 表达式边界测试
- 空表达式和空白字符处理
- 超长表达式计算
- 极大/极小数值计算
- 除零、取模零等数学错误
- 浮点数精度问题
- 括号嵌套和不匹配
- 幂运算右结合性
- 负数幂运算
- 前置多个负号
- 特殊字符和符号
- 运算符边界

### 2. dependency-edge-cases.spec.ts - 依赖系统边界测试
- 深层依赖链（10层以上）
- 菱形依赖结构
- 星型依赖结构
- 循环依赖检测和解除
- 多节点循环依赖
- 间接循环依赖
- 删除被依赖节点
- 删除中间节点影响
- 重命名节点更新依赖
- 错误状态传播
- 快速连续修改依赖
- 复杂依赖图
- 引用不存在的节点
- 节点名与函数名冲突

### 3. node-edge-cases.spec.ts - 节点管理边界测试
- 节点命名边界（空名、特殊字符、中文、超长名）
- 相同节点名引用
- 大量节点性能（50个节点）
- 长依赖链性能
- 节点删除边界
- 拖拽排序边界
- 节点名区分大小写

### 4. import-export-edge-cases.spec.ts - 导入导出边界测试
- 空JSON数组
- 空对象数组
- 缺少字段
- 包含循环依赖的工作区
- 包含深层依赖的工作区
- 包含特殊字符的节点名
- 无效JSON格式
- 非数组JSON
- 超大工作区
- 嵌套引用
- 包含错误表达式的工作区
- 空文件
- null值处理
- 导入导出一致性

### 5. autocomplete-edge-cases.spec.ts - 自动补全边界测试
- 单个字母触发补全
- 函数名补全应用
- 节点名补全
- 常量补全
- 不存在前缀处理
- Escape关闭补全
- 上下箭头选择
- Tab跳转光标
- 快速删除不触发补全
- 混合输入补全
- 补全项分类显示
- 多个相同前缀节点
- 中文输入

### 6. ui-edge-cases.spec.ts - UI/UX 边界测试
- LaTeX渲染边界
- Toast提示边界
- 响应式布局边界
- 错误状态边界
- 节点交互边界
- 快速操作边界

### 7. advanced-edge-cases.spec.ts - 高级场景测试
- 复杂场景测试（计算器模拟、金融计算、三角函数）
- 递归展开的树形依赖
- 节点聚合计算
- 错误恢复测试
- 性能压力测试
- 数据类型边界
- 特殊数学场景

## 运行测试

### 运行所有边界情况测试
```bash
npx playwright test tests/e2e/specs/edge-cases/
```

### 运行特定分类测试
```bash
npx playwright test tests/e2e/specs/edge-cases/expression-edge-cases.spec.ts
npx playwright test tests/e2e/specs/edge-cases/dependency-edge-cases.spec.ts
npx playwright test tests/e2e/specs/edge-cases/node-edge-cases.spec.ts
npx playwright test tests/e2e/specs/edge-cases/import-export-edge-cases.spec.ts
npx playwright test tests/e2e/specs/edge-cases/autocomplete-edge-cases.spec.ts
npx playwright test tests/e2e/specs/edge-cases/ui-edge-cases.spec.ts
npx playwright test tests/e2e/specs/edge-cases/advanced-edge-cases.spec.ts
```

### 带UI模式运行
```bash
npx playwright test tests/e2e/specs/edge-cases/ --ui
```

### 调试模式运行
```bash
npx playwright test tests/e2e/specs/edge-cases/ --debug
```

## 测试设计理念

1. **边界优先**: 重点测试边界条件和异常情况
2. **组合测试**: 测试多种条件的组合效果
3. **时序测试**: 测试快速连续操作和竞态条件
4. **性能测试**: 测试大规模数据和复杂依赖下的表现
5. **恢复测试**: 测试错误发生后的恢复能力
6. **一致性测试**: 确保导入导出等操作的数据一致性
