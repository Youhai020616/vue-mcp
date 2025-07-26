#!/usr/bin/env node

/**
 * Vue Bits MCP Server 部署测试脚本
 * 
 * 用法: node scripts/test-deployment.js [SERVER_URL]
 * 示例: node scripts/test-deployment.js https://your-app.onrender.com
 */

import fetch from 'node-fetch';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(colors.green, `✅ ${message}`);
}

function error(message) {
  log(colors.red, `❌ ${message}`);
}

function warning(message) {
  log(colors.yellow, `⚠️  ${message}`);
}

function info(message) {
  log(colors.blue, `ℹ️  ${message}`);
}

function title(message) {
  log(colors.bold, `\n🧪 ${message}`);
}

class DeploymentTester {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.sessionId = null;
    this.requestId = 1;
    this.testResults = {
      passed: 0,
      failed: 0,
      warnings: 0
    };
  }

  async runAllTests() {
    title('Vue Bits MCP Server 部署测试');
    info(`测试服务器: ${this.baseUrl}`);

    try {
      await this.testServerReachability();
      await this.testHealthCheck();
      await this.testRootEndpoint();
      await this.testMcpInitialization();
      await this.testToolsList();
      await this.testToolExecution();
      await this.testSessionTermination();
      
      this.printSummary();
      
    } catch (error) {
      error(`测试过程中发生致命错误: ${error.message}`);
      process.exit(1);
    }
  }

  async testServerReachability() {
    title('测试服务器连通性');
    
    try {
      const response = await fetch(this.baseUrl, { 
        method: 'HEAD',
        timeout: 10000 
      });
      
      if (response.ok) {
        success('服务器可达');
        this.testResults.passed++;
      } else {
        error(`服务器响应错误: HTTP ${response.status}`);
        this.testResults.failed++;
      }
    } catch (err) {
      error(`无法连接到服务器: ${err.message}`);
      this.testResults.failed++;
      throw err;
    }
  }

  async testHealthCheck() {
    title('测试健康检查端点');
    
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      
      if (!response.ok) {
        error(`健康检查失败: HTTP ${response.status}`);
        this.testResults.failed++;
        return;
      }
      
      const health = await response.json();
      
      if (health.status === 'healthy') {
        success('健康检查通过');
        info(`服务器版本: ${health.version || 'unknown'}`);
        info(`协议类型: ${health.protocol || 'unknown'}`);
        this.testResults.passed++;
      } else {
        warning(`健康检查状态异常: ${health.status}`);
        this.testResults.warnings++;
      }
      
    } catch (err) {
      error(`健康检查请求失败: ${err.message}`);
      this.testResults.failed++;
    }
  }

  async testRootEndpoint() {
    title('测试根端点');
    
    try {
      const response = await fetch(this.baseUrl);
      
      if (!response.ok) {
        error(`根端点响应错误: HTTP ${response.status}`);
        this.testResults.failed++;
        return;
      }
      
      const info_data = await response.json();
      
      if (info_data.name && info_data.version) {
        success('根端点响应正常');
        info(`服务名称: ${info_data.name}`);
        info(`服务版本: ${info_data.version}`);
        info(`协议类型: ${info_data.protocol}`);
        this.testResults.passed++;
      } else {
        warning('根端点响应格式异常');
        this.testResults.warnings++;
      }
      
    } catch (err) {
      error(`根端点请求失败: ${err.message}`);
      this.testResults.failed++;
    }
  }

  async testMcpInitialization() {
    title('测试 MCP 协议初始化');
    
    try {
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
              name: 'deployment-tester',
              version: '1.0.0'
            }
          }
        })
      });

      if (!response.ok) {
        error(`MCP 初始化失败: HTTP ${response.status}`);
        this.testResults.failed++;
        return;
      }

      const result = await response.json();
      this.sessionId = response.headers.get('mcp-session-id');

      if (result.result && result.result.serverInfo) {
        success('MCP 初始化成功');
        info(`会话 ID: ${this.sessionId}`);
        info(`协议版本: ${result.result.protocolVersion}`);
        info(`服务器: ${result.result.serverInfo.name} v${result.result.serverInfo.version}`);
        this.testResults.passed++;
        
        // 发送初始化完成通知
        await this.sendInitializedNotification();
      } else {
        error('MCP 初始化响应格式错误');
        this.testResults.failed++;
      }

    } catch (err) {
      error(`MCP 初始化请求失败: ${err.message}`);
      this.testResults.failed++;
    }
  }

  async sendInitializedNotification() {
    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Mcp-Session-Id': this.sessionId,
          'MCP-Protocol-Version': '2024-11-05'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
          params: {}
        })
      });

      if (response.status === 202) {
        success('初始化完成通知发送成功');
      } else {
        warning(`初始化完成通知响应异常: HTTP ${response.status}`);
      }
    } catch (err) {
      warning(`发送初始化完成通知失败: ${err.message}`);
    }
  }

  async testToolsList() {
    title('测试工具列表');
    
    if (!this.sessionId) {
      error('无会话 ID，跳过工具列表测试');
      this.testResults.failed++;
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Mcp-Session-Id': this.sessionId,
          'MCP-Protocol-Version': '2024-11-05'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: this.requestId++,
          method: 'tools/list'
        })
      });

      if (!response.ok) {
        error(`工具列表请求失败: HTTP ${response.status}`);
        this.testResults.failed++;
        return;
      }

      const result = await response.json();

      if (result.result && result.result.tools) {
        success(`工具列表获取成功 (${result.result.tools.length} 个工具)`);
        
        const expectedTools = [
          'search_vue_components',
          'get_component_code',
          'list_categories'
        ];
        
        const availableTools = result.result.tools.map(tool => tool.name);
        const missingTools = expectedTools.filter(tool => !availableTools.includes(tool));
        
        if (missingTools.length === 0) {
          success('所有核心工具都可用');
          this.testResults.passed++;
        } else {
          warning(`缺少工具: ${missingTools.join(', ')}`);
          this.testResults.warnings++;
        }
        
        info('可用工具:');
        result.result.tools.forEach(tool => {
          info(`  - ${tool.name}: ${tool.description}`);
        });
        
      } else {
        error('工具列表响应格式错误');
        this.testResults.failed++;
      }

    } catch (err) {
      error(`工具列表请求失败: ${err.message}`);
      this.testResults.failed++;
    }
  }

  async testToolExecution() {
    title('测试工具执行');
    
    if (!this.sessionId) {
      error('无会话 ID，跳过工具执行测试');
      this.testResults.failed++;
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Mcp-Session-Id': this.sessionId,
          'MCP-Protocol-Version': '2024-11-05'
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: this.requestId++,
          method: 'tools/call',
          params: {
            name: 'search_vue_components',
            arguments: {
              query: 'test',
              limit: 1
            }
          }
        })
      });

      if (!response.ok) {
        error(`工具执行失败: HTTP ${response.status}`);
        this.testResults.failed++;
        return;
      }

      const contentType = response.headers.get('content-type');
      let result;

      if (contentType.includes('text/event-stream')) {
        info('收到 SSE 流响应');
        result = await this.parseSSEResponse(response);
      } else {
        result = await response.json();
      }

      if (result.result) {
        success('工具执行成功');
        info(`搜索结果: ${result.result.total || 0} 个组件`);
        this.testResults.passed++;
      } else if (result.error) {
        error(`工具执行错误: ${result.error.message}`);
        this.testResults.failed++;
      } else {
        warning('工具执行响应格式异常');
        this.testResults.warnings++;
      }

    } catch (err) {
      error(`工具执行请求失败: ${err.message}`);
      this.testResults.failed++;
    }
  }

  async parseSSEResponse(response) {
    return new Promise((resolve, reject) => {
      let buffer = '';
      
      response.body.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.result || data.error) {
                resolve(data);
                return;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      });
      
      response.body.on('end', () => {
        reject(new Error('SSE 流结束但未收到结果'));
      });
      
      response.body.on('error', reject);
      
      // 超时处理
      setTimeout(() => {
        reject(new Error('SSE 响应超时'));
      }, 10000);
    });
  }

  async testSessionTermination() {
    title('测试会话终止');
    
    if (!this.sessionId) {
      warning('无会话 ID，跳过会话终止测试');
      this.testResults.warnings++;
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'DELETE',
        headers: {
          'Mcp-Session-Id': this.sessionId
        }
      });

      if (response.ok) {
        success('会话终止成功');
        this.testResults.passed++;
      } else if (response.status === 404) {
        warning('会话未找到 (可能已过期)');
        this.testResults.warnings++;
      } else {
        error(`会话终止失败: HTTP ${response.status}`);
        this.testResults.failed++;
      }

    } catch (err) {
      error(`会话终止请求失败: ${err.message}`);
      this.testResults.failed++;
    }
  }

  printSummary() {
    title('测试结果汇总');
    
    const total = this.testResults.passed + this.testResults.failed + this.testResults.warnings;
    
    success(`通过: ${this.testResults.passed}/${total}`);
    if (this.testResults.warnings > 0) {
      warning(`警告: ${this.testResults.warnings}/${total}`);
    }
    if (this.testResults.failed > 0) {
      error(`失败: ${this.testResults.failed}/${total}`);
    }
    
    if (this.testResults.failed === 0) {
      success('\n🎉 所有关键测试都通过了！您的 Vue Bits MCP Server 部署成功！');
      
      if (this.testResults.warnings > 0) {
        warning('注意: 有一些警告项目，建议检查并优化。');
      }
    } else {
      error('\n💥 部署测试失败，请检查错误信息并修复问题。');
      process.exit(1);
    }
  }
}

// 主函数
async function main() {
  const serverUrl = process.argv[2];
  
  if (!serverUrl) {
    error('请提供服务器 URL');
    console.log('用法: node scripts/test-deployment.js <SERVER_URL>');
    console.log('示例: node scripts/test-deployment.js https://your-app.onrender.com');
    process.exit(1);
  }
  
  const tester = new DeploymentTester(serverUrl);
  await tester.runAllTests();
}

// 运行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    error(`测试脚本执行失败: ${error.message}`);
    process.exit(1);
  });
}
