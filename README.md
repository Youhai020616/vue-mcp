# Vue Bits MCP Server

A Model Context Protocol (MCP) server that provides intelligent access to the Vue Bits animated components library. This tool enables AI assistants to search, analyze, and provide detailed information about 40+ high-quality Vue animation components.

## Features

🔍 **Smart Component Search** - Find components by name, category, functionality, or tags  
📋 **Complete Code Access** - Get full Vue component source code with TypeScript support  
⚙️ **Detailed Props Documentation** - Comprehensive property information with types and defaults  
📦 **Dependency Analysis** - Automatic dependency detection and installation commands  
🎯 **Intelligent Recommendations** - Get personalized component suggestions  
📊 **Library Statistics** - Comprehensive metadata about the component library  

## Component Categories

- **Text Animations** (19 components) - Split Text, Blur Text, Circular Text, Shiny Text, etc.
- **Animations** (12 components) - Splash Cursor, Pixel Transition, Magnet Lines, etc.
- **Components** (16 components) - Masonry, Profile Card, Carousel, Spotlight Card, etc.
- **Backgrounds** (14 components) - Aurora, Beams, Particles, Lightning, etc.

## Installation

```bash
npm install vue-bits-mcp
```

## Usage

### As MCP Server

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "vue-bits": {
      "command": "vue-bits-mcp",
      "env": {
        "VUE_BITS_PATH": "/path/to/vue-bits"
      }
    }
  }
}
```

### Command Line

```bash
# Start MCP server
vue-bits-mcp

# Parse components with custom path
vue-bits-mcp --vue-bits-path /path/to/vue-bits

# Force re-parse components
vue-bits-mcp --parse

# Show help
vue-bits-mcp --help
```

## Available Tools

### `search_vue_components`
Search for components by name, category, or functionality.

```typescript
{
  query: string;           // Search query
  category?: string;       // Filter by category
  subcategory?: string;    // Filter by subcategory
  tags?: string[];         // Filter by tags
  complexity?: string;     // Filter by complexity
  performance?: string;    // Filter by performance
  limit?: number;          // Max results (default: 10)
}
```

### `get_component_code`
Get complete component source code and implementation details.

```typescript
{
  componentId: string;     // Component ID (required)
  componentName?: string;  // Alternative to ID
  includeProps?: boolean;  // Include props docs (default: true)
  includeExamples?: boolean; // Include examples (default: true)
}
```

### `get_component_props`
Get detailed information about component properties.

```typescript
{
  componentId: string;     // Component ID (required)
  componentName?: string;  // Alternative to ID
}
```

### `list_categories`
List all available component categories and subcategories.

```typescript
{
  includeSubcategories?: boolean; // Include subcategories (default: true)
  includeStats?: boolean;         // Include counts (default: true)
}
```

### `get_installation_guide`
Get installation and setup instructions for a component.

```typescript
{
  componentId: string;     // Component ID (required)
  componentName?: string;  // Alternative to ID
  projectType?: string;    // Target project type (default: 'vue3')
}
```

### `analyze_dependencies`
Analyze dependencies for multiple components.

```typescript
{
  componentIds: string[];          // List of component IDs
  includeDevDependencies?: boolean; // Include dev deps (default: false)
  packageManager?: string;         // npm/yarn/pnpm (default: 'npm')
}
```

### `get_similar_components`
Find components similar to a given component.

```typescript
{
  componentId: string; // Reference component ID
  limit?: number;      // Max results (default: 5)
}
```

### `get_popular_components`
Get the most popular and commonly used components.

```typescript
{
  category?: string; // Filter by category
  limit?: number;    // Max results (default: 10)
}
```

### `get_recommendations`
Get personalized component recommendations.

```typescript
{
  categories?: string[];   // Preferred categories
  complexity?: string;     // Preferred complexity
  performance?: string;    // Required performance
  tags?: string[];         // Preferred tags
  projectType?: string;    // Project type context
}
```

### `get_component_metadata`
Get comprehensive metadata about the library.

```typescript
{
  includeStats?: boolean;        // Include statistics (default: true)
  includeDependencies?: boolean; // Include dependency analysis (default: true)
  includeTags?: boolean;         // Include tag statistics (default: true)
}
```

## Configuration

### Environment Variables

- `VUE_BITS_PATH` - Path to the Vue Bits project directory (default: `../`)

### File Structure

```
vue-bits-mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools/                # MCP tool definitions and handlers
│   ├── parsers/              # Component parsing and search engine
│   ├── data/                 # Cached component data
│   └── types/                # TypeScript type definitions
├── package.json
├── tsconfig.json
└── README.md
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Parse components manually
npm run parse-components

# Lint code
npm run lint

# Format code
npm run format
```

## Example Usage

### Search for text animation components
```typescript
await callTool('search_vue_components', {
  query: 'text animation',
  category: 'TextAnimations',
  complexity: 'simple'
});
```

### Get component code
```typescript
await callTool('get_component_code', {
  componentId: 'textanimations-split-text',
  includeProps: true,
  includeExamples: true
});
```

### Get installation guide
```typescript
await callTool('get_installation_guide', {
  componentId: 'textanimations-split-text',
  projectType: 'nuxt3'
});
```

### Analyze dependencies for multiple components
```typescript
await callTool('analyze_dependencies', {
  componentIds: [
    'textanimations-split-text',
    'animations-splash-cursor',
    'backgrounds-aurora'
  ],
  packageManager: 'pnpm'
});
```

## Technology Stack

- **Vue 3** - Component framework
- **TypeScript** - Type safety
- **GSAP** - Animation library
- **Three.js** - 3D graphics
- **Matter.js** - Physics engine
- **MCP SDK** - Model Context Protocol

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Related Projects

- [Vue Bits](https://vue-bits.dev) - The original Vue animation components library
- [React Bits](https://reactbits.dev) - React version of the components library
- [MCP SDK](https://github.com/modelcontextprotocol/sdk) - Model Context Protocol SDK

## Support

- 📖 [Documentation](https://vue-bits.dev)
- 🐛 [Issue Tracker](https://github.com/vue-bits-mcp/issues)
- 💬 [Discussions](https://github.com/vue-bits-mcp/discussions)

---

**Vue Bits MCP Server** - Bringing intelligent component discovery to your AI workflow! 🚀
