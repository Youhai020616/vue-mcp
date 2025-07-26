#!/usr/bin/env node

import { HttpMcpServer } from './server/httpServer.js';
import { ComponentParser } from './parsers/componentParser.js';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CLI interface

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
  NODE_ENV            Environment (development/production)
  ALLOWED_ORIGINS     Comma-separated list of allowed origins

Examples:
  vue-bits-mcp
  vue-bits-mcp --port 3000
  PORT=8080 vue-bits-mcp
  vue-bits-mcp --vue-bits-path /path/to/vue-bits

Available Tools:
  - search_vue_components     Search for components by name, category, or functionality
  - get_component_code        Get complete component source code
  - get_component_props       Get detailed component properties
  - list_categories           List all component categories
  - get_installation_guide    Get installation instructions
  - analyze_dependencies      Analyze component dependencies
  - get_similar_components    Find similar components
  - get_popular_components    Get popular components
  - get_recommendations       Get personalized recommendations
  - get_component_metadata    Get library metadata and statistics

HTTP Endpoints:
  GET  /              Server information
  GET  /health        Health check
  POST /mcp           MCP JSON-RPC endpoint
  GET  /mcp           MCP SSE stream endpoint
  DELETE /mcp         Terminate session
`);
    process.exit(0);
  }

  // 解析命令行参数
  const portIndex = args.findIndex((arg: string) => arg === '--port' || arg === '-p');
  const port = portIndex !== -1 && args[portIndex + 1]
    ? parseInt(args[portIndex + 1])
    : parseInt(process.env.PORT || '10000');

  if (args.includes('--parse')) {
    console.log('🔄 Force parsing Vue Bits components...');

    const vueBitsPath = args.includes('--vue-bits-path')
      ? args[args.indexOf('--vue-bits-path') + 1]
      : process.env.VUE_BITS_PATH || path.join(__dirname, '../../');

    const parser = new ComponentParser(vueBitsPath);
    const components = await parser.parseAllComponents();

    const outputPath = path.join(__dirname, '../data/components.json');
    await parser.saveComponentsData(outputPath);

    console.log(`✅ Parsed and saved ${components.length} components`);
    process.exit(0);
  }

  // 设置 Vue Bits 路径
  if (args.includes('--vue-bits-path')) {
    const pathIndex = args.indexOf('--vue-bits-path') + 1;
    if (pathIndex < args.length) {
      process.env.VUE_BITS_PATH = args[pathIndex];
    }
  }

  // 启动 HTTP 服务器
  const server = new HttpMcpServer();
  await server.start(port);
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n👋 Vue Bits MCP Server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Vue Bits MCP Server shutting down...');
  process.exit(0);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}
