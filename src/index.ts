#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { ComponentParser } from './parsers/componentParser.js';
import { SearchEngine } from './parsers/searchEngine.js';
import { ToolHandlers } from './tools/handlers.js';
import { ALL_TOOLS } from './tools/index.js';
import { VueBitsComponent } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VueBitsMCPServer {
  private server: Server;
  private searchEngine: SearchEngine | null = null;
  private toolHandlers: ToolHandlers | null = null;
  private componentsDataPath: string;
  private vueBitsPath: string;

  constructor() {
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

    // Paths configuration
    this.componentsDataPath = path.join(__dirname, '../data/components.json');
    this.vueBitsPath = process.env.VUE_BITS_PATH || path.join(__dirname, '../../');

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: ALL_TOOLS,
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.toolHandlers) {
        await this.initializeComponents();
      }

      if (!this.toolHandlers) {
        throw new Error('Failed to initialize component data');
      }

      return await this.toolHandlers.handleToolCall(request);
    });
  }

  private async initializeComponents(): Promise<void> {
    try {
      console.log('🚀 Initializing Vue Bits MCP Server...');

      let components: VueBitsComponent[] = [];

      // Try to load existing components data
      if (await fs.pathExists(this.componentsDataPath)) {
        console.log('📂 Loading existing components data...');
        components = await fs.readJson(this.componentsDataPath);
        console.log(`✅ Loaded ${components.length} components from cache`);
      } else {
        console.log('🔍 Parsing Vue Bits components...');
        
        // Check if Vue Bits path exists
        if (!(await fs.pathExists(this.vueBitsPath))) {
          throw new Error(`Vue Bits path not found: ${this.vueBitsPath}`);
        }

        // Parse components from source
        const parser = new ComponentParser(this.vueBitsPath);
        components = await parser.parseAllComponents();
        
        // Save parsed data for future use
        await parser.saveComponentsData(this.componentsDataPath);
        console.log(`💾 Cached ${components.length} components`);
      }

      // Initialize search engine and tool handlers
      this.searchEngine = new SearchEngine(components);
      this.toolHandlers = new ToolHandlers(this.searchEngine);

      console.log('✅ Vue Bits MCP Server initialized successfully!');
      console.log(`📊 Available: ${components.length} components across 4 categories`);
      
      // Log some statistics
      const metadata = this.searchEngine.getMetadata();
      console.log('📈 Component breakdown:');
      Object.entries(metadata.categories).forEach(([category, data]: [string, any]) => {
        console.log(`   - ${category}: ${data.count} components`);
      });

    } catch (error) {
      console.error('❌ Failed to initialize components:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('🎯 Vue Bits MCP Server is running!');
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Vue Bits MCP Server - Animated Vue Components Library

Usage:
  vue-bits-mcp [options]

Options:
  --help, -h          Show this help message
  --parse             Parse Vue Bits components and update cache
  --vue-bits-path     Path to Vue Bits project (default: ../)

Environment Variables:
  VUE_BITS_PATH       Path to Vue Bits project directory

Examples:
  vue-bits-mcp
  vue-bits-mcp --vue-bits-path /path/to/vue-bits
  VUE_BITS_PATH=/path/to/vue-bits vue-bits-mcp

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
`);
    process.exit(0);
  }

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

  // Set Vue Bits path from command line argument
  if (args.includes('--vue-bits-path')) {
    const pathIndex = args.indexOf('--vue-bits-path') + 1;
    if (pathIndex < args.length) {
      process.env.VUE_BITS_PATH = args[pathIndex];
    }
  }

  // Start the MCP server
  const server = new VueBitsMCPServer();
  await server.start();
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
