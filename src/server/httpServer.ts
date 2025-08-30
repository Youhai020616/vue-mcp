import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { ComponentParser } from '../parsers/componentParser.js';
import { SearchEngine } from '../parsers/searchEngine.js';
import { ToolHandlers } from '../tools/handlers.js';
import { ALL_TOOLS } from '../tools/index.js';
import { VueBitsComponent } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class HttpMcpServer {
  private app: express.Application;
  private server: Server;
  private searchEngine: SearchEngine | null = null;
  private toolHandlers: ToolHandlers | null = null;
  private sessions: Map<string, any> = new Map();
  private componentsDataPath: string;
  private vueBitsPath: string;

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
          logging: {}
        },
      }
    );

    // 路径配置
    this.componentsDataPath = path.join(__dirname, '../../data/components.json');
    this.vueBitsPath = process.env.VUE_BITS_PATH || path.join(__dirname, '../../../');

    this.setupMiddleware();
    this.setupRoutes();
    this.setupHandlers();
  }

  private setupMiddleware(): void {
    // 安全中间件
    this.app.use(helmet({
      contentSecurityPolicy: false, // 允许 SSE
      crossOriginEmbedderPolicy: false
    }));
    
    // CORS 配置
    this.app.use(cors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // 在生产环境中，应该验证 origin 防止 DNS rebinding 攻击
        // 这里允许所有 origin，但在生产中应该限制
        if (!origin || this.isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept', 'Mcp-Session-Id', 'MCP-Protocol-Version', 'Last-Event-ID']
    }));

    // 日志中间件
    if (process.env.NODE_ENV !== 'production') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }

    // JSON 解析
    this.app.use(express.json({ limit: '10mb' }));
    
    // 处理预检请求
    this.app.options('*', cors());
  }

  private isAllowedOrigin(origin: string): boolean {
    // 在生产环境中实现严格的 origin 验证
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    // 开发环境允许 localhost
    if (process.env.NODE_ENV !== 'production') {
      return origin.includes('localhost') || origin.includes('127.0.0.1') || allowedOrigins.includes(origin);
    }
    
    return allowedOrigins.includes(origin);
  }

  private setupRoutes(): void {
    // 健康检查端点
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        protocol: 'http-stream'
      });
    });

    // 根路径信息
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'Vue Bits MCP Server',
        version: '1.0.0',
        protocol: 'http-stream',
        endpoints: {
          mcp: '/mcp',
          health: '/health'
        },
        capabilities: {
          tools: true,
          logging: true,
          sse: true
        }
      });
    });

    // MCP 端点
    this.app.post('/mcp', this.handleMcpPost.bind(this));
    this.app.get('/mcp', this.handleMcpGet.bind(this));
    this.app.delete('/mcp', this.handleMcpDelete.bind(this));

    // 错误处理
    this.app.use(this.errorHandler.bind(this));
  }

  private async handleMcpPost(req: Request, res: Response): Promise<void> {
    try {
      const message = req.body;
      const sessionId = req.headers['mcp-session-id'] as string;
      const protocolVersion = req.headers['mcp-protocol-version'] as string || '2024-11-05';

      console.log(`📨 Received MCP message: ${message.method}`);

      // 验证协议版本
      if (protocolVersion && !this.isSupportedProtocolVersion(protocolVersion)) {
        res.status(400).json({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32600,
            message: `Unsupported protocol version: ${protocolVersion}`
          }
        });
        return;
      }

      // 处理初始化请求
      if (message.method === 'initialize') {
        await this.handleInitialize(message, res);
        return;
      }

      // 处理初始化完成通知
      if (message.method === 'notifications/initialized') {
        res.status(202).send();
        return;
      }

      // 验证会话（除了初始化请求）
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

      // 确保组件已初始化
      if (!this.toolHandlers) {
        await this.initializeComponents();
      }

      // 处理工具相关请求
      if (message.method === 'tools/list') {
        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result: { tools: ALL_TOOLS }
        };
        res.json(response);
        return;
      }

      if (message.method === 'tools/call') {
        await this.handleToolCall(message, res, sessionId);
        return;
      }

      // 处理其他通知
      if (!message.id) {
        res.status(202).send();
        return;
      }

      // 未知方法
      res.status(400).json({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32601,
          message: `Method not found: ${message.method}`
        }
      });

    } catch (error) {
      console.error('❌ Error handling MCP POST:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        id: req.body?.id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        }
      });
    }
  }

  private async handleInitialize(message: any, res: Response): Promise<void> {
    const newSessionId = uuidv4();
    this.sessions.set(newSessionId, { 
      createdAt: new Date(),
      clientInfo: message.params?.clientInfo
    });
    
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
    
    console.log(`✅ New session created: ${newSessionId}`);
  }

  private async handleToolCall(message: any, res: Response, sessionId?: string): Promise<void> {
    if (!this.toolHandlers) {
      throw new Error('Tool handlers not initialized');
    }

    const toolName = message.params?.name;
    const isLongRunning = this.isLongRunningTool(toolName);

    if (isLongRunning) {
      // 使用 SSE 流式响应
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      try {
        const result = await this.toolHandlers.handleToolCall({
          method: 'tools/call',
          params: message.params
        });

        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result
        };

        res.write(`data: ${JSON.stringify(response)}\n\n`);
        res.end();
      } catch (error) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32603,
            message: (error as Error).message
          }
        };
        res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
        res.end();
      }
    } else {
      // 普通 JSON 响应
      try {
        const result = await this.toolHandlers.handleToolCall({
          method: 'tools/call',
          params: message.params
        });

        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result
        };

        res.json(response);
      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32603,
            message: (error as Error).message
          }
        });
      }
    }
  }

  private async handleMcpGet(req: Request, res: Response): Promise<void> {
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
    res.write(`data: ${JSON.stringify({ 
      type: 'connected', 
      timestamp: new Date().toISOString() 
    })}\n\n`);

    // 保持连接活跃
    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({ 
        type: 'ping', 
        timestamp: new Date().toISOString() 
      })}\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(keepAlive);
      console.log('📡 SSE connection closed');
    });

    console.log('📡 SSE connection established');
  }

  private async handleMcpDelete(req: Request, res: Response): Promise<void> {
    // 处理会话终止
    const sessionId = req.headers['mcp-session-id'] as string;
    
    if (sessionId && this.sessions.has(sessionId)) {
      this.sessions.delete(sessionId);
      console.log(`🗑️ Session terminated: ${sessionId}`);
      res.status(200).send('Session terminated');
    } else {
      res.status(404).send('Session not found');
    }
  }

  private isSupportedProtocolVersion(version: string): boolean {
    const supportedVersions = ['2024-11-05', '2025-03-26', '2025-06-18'];
    return supportedVersions.includes(version);
  }

  private isLongRunningTool(toolName: string): boolean {
    // 定义哪些工具需要流式响应
    const longRunningTools = ['search_vue_components', 'analyze_dependencies'];
    return longRunningTools.includes(toolName);
  }

  private setupHandlers(): void {
    // 这些处理器主要用于内部逻辑，HTTP 路由会直接处理请求
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: ALL_TOOLS };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.toolHandlers) {
        await this.initializeComponents();
      }
      return await this.toolHandlers!.handleToolCall(request);
    });
  }

  private async initializeComponents(): Promise<void> {
    try {
      console.log('🚀 Initializing Vue Bits MCP Server components...');

      let components: VueBitsComponent[] = [];

      // 尝试加载现有组件数据
      if (await fs.pathExists(this.componentsDataPath)) {
        console.log('📂 Loading existing components data...');
        try {
          components = await fs.readJson(this.componentsDataPath);
          console.log(`✅ Loaded ${components.length} components from cache`);
        } catch (error) {
          console.warn('⚠️ Failed to load cached components, will use fallback data');
          components = this.getFallbackComponents();
        }
      } else {
        console.log('🔍 Parsing Vue Bits components...');

        // 检查 Vue Bits 路径是否存在
        if (!(await fs.pathExists(this.vueBitsPath))) {
          console.warn(`⚠️ Vue Bits path not found: ${this.vueBitsPath}`);
          console.log('📦 Using fallback component data for demo purposes');
          components = this.getFallbackComponents();
        } else {
          try {
            // 从源码解析组件
            const parser = new ComponentParser(this.vueBitsPath);
            components = await parser.parseAllComponents();

            // 保存解析的数据以供将来使用
            await fs.ensureDir(path.dirname(this.componentsDataPath));
            await parser.saveComponentsData(this.componentsDataPath);
            console.log(`💾 Cached ${components.length} components`);
          } catch (parseError) {
            console.warn('⚠️ Failed to parse components from source:', (parseError as Error).message);
            console.log('📦 Using fallback component data');
            components = this.getFallbackComponents();
          }
        }
      }

      // 初始化搜索引擎和工具处理器
      this.searchEngine = new SearchEngine(components);
      this.toolHandlers = new ToolHandlers(this.searchEngine);

      console.log('✅ Vue Bits MCP Server components initialized successfully!');
      console.log(`📊 Available: ${components.length} components`);

      // 记录一些统计信息
      if (components.length > 0) {
        const metadata = this.searchEngine.getMetadata();
        console.log('📈 Component breakdown:');
        Object.entries(metadata.categories).forEach(([category, data]: [string, any]) => {
          console.log(`   - ${category}: ${data.count} components`);
        });
      } else {
        console.log('ℹ️ Server running in demo mode with limited functionality');
      }

    } catch (error) {
      console.error('❌ Failed to initialize components:', error);
      console.log('🔄 Falling back to minimal component set');

      // 优雅降级：使用最小的组件集合
      const fallbackComponents = this.getFallbackComponents();
      this.searchEngine = new SearchEngine(fallbackComponents);
      this.toolHandlers = new ToolHandlers(this.searchEngine);

      console.log(`✅ Server initialized with ${fallbackComponents.length} fallback components`);
    }
  }

  private getFallbackComponents(): VueBitsComponent[] {
    // 提供一些示例组件数据，用于演示和测试
    return [
      {
        id: 'blur-text',
        name: 'BlurText',
        description: 'A text component with blur animation effect',
        category: 'TextAnimations',
        subcategory: 'Text Effects',
        tags: ['text', 'animation', 'blur'],
        props: [
          {
            name: 'text',
            type: 'string',
            required: true,
            description: 'The text to display'
          },
          {
            name: 'delay',
            type: 'number',
            required: false,
            default: '0',
            description: 'Animation delay in milliseconds'
          }
        ],
        examples: [
          {
            title: 'Basic Usage',
            code: '<BlurText text="Hello World" />',
            description: 'Simple blur text animation'
          }
        ],
        code: `<template>
  <div class="blur-text">
    {{ text }}
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    required: true
  },
  delay: {
    type: Number,
    default: 0
  }
})
</script>

<style scoped>
.blur-text {
  filter: blur(10px);
  animation: unblur 1s ease-out forwards;
}

@keyframes unblur {
  to {
    filter: blur(0);
  }
}
</style>`,
        dependencies: [],
        filePath: 'demo/BlurText.vue',
        complexity: 'simple',
        performance: 'high',
        lastModified: new Date().toISOString()
      },
      {
        id: 'fade-in',
        name: 'FadeIn',
        description: 'A component with fade-in animation effect',
        category: 'Animations',
        subcategory: 'Transitions',
        tags: ['animation', 'fade', 'transition'],
        props: [
          {
            name: 'duration',
            type: 'number',
            required: false,
            default: '1000',
            description: 'Animation duration in milliseconds'
          }
        ],
        examples: [
          {
            title: 'Basic Fade In',
            code: '<FadeIn><p>Content to fade in</p></FadeIn>',
            description: 'Fade in any content'
          }
        ],
        code: `<template>
  <div class="fade-in">
    <slot />
  </div>
</template>

<script setup>
defineProps({
  duration: {
    type: Number,
    default: 1000
  }
})
</script>

<style scoped>
.fade-in {
  opacity: 0;
  animation: fadeIn var(--duration, 1s) ease-in forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}
</style>`,
        dependencies: [],
        filePath: 'demo/FadeIn.vue',
        complexity: 'simple',
        performance: 'high',
        lastModified: new Date().toISOString()
      },
      {
        id: 'loading-spinner',
        name: 'LoadingSpinner',
        description: 'A customizable loading spinner component',
        category: 'Components',
        subcategory: 'UI Elements',
        tags: ['loading', 'spinner', 'ui'],
        props: [
          {
            name: 'size',
            type: 'string',
            required: false,
            default: 'medium',
            description: 'Size of the spinner (small, medium, large)'
          },
          {
            name: 'color',
            type: 'string',
            required: false,
            default: '#3b82f6',
            description: 'Color of the spinner'
          }
        ],
        examples: [
          {
            title: 'Default Spinner',
            code: '<LoadingSpinner />',
            description: 'Default loading spinner'
          },
          {
            title: 'Custom Spinner',
            code: '<LoadingSpinner size="large" color="#ef4444" />',
            description: 'Large red spinner'
          }
        ],
        code: `<template>
  <div class="loading-spinner" :class="sizeClass" :style="{ color }">
    <div class="spinner"></div>
  </div>
</template>

<script setup>
const props = defineProps({
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  },
  color: {
    type: String,
    default: '#3b82f6'
  }
})

const sizeClass = computed(() => \`spinner-\${props.size}\`)
</script>

<style scoped>
.loading-spinner {
  display: inline-block;
}

.spinner {
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-left-color: currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-small .spinner {
  width: 16px;
  height: 16px;
}

.spinner-medium .spinner {
  width: 24px;
  height: 24px;
}

.spinner-large .spinner {
  width: 32px;
  height: 32px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>`,
        dependencies: [],
        filePath: 'demo/LoadingSpinner.vue',
        complexity: 'simple',
        performance: 'high',
        lastModified: new Date().toISOString()
      }
    ];
  }

  private errorHandler(error: any, req: Request, res: Response, next: NextFunction): void {
    console.error('💥 Unhandled error:', error);
    
    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
        data: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      }
    });
  }

  public async start(port: number = 10000): Promise<void> {
    // 预初始化组件
    await this.initializeComponents();
    
    this.app.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Vue Bits MCP HTTP Server running on port ${port}`);
      console.log(`📡 MCP endpoint: http://0.0.0.0:${port}/mcp`);
      console.log(`🏥 Health check: http://0.0.0.0:${port}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }
}
