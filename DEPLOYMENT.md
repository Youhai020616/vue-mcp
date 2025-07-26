# Vue Bits MCP Server - Deployment Guide

This guide covers how to build, test, and deploy the Vue Bits MCP server.

## Prerequisites

- Node.js 18+ 
- npm/yarn/pnpm
- Access to Vue Bits project source code
- TypeScript knowledge for development

## Development Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd vue-bits-mcp
npm install
```

### 2. Configure Vue Bits Path

Set the path to your Vue Bits project:

```bash
export VUE_BITS_PATH="/path/to/vue-bits"
```

Or create a `.env` file:

```bash
echo "VUE_BITS_PATH=/path/to/vue-bits" > .env
```

### 3. Build the Project

```bash
npm run build
```

### 4. Parse Components (Optional)

Pre-parse Vue Bits components to cache data:

```bash
npm run parse-components
```

## Testing

### Run Demo

```bash
node demo/demo.js
```

### Run Test Suite

```bash
npm test
```

### Manual Testing

Start the MCP server:

```bash
npm start
```

Test with MCP client or use the test script:

```bash
node scripts/test-server.js
```

## Deployment Options

### Option 1: NPM Package

1. **Prepare for Publishing**

```bash
npm run prepublishOnly
```

2. **Publish to NPM**

```bash
npm publish
```

3. **Install in Projects**

```bash
npm install vue-bits-mcp
```

### Option 2: Studio Distribution

1. **Prepare Studio Package**

```bash
# Build the project
npm run build

# Create distribution package
tar -czf vue-bits-mcp.tar.gz \
  dist/ \
  package.json \
  README.md \
  studio-config.json \
  example-config.json
```

2. **Upload to Studio**

Upload the `vue-bits-mcp.tar.gz` file to your MCP Studio distribution platform.

3. **Studio Configuration**

Use the provided `studio-config.json` for Studio metadata.

### Option 3: Docker Deployment

1. **Create Dockerfile**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY README.md ./

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

2. **Build and Run**

```bash
docker build -t vue-bits-mcp .
docker run -p 3000:3000 -e VUE_BITS_PATH=/path/to/vue-bits vue-bits-mcp
```

### Option 4: Serverless Deployment

Deploy as a serverless function (AWS Lambda, Vercel, etc.):

```javascript
// serverless-handler.js
import { VueBitsMCPServer } from './dist/index.js';

export const handler = async (event, context) => {
  const server = new VueBitsMCPServer();
  return await server.handleRequest(event);
};
```

## Configuration

### Environment Variables

- `VUE_BITS_PATH` - Path to Vue Bits project (required)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)

### MCP Client Configuration

Add to your MCP client config:

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

## Performance Optimization

### 1. Component Caching

Pre-parse components and cache the results:

```bash
# Parse and cache components
npm run parse-components

# The cache file will be created at src/data/components.json
```

### 2. Memory Management

For large component libraries, consider:

- Lazy loading of component code
- Pagination in search results
- Component data compression

### 3. Search Optimization

- Index components by tags and categories
- Use fuzzy search for better results
- Cache frequent search queries

## Monitoring and Logging

### Enable Debug Logging

```bash
export LOG_LEVEL=debug
npm start
```

### Monitor Performance

Track key metrics:

- Component parsing time
- Search query response time
- Memory usage
- Cache hit rates

### Error Handling

The server includes comprehensive error handling:

- Component parsing errors
- Search query validation
- Tool execution errors
- Network and I/O errors

## Security Considerations

### 1. Input Validation

All tool inputs are validated against JSON schemas.

### 2. Path Traversal Protection

Component file access is restricted to the Vue Bits directory.

### 3. Resource Limits

- Maximum search results: 100
- Maximum component code size: 1MB
- Request timeout: 30 seconds

### 4. Access Control

Consider implementing:

- API key authentication
- Rate limiting
- IP whitelisting

## Troubleshooting

### Common Issues

1. **Components not found**
   - Check `VUE_BITS_PATH` environment variable
   - Verify Vue Bits project structure
   - Run `npm run parse-components`

2. **Build errors**
   - Update Node.js to version 18+
   - Clear `node_modules` and reinstall
   - Check TypeScript configuration

3. **Performance issues**
   - Enable component caching
   - Reduce search result limits
   - Monitor memory usage

### Debug Commands

```bash
# Check component parsing
node -e "
const parser = require('./dist/parsers/componentParser.js');
const p = new parser.ComponentParser(process.env.VUE_BITS_PATH);
p.parseAllComponents().then(console.log);
"

# Test search functionality
node -e "
const { SearchEngine } = require('./dist/parsers/searchEngine.js');
const components = require('./src/data/components.json');
const engine = new SearchEngine(components);
console.log(engine.search('text', {}).components.length);
"
```

## Maintenance

### Regular Updates

1. **Update Dependencies**

```bash
npm update
npm audit fix
```

2. **Re-parse Components**

When Vue Bits is updated:

```bash
npm run parse-components
```

3. **Performance Monitoring**

Monitor and optimize:
- Search response times
- Memory usage patterns
- Cache effectiveness

### Version Management

Follow semantic versioning:

- **Major**: Breaking API changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, performance improvements

## Support

For deployment issues:

1. Check the troubleshooting section
2. Review server logs
3. Test with the demo script
4. Open an issue on GitHub

---

**Vue Bits MCP Server** - Ready for production deployment! 🚀
