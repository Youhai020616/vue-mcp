# Vue Bits MCP Server - 迁移到 HTTP Stream 协议并部署到 Render

## 概述

本指南将帮助您将 Vue Bits MCP Server 从 stdio 协议迁移到 HTTP Stream (SSE) 协议，并部署到 Render 平台。

## 为什么要迁移？

### 当前架构 (stdio)
- ✅ 适合本地开发和测试
- ✅ 简单的进程间通信
- ❌ 无法部署到云平台
- ❌ 不支持多客户端连接
- ❌ 无法通过网络访问

### 目标架构 (HTTP Stream)
- ✅ 支持云平台部署
- ✅ 支持多客户端并发连接
- ✅ 通过 HTTP/HTTPS 网络访问
- ✅ 支持负载均衡和扩展
- ✅ 更好的监控和日志记录

## 迁移步骤

### 第一步：安装新依赖

```bash
npm install express cors helmet morgan uuid
npm install --save-dev @types/express @types/cors @types/uuid
```

### 第二步：创建 HTTP 服务器

创建新文件 `src/server/httpServer.ts`：

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SearchEngine } from '../parsers/searchEngine.js';
import { ToolHandlers } from '../tools/handlers.js';
import { ALL_TOOLS } from '../tools/index.js';

export class HttpMcpServer {
  private app: express.Application;
  private server: Server;
  private searchEngine: SearchEngine | null = null;
  private toolHandlers: ToolHandlers | null = null;
  private sessions: Map<string, any> = new Map();

  constructor() {
    this.app = express();
    this.server = new Server(
      {
        name: 'vue-bits-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupMiddleware();
    this.setupRoutes();
    this.setupHandlers();
  }

  private setupMiddleware(): void {
    // 安全中间件
    this.app.use(helmet());
    
    // CORS 配置
    this.app.use(cors({
      origin: (origin, callback) => {
        // 在生产环境中，应该验证 origin
        // 这里允许所有 origin，但在生产中应该限制
        callback(null, true);
      },
      credentials: true
    }));

    // 日志中间件
    this.app.use(morgan('combined'));

    // JSON 解析
    this.app.use(express.json({ limit: '10mb' }));
  }

  private setupRoutes(): void {
    // 健康检查端点
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // MCP 端点
    this.app.post('/mcp', this.handleMcpPost.bind(this));
    this.app.get('/mcp', this.handleMcpGet.bind(this));

    // 根路径
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Vue Bits MCP Server',
        version: '1.0.0',
        protocol: 'http-stream',
        endpoints: {
          mcp: '/mcp',
          health: '/health'
        }
      });
    });
  }

  private async handleMcpPost(req: express.Request, res: express.Response): Promise<void> {
    try {
      // 确保工具处理器已初始化
      if (!this.toolHandlers) {
        await this.initializeComponents();
      }

      const message = req.body;
      const sessionId = req.headers['mcp-session-id'] as string;

      // 处理初始化请求
      if (message.method === 'initialize') {
        const newSessionId = uuidv4();
        this.sessions.set(newSessionId, { createdAt: new Date() });
        
        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              logging: {}
            },
            serverInfo: {
              name: 'vue-bits-mcp',
              version: '1.0.0'
            }
          }
        };

        res.setHeader('Mcp-Session-Id', newSessionId);
        res.json(response);
        return;
      }

      // 验证会话
      if (sessionId && !this.sessions.has(sessionId)) {
        res.status(404).json({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32001,
            message: 'Session not found'
          }
        });
        return;
      }

      // 处理其他请求
      const response = await this.processMessage(message);
      
      if (this.shouldUseSSE(message)) {
        // 返回 SSE 流
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        res.write(`data: ${JSON.stringify(response)}\n\n`);
        res.end();
      } else {
        // 返回单个 JSON 响应
        res.json(response);
      }

    } catch (error) {
      console.error('Error handling MCP POST:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        id: req.body?.id,
        error: {
          code: -32603,
          message: 'Internal error'
        }
      });
    }
  }

  private async handleMcpGet(req: express.Request, res: express.Response): Promise<void> {
    // 处理服务器发起的 SSE 流
    const sessionId = req.headers['mcp-session-id'] as string;
    
    if (sessionId && !this.sessions.has(sessionId)) {
      res.status(404).send('Session not found');
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 发送初始连接确认
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // 保持连接活跃
    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
    });
  }

  private shouldUseSSE(message: any): boolean {
    // 根据消息类型决定是否使用 SSE
    // 对于长时间运行的操作，使用 SSE
    return message.method === 'tools/call' && 
           message.params?.name === 'search_vue_components';
  }

  private async processMessage(message: any): Promise<any> {
    if (!this.toolHandlers) {
      throw new Error('Tool handlers not initialized');
    }

    // 模拟 MCP 请求格式
    const request = {
      method: 'tools/call',
      params: message
    };

    return await this.toolHandlers.handleToolCall(request);
  }

  private setupHandlers(): void {
    // 设置 MCP 服务器处理器
    this.server.setRequestHandler('tools/list', async () => {
      return { tools: ALL_TOOLS };
    });

    this.server.setRequestHandler('tools/call', async (request) => {
      if (!this.toolHandlers) {
        await this.initializeComponents();
      }
      return await this.toolHandlers!.handleToolCall(request);
    });
  }

  private async initializeComponents(): Promise<void> {
    // 复用现有的初始化逻辑
    // ... (从原始 index.ts 复制初始化代码)
  }

  public async start(port: number = 10000): Promise<void> {
    await this.initializeComponents();
    
    this.app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Vue Bits MCP HTTP Server running on port ${port}`);
      console.log(`📡 MCP endpoint: http://localhost:${port}/mcp`);
      console.log(`🏥 Health check: http://localhost:${port}/health`);
    });
  }
}
```

### 第三步：修改入口文件

修改 `src/index.ts`：

```typescript
#!/usr/bin/env node

