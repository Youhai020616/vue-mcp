#!/usr/bin/env node

/**
 * Vue Bits MCP HTTP Client Example
 * 
 * 这个示例展示如何通过 HTTP 协议连接到 Vue Bits MCP Server
 */

import fetch from 'node-fetch';

class VueBitsMcpHttpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // 移除末尾斜杠
    this.sessionId = null;
    this.requestId = 1;
  }

  async initialize() {
    console.log('🔌 Initializing MCP connection...');
    
    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2024-11-05'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'vue-bits-http-client',
            version: '1.0.0'
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    this.sessionId = response.headers.get('mcp-session-id');
    
    console.log('✅ MCP connection initialized');
    console.log('📋 Server info:', result.result.serverInfo);
    console.log('🆔 Session ID:', this.sessionId);

    // 发送初始化完成通知
    await this.sendNotification('notifications/initialized', {});
    
    return result.result;
  }

  async sendNotification(method, params) {
    const headers = {
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2024-11-05'
    };

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params
      })
    });

    return response.status === 202;
  }

  async callTool(toolName, args) {
    console.log(`🔧 Calling tool: ${toolName}`);
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2024-11-05'
    };

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    
    if (contentType.includes('text/event-stream')) {
      // 处理 SSE 流
      console.log('📡 Receiving SSE stream...');
      return await this.handleSSEResponse(response);
    } else {
      // 处理普通 JSON 响应
      const result = await response.json();
      if (result.error) {
        throw new Error(`Tool error: ${result.error.message}`);
      }
      return result.result;
    }
  }

  async handleSSEResponse(response) {
    return new Promise((resolve, reject) => {
      const reader = response.body;
      let buffer = '';
      
      reader.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留不完整的行
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.result) {
                resolve(data.result);
                return;
              } else if (data.error) {
                reject(new Error(data.error.message));
                return;
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      });
      
      reader.on('end', () => {
        reject(new Error('SSE stream ended without result'));
      });
      
      reader.on('error', reject);
    });
  }

  async listTools() {
    console.log('📋 Listing available tools...');
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'MCP-Protocol-Version': '2024-11-05'
    };

    if (this.sessionId) {
      headers['Mcp-Session-Id'] = this.sessionId;
    }

    const response = await fetch(`${this.baseUrl}/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'tools/list'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(`List tools error: ${result.error.message}`);
    }
    
    return result.result.tools;
  }

  async checkHealth() {
    console.log('🏥 Checking server health...');
    
    const response = await fetch(`${this.baseUrl}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: HTTP ${response.status}`);
    }
    
    return await response.json();
  }

  async terminate() {
    if (this.sessionId) {
      console.log('🔌 Terminating session...');
      
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'DELETE',
        headers: {
          'Mcp-Session-Id': this.sessionId
        }
      });
      
      if (response.ok) {
        console.log('✅ Session terminated');
      }
    }
  }
}

// 示例用法
async function main() {
  const serverUrl = process.argv[2] || 'http://localhost:10000';
  
  console.log(`🚀 Connecting to Vue Bits MCP Server at ${serverUrl}`);
  
  const client = new VueBitsMcpHttpClient(serverUrl);
  
  try {
    // 检查服务器健康状态
    const health = await client.checkHealth();
    console.log('🏥 Server health:', health);
    
    // 初始化连接
    await client.initialize();
    
    // 列出可用工具
    const tools = await client.listTools();
    console.log(`🔧 Available tools (${tools.length}):`);
    tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    
    // 示例：搜索组件
    console.log('\n🔍 Searching for text animation components...');
    const searchResult = await client.callTool('search_vue_components', {
      query: 'text animation',
      category: 'TextAnimations',
      limit: 3
    });
    
    console.log('📊 Search results:');
    if (searchResult.components && searchResult.components.length > 0) {
      searchResult.components.forEach(component => {
        console.log(`   - ${component.name}: ${component.description}`);
      });
    } else {
      console.log('   No components found');
    }
    
    // 示例：获取组件代码
    if (searchResult.components && searchResult.components.length > 0) {
      const firstComponent = searchResult.components[0];
      console.log(`\n📄 Getting code for: ${firstComponent.name}`);
      
      const codeResult = await client.callTool('get_component_code', {
        componentId: firstComponent.id,
        includeProps: true,
        includeExamples: true
      });
      
      console.log('✅ Component code retrieved successfully');
      console.log(`📏 Code length: ${codeResult.code?.length || 0} characters`);
      console.log(`🔧 Props count: ${codeResult.props?.length || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.terminate();
  }
}

// 运行示例
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { VueBitsMcpHttpClient };
