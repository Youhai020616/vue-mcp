import { Tool } from '@modelcontextprotocol/sdk/types.js';

export const SEARCH_COMPONENTS_TOOL: Tool = {
  name: 'search_vue_components',
  description: 'Search for Vue Bits animated components by name, category, or functionality',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query (component name, functionality, or keywords)'
      },
      category: {
        type: 'string',
        enum: ['TextAnimations', 'Animations', 'Components', 'Backgrounds'],
        description: 'Filter by component category'
      },
      subcategory: {
        type: 'string',
        description: 'Filter by subcategory (e.g., "Split Text", "Blur Text")'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by tags (e.g., ["gsap", "3d", "interactive"])'
      },
      complexity: {
        type: 'string',
        enum: ['simple', 'medium', 'complex'],
        description: 'Filter by implementation complexity'
      },
      performance: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Filter by performance characteristics'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10)',
        default: 10
      }
    }
  }
};

export const GET_COMPONENT_CODE_TOOL: Tool = {
  name: 'get_component_code',
  description: 'Get the complete Vue component source code and implementation details',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'Component ID (from search results)'
      },
      componentName: {
        type: 'string',
        description: 'Component name (alternative to ID)'
      },
      includeProps: {
        type: 'boolean',
        description: 'Include detailed props documentation',
        default: true
      },
      includeExamples: {
        type: 'boolean',
        description: 'Include usage examples',
        default: true
      }
    },
    required: ['componentId']
  }
};

export const GET_COMPONENT_PROPS_TOOL: Tool = {
  name: 'get_component_props',
  description: 'Get detailed information about component properties and configuration options',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'Component ID'
      },
      componentName: {
        type: 'string',
        description: 'Component name (alternative to ID)'
      }
    },
    required: ['componentId']
  }
};

export const LIST_CATEGORIES_TOOL: Tool = {
  name: 'list_categories',
  description: 'List all available component categories and subcategories with counts',
  inputSchema: {
    type: 'object',
    properties: {
      includeSubcategories: {
        type: 'boolean',
        description: 'Include subcategories in the response',
        default: true
      },
      includeStats: {
        type: 'boolean',
        description: 'Include component counts and statistics',
        default: true
      }
    }
  }
};

export const GET_INSTALLATION_GUIDE_TOOL: Tool = {
  name: 'get_installation_guide',
  description: 'Get installation and setup instructions for a specific component',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'Component ID'
      },
      componentName: {
        type: 'string',
        description: 'Component name (alternative to ID)'
      },
      projectType: {
        type: 'string',
        enum: ['vue3', 'nuxt3', 'vite', 'webpack'],
        description: 'Target project type for installation instructions',
        default: 'vue3'
      }
    },
    required: ['componentId']
  }
};

export const ANALYZE_DEPENDENCIES_TOOL: Tool = {
  name: 'analyze_dependencies',
  description: 'Analyze dependencies required for components and get installation commands',
  inputSchema: {
    type: 'object',
    properties: {
      componentIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of component IDs to analyze'
      },
      includeDevDependencies: {
        type: 'boolean',
        description: 'Include development dependencies',
        default: false
      },
      packageManager: {
        type: 'string',
        enum: ['npm', 'yarn', 'pnpm'],
        description: 'Preferred package manager',
        default: 'npm'
      }
    },
    required: ['componentIds']
  }
};

export const GET_SIMILAR_COMPONENTS_TOOL: Tool = {
  name: 'get_similar_components',
  description: 'Find components similar to a given component based on functionality and characteristics',
  inputSchema: {
    type: 'object',
    properties: {
      componentId: {
        type: 'string',
        description: 'Reference component ID'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of similar components to return',
        default: 5
      }
    },
    required: ['componentId']
  }
};

export const GET_POPULAR_COMPONENTS_TOOL: Tool = {
  name: 'get_popular_components',
  description: 'Get the most popular and commonly used components',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['TextAnimations', 'Animations', 'Components', 'Backgrounds'],
        description: 'Filter by category'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of components to return',
        default: 10
      }
    }
  }
};

export const GET_RECOMMENDATIONS_TOOL: Tool = {
  name: 'get_recommendations',
  description: 'Get personalized component recommendations based on preferences',
  inputSchema: {
    type: 'object',
    properties: {
      categories: {
        type: 'array',
        items: { 
          type: 'string',
          enum: ['TextAnimations', 'Animations', 'Components', 'Backgrounds']
        },
        description: 'Preferred categories'
      },
      complexity: {
        type: 'string',
        enum: ['simple', 'medium', 'complex'],
        description: 'Preferred complexity level'
      },
      performance: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Required performance level'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Preferred tags/technologies'
      },
      projectType: {
        type: 'string',
        description: 'Type of project (e.g., "landing page", "dashboard", "portfolio")'
      }
    }
  }
};

export const GET_COMPONENT_METADATA_TOOL: Tool = {
  name: 'get_component_metadata',
  description: 'Get comprehensive metadata about the Vue Bits component library',
  inputSchema: {
    type: 'object',
    properties: {
      includeStats: {
        type: 'boolean',
        description: 'Include detailed statistics',
        default: true
      },
      includeDependencies: {
        type: 'boolean',
        description: 'Include dependency analysis',
        default: true
      },
      includeTags: {
        type: 'boolean',
        description: 'Include tag statistics',
        default: true
      }
    }
  }
};

export const ALL_TOOLS = [
  SEARCH_COMPONENTS_TOOL,
  GET_COMPONENT_CODE_TOOL,
  GET_COMPONENT_PROPS_TOOL,
  LIST_CATEGORIES_TOOL,
  GET_INSTALLATION_GUIDE_TOOL,
  ANALYZE_DEPENDENCIES_TOOL,
  GET_SIMILAR_COMPONENTS_TOOL,
  GET_POPULAR_COMPONENTS_TOOL,
  GET_RECOMMENDATIONS_TOOL,
  GET_COMPONENT_METADATA_TOOL
];
