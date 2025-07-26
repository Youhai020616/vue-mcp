import { CallToolRequest, CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import { SearchEngine } from '../parsers/searchEngine.js';
import { VueBitsComponent, InstallationGuide } from '../types/index.js';

export class ToolHandlers {
  private searchEngine: SearchEngine;

  constructor(searchEngine: SearchEngine) {
    this.searchEngine = searchEngine;
  }

  async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    try {
      switch (request.params.name) {
        case 'search_vue_components':
          return await this.handleSearchComponents(request.params.arguments);
        
        case 'get_component_code':
          return await this.handleGetComponentCode(request.params.arguments);
        
        case 'get_component_props':
          return await this.handleGetComponentProps(request.params.arguments);
        
        case 'list_categories':
          return await this.handleListCategories(request.params.arguments);
        
        case 'get_installation_guide':
          return await this.handleGetInstallationGuide(request.params.arguments);
        
        case 'analyze_dependencies':
          return await this.handleAnalyzeDependencies(request.params.arguments);
        
        case 'get_similar_components':
          return await this.handleGetSimilarComponents(request.params.arguments);
        
        case 'get_popular_components':
          return await this.handleGetPopularComponents(request.params.arguments);
        
        case 'get_recommendations':
          return await this.handleGetRecommendations(request.params.arguments);
        
        case 'get_component_metadata':
          return await this.handleGetComponentMetadata(request.params.arguments);
        
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }

  private async handleSearchComponents(args: any): Promise<CallToolResult> {
    const { query = '', category, subcategory, tags, complexity, performance, limit = 10 } = args;
    
    const filters = {
      category,
      subcategory,
      tags,
      complexity,
      performance
    };

    const results = this.searchEngine.search(query, filters);
    const limitedResults = results.components.slice(0, limit);

    const content = this.formatSearchResults(limitedResults, results.total, query, filters);
    
    return {
      content: [{ type: 'text', text: content }]
    };
  }

  private async handleGetComponentCode(args: any): Promise<CallToolResult> {
    const { componentId, componentName, includeProps = true, includeExamples = true } = args;
    
    let component: VueBitsComponent | null = null;
    
    if (componentId) {
      component = this.searchEngine.getComponentById(componentId);
    } else if (componentName) {
      component = this.searchEngine.getComponentByName(componentName);
    }

    if (!component) {
      return {
        content: [{ type: 'text', text: 'Component not found' }],
        isError: true
      };
    }

    const content = this.formatComponentCode(component, includeProps, includeExamples);
    
    return {
      content: [{ type: 'text', text: content }]
    };
  }

  private async handleGetComponentProps(args: any): Promise<CallToolResult> {
    const { componentId, componentName } = args;
    
    let component: VueBitsComponent | null = null;
    
    if (componentId) {
      component = this.searchEngine.getComponentById(componentId);
    } else if (componentName) {
      component = this.searchEngine.getComponentByName(componentName);
    }

    if (!component) {
      return {
        content: [{ type: 'text', text: 'Component not found' }],
        isError: true
      };
    }

    const content = this.formatComponentProps(component);
    
    return {
      content: [{ type: 'text', text: content }]
    };
  }

  private async handleListCategories(args: any): Promise<CallToolResult> {
    const { includeSubcategories = true, includeStats = true } = args;
    
    const metadata = this.searchEngine.getMetadata();
    const content = this.formatCategories(metadata, includeSubcategories, includeStats);
    
    return {
      content: [{ type: 'text', text: content }]
    };
  }

  private async handleGetInstallationGuide(args: any): Promise<CallToolResult> {
    const { componentId, componentName, projectType = 'vue3' } = args;
    
    let component: VueBitsComponent | null = null;
    
    if (componentId) {
      component = this.searchEngine.getComponentById(componentId);
    } else if (componentName) {
      component = this.searchEngine.getComponentByName(componentName);
    }

    if (!component) {
      return {
        content: [{ type: 'text', text: 'Component not found' }],
        isError: true
      };
    }

    const guide = this.generateInstallationGuide(component, projectType);
    const content = this.formatInstallationGuide(guide);
    
    return {
      content: [{ type: 'text', text: content }]
    };
  }

  private async handleAnalyzeDependencies(args: any): Promise<CallToolResult> {
    const { componentIds, includeDevDependencies = false, packageManager = 'npm' } = args;
    
    const components = componentIds
      .map((id: string) => this.searchEngine.getComponentById(id))
      .filter((c: VueBitsComponent | null) => c !== null);

    if (components.length === 0) {
      return {
        content: [{ type: 'text', text: 'No valid components found' }],
        isError: true
      };
    }

    const content = this.formatDependencyAnalysis(components, packageManager, includeDevDependencies);
    
    return {
      content: [{ type: 'text', text: content }]
    };
  }

  private async handleGetSimilarComponents(args: any): Promise<CallToolResult> {
    const { componentId, limit = 5 } = args;
    
    const similar = this.searchEngine.getSimilarComponents(componentId, limit);
    const content = this.formatSimilarComponents(similar, componentId);
    
    return {
      content: [{ type: 'text', text: content }]
    };
  }

  private async handleGetPopularComponents(args: any): Promise<CallToolResult> {
    const { category, limit = 10 } = args;
    
    let popular = this.searchEngine.getPopularComponents(limit);
    
    if (category) {
      popular = popular.filter(c => c.category === category);
    }

    const content = this.formatPopularComponents(popular, category);
    
    return {
      content: [{ type: 'text', text: content }]
    };
  }

  private async handleGetRecommendations(args: any): Promise<CallToolResult> {
    const { categories, complexity, performance, tags, projectType } = args;
    
    const recommendations = this.searchEngine.getRecommendations({
      categories,
      complexity,
      performance,
      tags
    });

    const content = this.formatRecommendations(recommendations, args);
    
    return {
      content: [{ type: 'text', text: content }]
    };
  }

  private async handleGetComponentMetadata(args: any): Promise<CallToolResult> {
    const { includeStats = true, includeDependencies = true, includeTags = true } = args;
    
    const metadata = this.searchEngine.getMetadata();
    const content = this.formatMetadata(metadata, includeStats, includeDependencies, includeTags);
    
    return {
      content: [{ type: 'text', text: content }]
    };
  }

  // Formatting methods will be implemented in the next part
  private formatSearchResults(components: VueBitsComponent[], total: number, query: string, filters: any): string {
    let result = `# Vue Bits Component Search Results\n\n`;
    
    if (query) {
      result += `**Query:** "${query}"\n`;
    }
    
    if (Object.values(filters).some(v => v)) {
      result += `**Filters:** ${JSON.stringify(filters, null, 2)}\n`;
    }
    
    result += `**Found:** ${components.length} of ${total} components\n\n`;

    if (components.length === 0) {
      result += `No components found matching your criteria.\n\n`;
      result += `**Suggestions:**\n`;
      result += `- Try broader search terms\n`;
      result += `- Remove some filters\n`;
      result += `- Use the \`list_categories\` tool to see available options\n`;
      return result;
    }

    components.forEach((component, index) => {
      result += `## ${index + 1}. ${component.name}\n`;
      result += `- **ID:** \`${component.id}\`\n`;
      result += `- **Category:** ${component.category} > ${component.subcategory}\n`;
      result += `- **Description:** ${component.description}\n`;
      result += `- **Complexity:** ${component.complexity} | **Performance:** ${component.performance}\n`;
      result += `- **Tags:** ${component.tags.join(', ')}\n`;
      result += `- **Props:** ${component.props.length} configurable properties\n`;
      result += `- **Dependencies:** ${component.dependencies.join(', ') || 'None'}\n\n`;
    });

    result += `\n**Next Steps:**\n`;
    result += `- Use \`get_component_code\` to view the full implementation\n`;
    result += `- Use \`get_component_props\` to see detailed property information\n`;
    result += `- Use \`get_installation_guide\` for setup instructions\n`;

    return result;
  }

  private formatComponentCode(component: VueBitsComponent, includeProps: boolean, includeExamples: boolean): string {
    let result = `# ${component.name} Component\n\n`;
    
    result += `**Category:** ${component.category} > ${component.subcategory}\n`;
    result += `**Description:** ${component.description}\n`;
    result += `**Complexity:** ${component.complexity} | **Performance:** ${component.performance}\n\n`;

    if (component.dependencies.length > 0) {
      result += `## Dependencies\n\n`;
      result += `\`\`\`bash\nnpm install ${component.dependencies.join(' ')}\n\`\`\`\n\n`;
    }

    result += `## Component Code\n\n`;
    result += `**File:** \`${component.filePath}\`\n\n`;
    result += `\`\`\`vue\n${component.code}\n\`\`\`\n\n`;

    if (includeProps && component.props.length > 0) {
      result += this.formatComponentProps(component);
    }

    if (includeExamples && component.examples.length > 0) {
      result += `## Usage Examples\n\n`;
      component.examples.forEach((example, index) => {
        result += `### ${example.title}\n\n`;
        result += `${example.description}\n\n`;
        result += `\`\`\`vue\n${example.code}\n\`\`\`\n\n`;
      });
    }

    return result;
  }

  private formatComponentProps(component: VueBitsComponent): string {
    if (component.props.length === 0) {
      return `## Props\n\nThis component has no configurable props.\n\n`;
    }

    let result = `## Props\n\n`;
    result += `| Property | Type | Required | Default | Description |\n`;
    result += `|----------|------|----------|---------|-------------|\n`;

    component.props.forEach(prop => {
      const required = prop.required ? '✅' : '❌';
      const defaultValue = prop.default !== undefined ? `\`${prop.default}\`` : '-';
      result += `| \`${prop.name}\` | \`${prop.type}\` | ${required} | ${defaultValue} | ${prop.description} |\n`;
    });

    result += `\n`;
    return result;
  }

  // Additional formatting methods would continue here...
  // Due to length constraints, I'll implement the remaining methods in the next file

  private formatCategories(metadata: any, includeSubcategories: boolean, includeStats: boolean): string {
    let result = `# Vue Bits Component Categories\n\n`;
    
    if (includeStats) {
      result += `**Total Components:** ${metadata.totalComponents}\n\n`;
    }

    Object.entries(metadata.categories).forEach(([category, data]: [string, any]) => {
      result += `## ${category}\n`;
      if (includeStats) {
        result += `**Count:** ${data.count} components\n`;
      }
      
      if (includeSubcategories && data.subcategories.length > 0) {
        result += `**Subcategories:**\n`;
        data.subcategories.forEach((sub: string) => {
          result += `- ${sub}\n`;
        });
      }
      result += `\n`;
    });

    return result;
  }

  private generateInstallationGuide(component: VueBitsComponent, projectType: string): InstallationGuide {
    const dependencies = component.dependencies.length > 0 
      ? component.dependencies 
      : ['vue@^3.0.0'];

    const installCommand = `npm install ${dependencies.join(' ')}`;
    
    const importStatement = `import ${component.name} from '@/components/${component.name}.vue';`;
    
    const basicUsage = `<template>
  <${component.name}${component.props.length > 0 ? ' :text="Hello World"' : ''} />
</template>

<script setup>
${importStatement}
</script>`;

    return {
      component: component.name,
      dependencies,
      installCommand,
      importStatement,
      basicUsage,
      notes: [
        'Make sure to install all required dependencies',
        'Some components may require additional CSS imports',
        'Check the component props for customization options'
      ]
    };
  }

  private formatInstallationGuide(guide: InstallationGuide): string {
    let result = `# Installation Guide: ${guide.component}\n\n`;
    
    result += `## 1. Install Dependencies\n\n`;
    result += `\`\`\`bash\n${guide.installCommand}\n\`\`\`\n\n`;
    
    result += `## 2. Import Component\n\n`;
    result += `\`\`\`javascript\n${guide.importStatement}\n\`\`\`\n\n`;
    
    result += `## 3. Basic Usage\n\n`;
    result += `\`\`\`vue\n${guide.basicUsage}\n\`\`\`\n\n`;
    
    if (guide.advancedUsage) {
      result += `## 4. Advanced Usage\n\n`;
      result += `\`\`\`vue\n${guide.advancedUsage}\n\`\`\`\n\n`;
    }
    
    if (guide.notes && guide.notes.length > 0) {
      result += `## Notes\n\n`;
      guide.notes.forEach(note => {
        result += `- ${note}\n`;
      });
      result += `\n`;
    }
    
    return result;
  }

  private formatDependencyAnalysis(components: VueBitsComponent[], packageManager: string, includeDevDeps: boolean): string {
    const allDeps = new Set<string>();
    const depUsage = new Map<string, string[]>();

    components.forEach(component => {
      component.dependencies.forEach(dep => {
        allDeps.add(dep);
        if (!depUsage.has(dep)) {
          depUsage.set(dep, []);
        }
        depUsage.get(dep)!.push(component.name);
      });
    });

    let result = `# Dependency Analysis\n\n`;
    result += `**Components analyzed:** ${components.map(c => c.name).join(', ')}\n\n`;
    
    if (allDeps.size === 0) {
      result += `No external dependencies required.\n`;
      return result;
    }

    const installCmd = packageManager === 'yarn' ? 'yarn add' : 
                     packageManager === 'pnpm' ? 'pnpm add' : 'npm install';
    
    result += `## Installation Command\n\n`;
    result += `\`\`\`bash\n${installCmd} ${Array.from(allDeps).join(' ')}\n\`\`\`\n\n`;
    
    result += `## Dependency Details\n\n`;
    Array.from(depUsage.entries()).forEach(([dep, components]) => {
      result += `### ${dep}\n`;
      result += `Used by: ${components.join(', ')}\n\n`;
    });

    return result;
  }

  private formatSimilarComponents(components: VueBitsComponent[], referenceId: string): string {
    let result = `# Similar Components\n\n`;
    
    if (components.length === 0) {
      result += `No similar components found for ID: ${referenceId}\n`;
      return result;
    }

    components.forEach((component, index) => {
      result += `## ${index + 1}. ${component.name}\n`;
      result += `- **ID:** \`${component.id}\`\n`;
      result += `- **Category:** ${component.category} > ${component.subcategory}\n`;
      result += `- **Description:** ${component.description}\n`;
      result += `- **Shared tags:** ${component.tags.join(', ')}\n\n`;
    });

    return result;
  }

  private formatPopularComponents(components: VueBitsComponent[], category?: string): string {
    let result = `# Popular Vue Bits Components\n\n`;
    
    if (category) {
      result += `**Category:** ${category}\n\n`;
    }

    components.forEach((component, index) => {
      result += `## ${index + 1}. ${component.name}\n`;
      result += `- **Category:** ${component.category} > ${component.subcategory}\n`;
      result += `- **Complexity:** ${component.complexity} | **Performance:** ${component.performance}\n`;
      result += `- **Description:** ${component.description}\n\n`;
    });

    return result;
  }

  private formatRecommendations(components: VueBitsComponent[], preferences: any): string {
    let result = `# Component Recommendations\n\n`;
    
    result += `**Based on your preferences:**\n`;
    if (preferences.categories) result += `- Categories: ${preferences.categories.join(', ')}\n`;
    if (preferences.complexity) result += `- Complexity: ${preferences.complexity}\n`;
    if (preferences.performance) result += `- Performance: ${preferences.performance}\n`;
    if (preferences.tags) result += `- Tags: ${preferences.tags.join(', ')}\n`;
    result += `\n`;

    if (components.length === 0) {
      result += `No components match your preferences. Try adjusting your criteria.\n`;
      return result;
    }

    components.forEach((component, index) => {
      result += `## ${index + 1}. ${component.name}\n`;
      result += `- **ID:** \`${component.id}\`\n`;
      result += `- **Category:** ${component.category} > ${component.subcategory}\n`;
      result += `- **Description:** ${component.description}\n`;
      result += `- **Why recommended:** Matches your ${preferences.complexity || 'preferred'} complexity and ${preferences.performance || 'performance'} requirements\n\n`;
    });

    return result;
  }

  private formatMetadata(metadata: any, includeStats: boolean, includeDependencies: boolean, includeTags: boolean): string {
    let result = `# Vue Bits Component Library Metadata\n\n`;
    
    if (includeStats) {
      result += `## Statistics\n\n`;
      result += `- **Total Components:** ${metadata.totalComponents}\n`;
      result += `- **Categories:** ${Object.keys(metadata.categories).length}\n`;
      result += `- **Unique Dependencies:** ${metadata.dependencies.length}\n`;
      result += `- **Total Tags:** ${metadata.tags.length}\n\n`;
      
      result += `### Components by Category\n\n`;
      Object.entries(metadata.categories).forEach(([category, data]: [string, any]) => {
        result += `- **${category}:** ${data.count} components\n`;
      });
      result += `\n`;
    }

    if (includeDependencies && metadata.dependencies.length > 0) {
      result += `## Most Used Dependencies\n\n`;
      metadata.dependencies.slice(0, 10).forEach((dep: any, index: number) => {
        result += `${index + 1}. **${dep.name}** - Used by ${dep.count} components\n`;
      });
      result += `\n`;
    }

    if (includeTags && metadata.tags.length > 0) {
      result += `## Popular Tags\n\n`;
      metadata.tags.slice(0, 15).forEach((tag: any, index: number) => {
        result += `${index + 1}. **${tag.name}** (${tag.count} components)\n`;
      });
      result += `\n`;
    }

    return result;
  }
}