import { HttpMcpServer } from './server/httpServer.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Vue Bits MCP Server - HTTP Stream Protocol

Usage:
  vue-bits-mcp [options]

Options:
  --help, -h          Show this help message
  --port, -p          Port to listen on (default: from PORT env or 10000)
  --parse             Parse Vue Bits components and update cache
  --vue-bits-path     Path to Vue Bits project (default: ../)

Environment Variables:
  PORT                Port to listen on
  VUE_BITS_PATH       Path to Vue Bits project directory

Examples:
  vue-bits-mcp
  vue-bits-mcp --port 3000
  PORT=8080 vue-bits-mcp
`);
    process.exit(0);
  }

  // 解析命令行参数
  const portIndex = args.findIndex(arg => arg === '--port' || arg === '-p');
  const port = portIndex !== -1 && args[portIndex + 1] 
    ? parseInt(args[portIndex + 1]) 
    : parseInt(process.env.PORT || '10000');

  if (args.includes('--parse')) {
    // 保持原有的解析逻辑
    console.log('🔄 Force parsing Vue Bits components...');
    // ... 解析逻辑
    process.exit(0);
  }

  // 启动 HTTP 服务器
  const server = new HttpMcpServer();
  await server.start(port);
}

// 处理进程信号
process.on('SIGINT', () => {
  console.log('\n👋 Vue Bits MCP Server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Vue Bits MCP Server shutting down...');
  process.exit(0);
});

// 启动服务器
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}
```

### 第四步：更新 package.json

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "start:http": "node dist/index.js",
    "parse-components": "node dist/parsers/componentParser.js",
    "test": "node scripts/test-server.js",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src",
    "clean": "rm -rf dist",
    "prepublishOnly": "npm run clean && npm run build",
    "postinstall": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "uuid": "^9.0.1",
    "fs-extra": "^11.2.0",
    "glob": "^10.3.10",
    "vue-template-compiler": "^2.7.16",
    "@vue/compiler-sfc": "^3.4.0",
    "typescript": "^5.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/uuid": "^9.0.7",
    "@types/fs-extra": "^11.0.4",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1"
  }
}
```

## Render 部署配置

### 创建 render.yaml

```yaml
services:
  - type: web
    name: vue-bits-mcp-server
    env: node
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: VUE_BITS_PATH
        value: ./
    healthCheckPath: /health
```

### 环境变量配置

在 Render Dashboard 中设置以下环境变量：

- `NODE_ENV`: `production`
- `PORT`: `10000` (Render 会自动设置)
- `VUE_BITS_PATH`: `./` 或您的 Vue Bits 项目路径

## 部署到 Render

1. **推送代码到 Git 仓库**
   ```bash
   git add .
   git commit -m "Migrate to HTTP Stream protocol"
   git push origin main
   ```

2. **在 Render 创建 Web Service**
   - 访问 [Render Dashboard](https://dashboard.render.com)
   - 点击 "New" > "Web Service"
   - 连接您的 Git 仓库
   - 配置服务：
     - **Name**: `vue-bits-mcp-server`
     - **Language**: `Node`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Health Check Path**: `/health`

3. **配置环境变量**
   - 在 Render Dashboard 的服务设置中添加环境变量

4. **部署**
   - Render 会自动构建和部署您的应用
   - 部署完成后，您会获得一个 `onrender.com` 的 URL

## 客户端连接配置

部署完成后，客户端可以通过以下方式连接：

```json
{
  "mcpServers": {
    "vue-bits": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "-H", "Content-Type: application/json",
        "-H", "Accept: application/json, text/event-stream",
        "https://your-app-name.onrender.com/mcp"
      ]
    }
  }
}
```

或者使用 HTTP 客户端直接连接：
```
https://your-app-name.onrender.com/mcp
```

## 测试部署

1. **健康检查**
   ```bash
   curl https://your-app-name.onrender.com/health
   ```

2. **MCP 初始化**
   ```bash
   curl -X POST https://your-app-name.onrender.com/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{
       "jsonrpc": "2.0",
       "id": 1,
       "method": "initialize",
       "params": {
         "protocolVersion": "2024-11-05",
         "capabilities": {},
         "clientInfo": {
           "name": "test-client",
           "version": "1.0.0"
         }
       }
     }'
   ```

## 安全考虑

1. **Origin 验证**: 在生产环境中限制允许的 origin
2. **认证**: 考虑添加 API 密钥或 OAuth 认证
3. **速率限制**: 添加请求速率限制
4. **HTTPS**: Render 自动提供 HTTPS
5. **环境变量**: 敏感信息存储在环境变量中

## 监控和日志

- 使用 Render Dashboard 查看日志
- 设置健康检查监控
- 考虑集成第三方监控服务

## 故障排除

### 常见问题

1. **端口绑定错误**: 确保监听 `0.0.0.0` 和正确的端口
2. **健康检查失败**: 确保 `/health` 端点正常响应
3. **CORS 错误**: 检查 CORS 配置
4. **会话管理**: 确保正确处理会话 ID

### 调试技巧

1. 查看 Render 部署日志
2. 使用 `curl` 测试端点
3. 检查环境变量设置
4. 验证构建和启动命令

## 下一步

1. 添加更多安全功能
2. 实现负载均衡
3. 添加缓存层
4. 集成监控和告警
5. 优化性能

这样您就成功将 Vue Bits MCP Server 迁移到了 HTTP Stream 协议并部署到了 Render 平台！
