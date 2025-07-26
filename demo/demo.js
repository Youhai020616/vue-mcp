#!/usr/bin/env node

/**
 * Vue Bits MCP Demo
 * This script demonstrates the capabilities of the Vue Bits MCP server
 */

import { ComponentParser } from '../dist/parsers/componentParser.js';
import { SearchEngine } from '../dist/parsers/searchEngine.js';
import { ToolHandlers } from '../dist/tools/handlers.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class VueBitsDemo {
  constructor() {
    this.searchEngine = null;
    this.toolHandlers = null;
  }

  async initialize() {
    console.log('🚀 Initializing Vue Bits MCP Demo...\n');
    
    // For demo purposes, we'll create some mock components
    const mockComponents = this.createMockComponents();
    
    this.searchEngine = new SearchEngine(mockComponents);
    this.toolHandlers = new ToolHandlers(this.searchEngine);
    
    console.log(`✅ Initialized with ${mockComponents.length} demo components\n`);
  }

  createMockComponents() {
    return [
      {
        id: 'textanimations-split-text',
        name: 'SplitText',
        category: 'TextAnimations',
        subcategory: 'Split Text',
        description: 'Animated text component that splits text into characters, words, or lines with customizable animations',
        filePath: 'src/content/TextAnimations/SplitText/SplitText.vue',
        code: `<template>
  <p ref="textRef" :class="className">
    {{ text }}
  </p>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { gsap } from 'gsap';

interface Props {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  className: '',
  delay: 100,
  duration: 0.6
});

const textRef = ref<HTMLElement>();

onMounted(() => {
  // Animation logic here
});
</script>`,
        props: [
          { name: 'text', type: 'string', required: true, description: 'The text content to animate' },
          { name: 'className', type: 'string', required: false, default: '', description: 'Additional CSS classes' },
          { name: 'delay', type: 'number', required: false, default: 100, description: 'Animation delay in milliseconds' },
          { name: 'duration', type: 'number', required: false, default: 0.6, description: 'Animation duration in seconds' }
        ],
        dependencies: ['gsap'],
        tags: ['text', 'animation', 'gsap', 'split'],
        examples: [],
        complexity: 'medium',
        performance: 'high'
      },
      {
        id: 'animations-splash-cursor',
        name: 'SplashCursor',
        category: 'Animations',
        subcategory: 'Splash Cursor',
        description: 'Interactive cursor effect that creates splash animations on mouse movement',
        filePath: 'src/content/Animations/SplashCursor/SplashCursor.vue',
        code: `<template>
  <div class="splash-cursor-container">
    <canvas ref="canvasRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Props {
  color?: string;
  size?: number;
  intensity?: number;
}

const props = withDefaults(defineProps<Props>(), {
  color: '#3b82f6',
  size: 20,
  intensity: 1
});

const canvasRef = ref<HTMLCanvasElement>();

onMounted(() => {
  // Canvas animation logic here
});
</script>`,
        props: [
          { name: 'color', type: 'string', required: false, default: '#3b82f6', description: 'Splash color' },
          { name: 'size', type: 'number', required: false, default: 20, description: 'Splash size' },
          { name: 'intensity', type: 'number', required: false, default: 1, description: 'Animation intensity' }
        ],
        dependencies: [],
        tags: ['cursor', 'interactive', 'canvas', 'mouse'],
        examples: [],
        complexity: 'simple',
        performance: 'high'
      },
      {
        id: 'backgrounds-aurora',
        name: 'Aurora',
        category: 'Backgrounds',
        subcategory: 'Aurora',
        description: 'Beautiful aurora borealis background effect with WebGL rendering',
        filePath: 'src/content/Backgrounds/Aurora/Aurora.vue',
        code: `<template>
  <div class="aurora-container">
    <canvas ref="canvasRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import * as THREE from 'three';

interface Props {
  colors?: string[];
  speed?: number;
  intensity?: number;
}

const props = withDefaults(defineProps<Props>(), {
  colors: ['#00ff88', '#0088ff', '#8800ff'],
  speed: 1,
  intensity: 0.8
});

const canvasRef = ref<HTMLCanvasElement>();

onMounted(() => {
  // Three.js aurora logic here
});
</script>`,
        props: [
          { name: 'colors', type: 'string[]', required: false, default: "['#00ff88', '#0088ff', '#8800ff']", description: 'Aurora colors array' },
          { name: 'speed', type: 'number', required: false, default: 1, description: 'Animation speed multiplier' },
          { name: 'intensity', type: 'number', required: false, default: 0.8, description: 'Effect intensity' }
        ],
        dependencies: ['three'],
        tags: ['background', '3d', 'webgl', 'aurora', 'three.js'],
        examples: [],
        complexity: 'complex',
        performance: 'medium'
      }
    ];
  }

  async runDemo() {
    console.log('🎯 Vue Bits MCP Server Demo\n');
    console.log('This demo showcases the capabilities of the Vue Bits MCP server.\n');

    await this.demoSearch();
    await this.demoComponentCode();
    await this.demoInstallationGuide();
    await this.demoMetadata();
    
    console.log('✨ Demo completed! The Vue Bits MCP server provides intelligent access to 40+ animated Vue components.');
    console.log('🚀 Ready to enhance your Vue projects with beautiful animations!\n');
  }

  async demoSearch() {
    console.log('🔍 Demo: Searching for components\n');
    
    const request = {
      params: {
        name: 'search_vue_components',
        arguments: {
          query: 'animation',
          limit: 3
        }
      }
    };

    const result = await this.toolHandlers.handleToolCall(request);
    console.log(result.content[0].text);
    console.log('─'.repeat(80) + '\n');
  }

  async demoComponentCode() {
    console.log('📋 Demo: Getting component code\n');
    
    const request = {
      params: {
        name: 'get_component_code',
        arguments: {
          componentId: 'textanimations-split-text',
          includeProps: true
        }
      }
    };

    const result = await this.toolHandlers.handleToolCall(request);
    const content = result.content[0].text;
    
    // Show first 20 lines of the result
    const lines = content.split('\n').slice(0, 20);
    console.log(lines.join('\n'));
    console.log('\n... (truncated for demo)\n');
    console.log('─'.repeat(80) + '\n');
  }

  async demoInstallationGuide() {
    console.log('📦 Demo: Getting installation guide\n');
    
    const request = {
      params: {
        name: 'get_installation_guide',
        arguments: {
          componentId: 'backgrounds-aurora',
          projectType: 'vue3'
        }
      }
    };

    const result = await this.toolHandlers.handleToolCall(request);
    console.log(result.content[0].text);
    console.log('─'.repeat(80) + '\n');
  }

  async demoMetadata() {
    console.log('📊 Demo: Getting library metadata\n');
    
    const request = {
      params: {
        name: 'get_component_metadata',
        arguments: {}
      }
    };

    const result = await this.toolHandlers.handleToolCall(request);
    const content = result.content[0].text;
    
    // Show first 15 lines of the result
    const lines = content.split('\n').slice(0, 15);
    console.log(lines.join('\n'));
    console.log('\n... (truncated for demo)\n');
    console.log('─'.repeat(80) + '\n');
  }
}

// Run demo if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const demo = new VueBitsDemo();
  
  demo.initialize()
    .then(() => demo.runDemo())
    .catch(error => {
      console.error('💥 Demo failed:', error);
      process.exit(1);
    });
}
