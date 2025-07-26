#!/usr/bin/env node

/**
 * Test script for Vue Bits MCP Server
 * This script tests the basic functionality of the MCP server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MCPTester {
  constructor() {
    this.serverProcess = null;
  }

  async startServer() {
    console.log('🚀 Starting Vue Bits MCP Server...');
    
    const serverPath = join(__dirname, '../dist/index.js');
    this.serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        VUE_BITS_PATH: process.env.VUE_BITS_PATH || join(__dirname, '../../')
      }
    });

    this.serverProcess.stdout.on('data', (data) => {
      console.log('📤 Server:', data.toString().trim());
    });

    this.serverProcess.stderr.on('data', (data) => {
      console.error('❌ Server Error:', data.toString().trim());
    });

    // Wait for server to initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  async sendRequest(request) {
    return new Promise((resolve, reject) => {
      const requestStr = JSON.stringify(request) + '\n';
      
      let responseData = '';
      const onData = (data) => {
        responseData += data.toString();
        try {
          const response = JSON.parse(responseData.trim());
          this.serverProcess.stdout.off('data', onData);
          resolve(response);
        } catch (e) {
          // Continue collecting data
        }
      };

      this.serverProcess.stdout.on('data', onData);
      this.serverProcess.stdin.write(requestStr);

      setTimeout(() => {
        this.serverProcess.stdout.off('data', onData);
        reject(new Error('Request timeout'));
      }, 10000);
    });
  }

  async testListTools() {
    console.log('\n🔧 Testing list_tools...');
    
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    };

    try {
      const response = await this.sendRequest(request);
      console.log('✅ Tools available:', response.result?.tools?.length || 0);
      
      if (response.result?.tools) {
        response.result.tools.forEach(tool => {
          console.log(`   - ${tool.name}: ${tool.description}`);
        });
      }
    } catch (error) {
      console.error('❌ Failed to list tools:', error.message);
    }
  }

  async testSearchComponents() {
    console.log('\n🔍 Testing search_vue_components...');
    
    const request = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'search_vue_components',
        arguments: {
          query: 'text',
          limit: 3
        }
      }
    };

    try {
      const response = await this.sendRequest(request);
      console.log('✅ Search completed');
      
      if (response.result?.content?.[0]?.text) {
        const content = response.result.content[0].text;
        const lines = content.split('\n').slice(0, 10);
        console.log('📋 Results preview:');
        lines.forEach(line => console.log(`   ${line}`));
      }
    } catch (error) {
      console.error('❌ Failed to search components:', error.message);
    }
  }

  async testGetMetadata() {
    console.log('\n📊 Testing get_component_metadata...');
    
    const request = {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_component_metadata',
        arguments: {}
      }
    };

    try {
      const response = await this.sendRequest(request);
      console.log('✅ Metadata retrieved');
      
      if (response.result?.content?.[0]?.text) {
        const content = response.result.content[0].text;
        const lines = content.split('\n').slice(0, 15);
        console.log('📈 Metadata preview:');
        lines.forEach(line => console.log(`   ${line}`));
      }
    } catch (error) {
      console.error('❌ Failed to get metadata:', error.message);
    }
  }

  async stopServer() {
    if (this.serverProcess) {
      console.log('\n🛑 Stopping server...');
      this.serverProcess.kill();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async runTests() {
    try {
      await this.startServer();
      await this.testListTools();
      await this.testSearchComponents();
      await this.testGetMetadata();
      
      console.log('\n✅ All tests completed!');
    } catch (error) {
      console.error('\n💥 Test failed:', error);
    } finally {
      await this.stopServer();
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MCPTester();
  
  process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping tests...');
    await tester.stopServer();
    process.exit(0);
  });

  tester.runTests().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}
