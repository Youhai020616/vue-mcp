# Vue Bits MCP Server 项目代码结构整理

## 项目概述

Vue Bits MCP Server 是一个基于 Model Context Protocol (MCP) 的服务器，为 Vue Bits 动画组件库提供智能访问功能。该项目使用 TypeScript 开发，提供了 40+ 高质量 Vue 动画组件的搜索、分析和代码获取功能。

## 目录结构

```
vue-bits-mcp/
├── 📁 src/                     # 源代码目录
│   ├── 📄 index.ts             # MCP 服务器入口点
│   ├── 📁 tools/               # MCP 工具定义和处理器
│   │   ├── 📄 index.ts         # 工具定义
│   │   └── 📄 handlers.ts      # 工具处理器实现
│   ├── 📁 parsers/             # 组件解析和搜索引擎
│   │   ├── 📄 componentParser.ts  # Vue 组件解析器
│   │   └── 📄 searchEngine.ts     # 组件搜索引擎
│   ├── 📁 types/               # TypeScript 类型定义
│   │   └── 📄 index.ts         # 所有类型定义
│   └── 📁 data/                # 缓存数据目录
│       └── 📄 components.json  # 解析后的组件数据缓存
├── 📁 demo/                    # 演示和示例
│   └── 📄 demo.js              # 演示脚本
├── 📁 scripts/                 # 构建和测试脚本
│   └── 📄 test-server.js       # 测试服务器
├── 📄 package.json             # 项目配置和依赖
├── 📄 tsconfig.json            # TypeScript 配置
├── 📄 README.md                # 项目文档
├── 📄 PROJECT_SUMMARY.md       # 项目总结
├── 📄 DEPLOYMENT.md            # 部署文档
├── 📄 example-config.json      # 示例配置
└── 📄 studio-config.json       # Studio 配置
```

## 核心模块分析

### 1. 入口模块 (`src/index.ts`)

**功能**: MCP 服务器的主入口点
**职责**:
- 初始化 MCP 服务器
- 设置请求处理器
- 管理组件数据加载和缓存
- 提供 CLI 接口

**关键类**:
- `VueBitsMCPServer`: 主服务器类

### 2. 工具模块 (`src/tools/`)

**功能**: 定义和处理 MCP 工具
**文件**:
- `index.ts`: 定义所有可用的 MCP 工具
- `handlers.ts`: 实现工具的具体处理逻辑

**提供的工具**:
- `search_vue_components`: 搜索组件
- `get_component_code`: 获取组件代码
- `get_component_props`: 获取组件属性
- `list_categories`: 列出分类
- `get_installation_guide`: 获取安装指南
- `analyze_dependencies`: 分析依赖
- `get_similar_components`: 获取相似组件
- `get_popular_components`: 获取热门组件
- `get_recommendations`: 获取推荐
- `get_component_metadata`: 获取元数据

### 3. 解析器模块 (`src/parsers/`)

**功能**: 解析 Vue 组件和提供搜索功能
**文件**:
- `componentParser.ts`: 解析 Vue 组件文件
- `searchEngine.ts`: 提供组件搜索和过滤功能

**核心功能**:
- Vue 单文件组件解析
- 组件属性提取
- 依赖分析
- 智能搜索和过滤

### 4. 类型定义 (`src/types/index.ts`)

**功能**: 定义项目中使用的所有 TypeScript 类型
**主要接口**:
- `VueBitsComponent`: 组件数据结构
- `ComponentProp`: 组件属性
- `ComponentExample`: 组件示例
- `SearchFilters`: 搜索过滤器
- `ComponentMetadata`: 组件元数据

### 5. 数据缓存 (`src/data/`)

**功能**: 存储解析后的组件数据
**文件**:
- `components.json`: 缓存的组件数据，避免重复解析

## 技术栈

### 核心依赖
- **@modelcontextprotocol/sdk**: MCP 协议实现
- **TypeScript**: 类型安全的 JavaScript
- **fs-extra**: 增强的文件系统操作
- **glob**: 文件模式匹配
- **vue-template-compiler**: Vue 模板编译
- **@vue/compiler-sfc**: Vue 单文件组件编译

### 开发依赖
- **@types/node**: Node.js 类型定义
- **eslint**: 代码检查
- **prettier**: 代码格式化

## 组件分类

项目支持 4 大类组件，共 61 个组件：

1. **文本动画** (19 个组件)
   - Split Text, Blur Text, Circular Text, Shiny Text 等

2. **动画效果** (12 个组件)
   - Splash Cursor, Pixel Transition, Magnet Lines 等

3. **UI 组件** (16 个组件)
   - Masonry, Profile Card, Carousel, Spotlight Card 等

4. **背景效果** (14 个组件)
   - Aurora, Beams, Particles, Lightning 等

## 构建和开发

### 可用脚本
```bash
npm run build          # 构建项目
npm run dev            # 开发模式（监听文件变化）
npm run start          # 启动服务器
npm run parse-components # 手动解析组件
npm run test           # 运行测试
npm run lint           # 代码检查
npm run format         # 代码格式化
npm run clean          # 清理构建文件
```

### 环境变量
- `VUE_BITS_PATH`: Vue Bits 项目目录路径（默认: `../`）

## 配置文件

- `package.json`: 项目配置、依赖管理、脚本定义
- `tsconfig.json`: TypeScript 编译配置
- `example-config.json`: MCP 客户端配置示例
- `studio-config.json`: Studio 环境配置

## 数据流

1. **初始化阶段**:
   - 检查缓存的组件数据
   - 如果缓存不存在，解析 Vue Bits 组件
   - 初始化搜索引擎和工具处理器

2. **运行阶段**:
   - 接收 MCP 工具调用请求
   - 通过搜索引擎查找和过滤组件
   - 返回格式化的组件信息

3. **缓存机制**:
   - 首次解析后将数据保存到 `data/components.json`
   - 后续启动直接加载缓存数据
   - 支持强制重新解析（`--parse` 参数）

## 扩展建议

1. **性能优化**:
   - 实现增量解析
   - 添加组件变更检测
   - 优化搜索算法

2. **功能增强**:
   - 添加组件预览功能
   - 支持自定义组件模板
   - 集成代码生成器

3. **监控和日志**:
   - 添加详细的日志记录
   - 实现性能监控
   - 错误追踪和报告

这个项目结构清晰，模块化程度高，易于维护和扩展。每个模块都有明确的职责，遵循了良好的软件设计原则。
