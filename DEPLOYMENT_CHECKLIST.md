# Vue Bits MCP Server - Render 部署检查清单

## 部署前检查

### ✅ 代码准备
- [ ] 已安装新的 HTTP 依赖 (`npm install express cors helmet morgan uuid`)
- [ ] 已创建 `src/server/httpServer.ts` 文件
- [ ] 已更新 `src/index.ts` 入口文件
- [ ] 已更新 `package.json` 依赖和脚本
- [ ] 已创建 `render.yaml` 配置文件
- [ ] 代码已提交到 Git 仓库

### ✅ 本地测试
- [ ] 本地构建成功 (`npm run build`)
- [ ] HTTP 服务器启动成功 (`npm start`)
- [ ] 健康检查端点响应正常 (`curl http://localhost:10000/health`)
- [ ] MCP 端点响应正常 (使用示例客户端测试)
- [ ] 所有工具功能正常

### ✅ 环境配置
- [ ] 确认 `PORT` 环境变量处理正确
- [ ] 确认 `NODE_ENV` 设置为 `production`
- [ ] 确认 `VUE_BITS_PATH` 配置正确
- [ ] 确认 `ALLOWED_ORIGINS` 配置适当

## Render 部署步骤

### 1. 创建 Web Service
1. 登录 [Render Dashboard](https://dashboard.render.com)
2. 点击 "New" → "Web Service"
3. 选择 "Build and deploy from a Git repository"
4. 连接您的 GitHub/GitLab 仓库
5. 选择正确的分支

### 2. 配置服务设置
```
Name: vue-bits-mcp-server
Language: Node
Build Command: npm install && npm run build
Start Command: npm start
```

### 3. 高级设置
- **Health Check Path**: `/health`
- **Instance Type**: 选择适当的实例类型
- **Auto-Deploy**: 启用自动部署

### 4. 环境变量设置
在 Render Dashboard 中设置以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NODE_ENV` | `production` | 运行环境 |
| `VUE_BITS_PATH` | `./` | Vue Bits 项目路径 |
| `ALLOWED_ORIGINS` | `https://claude.ai,https://app.anthropic.com` | 允许的来源 |

### 5. 部署
- 点击 "Create Web Service"
- 等待构建和部署完成
- 记录分配的 URL (例如: `https://vue-bits-mcp-server.onrender.com`)

## 部署后验证

### ✅ 基本功能测试
- [ ] 服务器启动成功 (检查 Render 日志)
- [ ] 健康检查正常: `curl https://your-app.onrender.com/health`
- [ ] 根端点响应: `curl https://your-app.onrender.com/`
- [ ] MCP 初始化成功 (使用测试脚本)

### ✅ MCP 协议测试
使用以下命令测试 MCP 初始化：

```bash
curl -X POST https://your-app.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "MCP-Protocol-Version: 2024-11-05" \
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

预期响应：
- HTTP 200 状态码
- `Mcp-Session-Id` 头部存在
- JSON 响应包含服务器信息

### ✅ 工具功能测试
1. 列出工具：
```bash
curl -X POST https://your-app.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'
```

2. 调用搜索工具：
```bash
curl -X POST https://your-app.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "search_vue_components",
      "arguments": {
        "query": "text",
        "limit": 5
      }
    }
  }'
```

### ✅ 性能和监控
- [ ] 响应时间合理 (< 2秒)
- [ ] 内存使用正常
- [ ] 无错误日志
- [ ] CORS 头部正确设置

## 客户端配置

### Claude Desktop 配置
更新 `claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "vue-bits": {
      "command": "curl",
      "args": [
        "-X", "POST",
        "-H", "Content-Type: application/json",
        "-H", "Accept: application/json, text/event-stream",
        "https://your-app.onrender.com/mcp"
      ]
    }
  }
}
```

### 自定义客户端
使用提供的 `examples/http-client-example.js` 作为参考：

```bash
node examples/http-client-example.js https://your-app.onrender.com
```

## 故障排除

### 常见问题

#### 1. 构建失败
- 检查 `package.json` 中的依赖版本
- 确认 TypeScript 配置正确
- 查看 Render 构建日志

#### 2. 启动失败
- 确认 `start` 命令正确
- 检查端口绑定 (必须使用 `0.0.0.0`)
- 查看运行时日志

#### 3. 健康检查失败
- 确认 `/health` 端点实现正确
- 检查服务器是否正确监听端口
- 验证响应格式

#### 4. CORS 错误
- 检查 `ALLOWED_ORIGINS` 环境变量
- 确认 CORS 中间件配置正确
- 验证预检请求处理

#### 5. 会话管理问题
- 检查 `Mcp-Session-Id` 头部处理
- 验证会话存储逻辑
- 确认会话清理机制

### 调试技巧

1. **查看日志**：
   - Render Dashboard → 服务 → Events 页面
   - 实时日志：Dashboard → 服务 → Logs 页面

2. **本地调试**：
   ```bash
   # 设置生产环境变量
   export NODE_ENV=production
   export PORT=10000
   
   # 启动服务器
   npm start
   ```

3. **网络测试**：
   ```bash
   # 测试连通性
   curl -I https://your-app.onrender.com
   
   # 测试 CORS
   curl -H "Origin: https://claude.ai" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        -X OPTIONS https://your-app.onrender.com/mcp
   ```

## 安全检查

### ✅ 安全配置
- [ ] Helmet 中间件已启用
- [ ] CORS 配置限制了允许的来源
- [ ] 敏感信息存储在环境变量中
- [ ] 没有硬编码的密钥或令牌
- [ ] 错误响应不泄露敏感信息

### ✅ 生产优化
- [ ] 启用了 Gzip 压缩
- [ ] 设置了适当的缓存头
- [ ] 实现了请求速率限制 (如需要)
- [ ] 配置了适当的超时设置

## 监控和维护

### 设置监控
1. 使用 Render 内置监控
2. 配置健康检查告警
3. 设置部署通知

### 定期维护
- 定期检查依赖更新
- 监控性能指标
- 备份重要数据
- 更新安全配置

## 成功部署确认

当以下所有项目都完成时，您的 Vue Bits MCP Server 就成功部署到 Render 了：

- [ ] ✅ 服务器在 Render 上运行正常
- [ ] ✅ 健康检查端点响应正常
- [ ] ✅ MCP 协议初始化成功
- [ ] ✅ 所有工具功能正常工作
- [ ] ✅ 客户端可以成功连接
- [ ] ✅ 安全配置已正确设置
- [ ] ✅ 监控和日志正常工作

🎉 恭喜！您已成功将 Vue Bits MCP Server 迁移到 HTTP Stream 协议并部署到 Render 平台！
