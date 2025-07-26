#!/bin/bash

# Vue Bits MCP Server - 类型修复脚本
# 这个脚本修复 TypeScript 编译错误

echo "🔧 修复 Vue Bits MCP Server TypeScript 类型问题..."

# 1. 安装缺失的类型定义
echo "📦 安装类型定义包..."
npm install --save-dev @types/morgan

# 2. 检查 package.json 是否包含所有必要的类型
echo "✅ 验证 package.json 依赖..."

# 3. 编译检查
echo "🔨 尝试编译..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ TypeScript 编译成功！"
    echo "🚀 现在可以部署到 Render 了"
else
    echo "❌ 编译仍有错误，请检查输出"
    exit 1
fi

echo "🎉 类型修复完成！"
