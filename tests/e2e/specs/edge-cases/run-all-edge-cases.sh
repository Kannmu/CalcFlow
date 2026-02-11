#!/bin/bash

# CalcFlow 边界情况测试运行脚本

echo "=========================================="
echo "CalcFlow Edge Cases Test Suite"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

# 运行所有边界情况测试
echo "Running all edge case tests..."
echo ""

npx playwright test tests/e2e/specs/edge-cases/ "$@"

EXIT_CODE=$?

echo ""
echo "=========================================="
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ All edge case tests passed!"
else
    echo "❌ Some tests failed. Check the report above."
fi
echo "=========================================="

exit $EXIT_CODE
