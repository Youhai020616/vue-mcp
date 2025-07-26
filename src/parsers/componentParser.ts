import fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { parse } from '@vue/compiler-sfc';
import { VueBitsComponent, ComponentCategory, ComponentProp } from '../types/index.js';

export class ComponentParser {
  private vueBitsPath: string;
  private components: VueBitsComponent[] = [];

  constructor(vueBitsPath: string) {
    this.vueBitsPath = vueBitsPath;
  }

  async parseAllComponents(): Promise<VueBitsComponent[]> {
    console.log('🔍 Parsing Vue Bits components...');
    
    const contentPath = path.join(this.vueBitsPath, 'src/content');
    const categories = await fs.readdir(contentPath);
    
    for (const category of categories) {
      const categoryPath = path.join(contentPath, category);
      const stat = await fs.stat(categoryPath);
      
      if (stat.isDirectory()) {
        await this.parseCategory(category as ComponentCategory, categoryPath);
      }
    }
    
    console.log(`✅ Parsed ${this.components.length} components`);
    return this.components;
  }

  private async parseCategory(category: ComponentCategory, categoryPath: string): Promise<void> {
    const subcategories = await fs.readdir(categoryPath);
    
    for (const subcategory of subcategories) {
      const subcategoryPath = path.join(categoryPath, subcategory);
      const stat = await fs.stat(subcategoryPath);
      
      if (stat.isDirectory()) {
        await this.parseSubcategory(category, subcategory, subcategoryPath);
      }
    }
  }

  private async parseSubcategory(
    category: ComponentCategory, 
    subcategory: string, 
    subcategoryPath: string
  ): Promise<void> {
    const vueFiles = await glob('**/*.vue', { cwd: subcategoryPath });
    
    for (const vueFile of vueFiles) {
      const filePath = path.join(subcategoryPath, vueFile);
      const component = await this.parseVueComponent(category, subcategory, filePath);
      
      if (component) {
        this.components.push(component);
      }
    }
  }

  private async parseVueComponent(
    category: ComponentCategory,
    subcategory: string,
    filePath: string
  ): Promise<VueBitsComponent | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { descriptor } = parse(content);
      
      const componentName = path.basename(filePath, '.vue');
      const id = `${category.toLowerCase()}-${subcategory.toLowerCase().replace(/\s+/g, '-')}`;
      
      // Extract props from script setup
      const props = this.extractProps(descriptor.script?.content || descriptor.scriptSetup?.content || '');
      
      // Extract dependencies
      const dependencies = this.extractDependencies(content);
      
      // Generate tags based on component analysis
      const tags = this.generateTags(componentName, category, dependencies, content);
      
      const component: VueBitsComponent = {
        id,
        name: componentName,
        category,
        subcategory,
        description: this.generateDescription(componentName, category),
        filePath: path.relative(this.vueBitsPath, filePath),
        code: content,
        props,
        dependencies,
        tags,
        examples: [],
        complexity: this.assessComplexity(content, dependencies),
        performance: this.assessPerformance(dependencies, content)
      };
      
      return component;
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error);
      return null;
    }
  }

  private extractProps(scriptContent: string): ComponentProp[] {
    const props: ComponentProp[] = [];
    
    // Extract interface definitions
    const interfaceRegex = /interface\s+(\w+Props)\s*{([^}]+)}/g;
    let match;
    
    while ((match = interfaceRegex.exec(scriptContent)) !== null) {
      const interfaceBody = match[2];
      const propRegex = /(\w+)(\?)?:\s*([^;]+);?/g;
      let propMatch;
      
      while ((propMatch = propRegex.exec(interfaceBody)) !== null) {
        const [, name, optional, type] = propMatch;
        
        props.push({
          name,
          type: type.trim(),
          required: !optional,
          description: this.generatePropDescription(name, type.trim())
        });
      }
    }
    
    // Extract withDefaults
    const defaultsRegex = /withDefaults\([^,]+,\s*{([^}]+)}/g;
    const defaultsMatch = defaultsRegex.exec(scriptContent);
    
    if (defaultsMatch) {
      const defaultsBody = defaultsMatch[1];
      const defaultRegex = /(\w+):\s*([^,\n]+)/g;
      let defaultMatch;
      
      while ((defaultMatch = defaultRegex.exec(defaultsBody)) !== null) {
        const [, propName, defaultValue] = defaultMatch;
        const prop = props.find(p => p.name === propName);
        if (prop) {
          prop.default = defaultValue.trim();
        }
      }
    }
    
    return props;
  }

  private extractDependencies(content: string): string[] {
    const dependencies = new Set<string>();
    
    // Extract import statements
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      
      // Skip relative imports
      if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
        dependencies.add(importPath);
      }
    }
    
    return Array.from(dependencies);
  }

  private generateTags(
    componentName: string, 
    category: ComponentCategory, 
    dependencies: string[], 
    content: string
  ): string[] {
    const tags = new Set<string>();
    
    // Add category-based tags
    tags.add(category.toLowerCase());
    
    // Add dependency-based tags
    if (dependencies.includes('gsap')) tags.add('gsap');
    if (dependencies.includes('three')) tags.add('3d');
    if (dependencies.includes('matter-js')) tags.add('physics');
    
    // Add content-based tags
    if (content.includes('ScrollTrigger')) tags.add('scroll');
    if (content.includes('mouse') || content.includes('cursor')) tags.add('interactive');
    if (content.includes('canvas')) tags.add('canvas');
    if (content.includes('WebGL')) tags.add('webgl');
    
    // Add name-based tags
    const nameLower = componentName.toLowerCase();
    if (nameLower.includes('text')) tags.add('text');
    if (nameLower.includes('card')) tags.add('card');
    if (nameLower.includes('button')) tags.add('button');
    if (nameLower.includes('hover')) tags.add('hover');
    
    return Array.from(tags);
  }

  private generateDescription(componentName: string, category: ComponentCategory): string {
    const descriptions: Record<string, string> = {
      'SplitText': 'Animated text component that splits text into characters, words, or lines with customizable animations',
      'BlurText': 'Text animation with blur effects and smooth transitions',
      'CircularText': 'Text arranged in a circular pattern with rotation animations',
      'ShinyText': 'Text with metallic shine and reflection effects',
      // Add more specific descriptions as needed
    };
    
    return descriptions[componentName] || 
           `${componentName} - A ${category.toLowerCase()} component with advanced animation capabilities`;
  }

  private generatePropDescription(name: string, type: string): string {
    const commonDescriptions: Record<string, string> = {
      'text': 'The text content to display',
      'className': 'Additional CSS classes to apply',
      'delay': 'Animation delay in milliseconds',
      'duration': 'Animation duration in seconds',
      'ease': 'Animation easing function',
      'threshold': 'Intersection observer threshold',
      'rootMargin': 'Root margin for intersection observer'
    };
    
    return commonDescriptions[name] || `${name} property of type ${type}`;
  }

  private assessComplexity(content: string, dependencies: string[]): 'simple' | 'medium' | 'complex' {
    let score = 0;
    
    // Dependency complexity
    if (dependencies.includes('three')) score += 3;
    if (dependencies.includes('gsap')) score += 2;
    if (dependencies.includes('matter-js')) score += 2;
    
    // Code complexity
    if (content.length > 5000) score += 2;
    if (content.includes('WebGL')) score += 2;
    if (content.includes('canvas')) score += 1;
    if ((content.match(/useEffect|onMounted/g) || []).length > 3) score += 1;
    
    if (score >= 6) return 'complex';
    if (score >= 3) return 'medium';
    return 'simple';
  }

  private assessPerformance(dependencies: string[], content: string): 'high' | 'medium' | 'low' {
    let score = 0;
    
    // Heavy dependencies
    if (dependencies.includes('three')) score -= 2;
    if (dependencies.includes('matter-js')) score -= 1;
    
    // Performance indicators
    if (content.includes('requestAnimationFrame')) score += 1;
    if (content.includes('WebGL')) score -= 1;
    if (content.includes('canvas')) score -= 1;
    
    if (score >= 1) return 'high';
    if (score >= -1) return 'medium';
    return 'low';
  }

  async saveComponentsData(outputPath: string): Promise<void> {
    await fs.ensureDir(path.dirname(outputPath));
    await fs.writeJson(outputPath, this.components, { spaces: 2 });
    console.log(`💾 Saved components data to ${outputPath}`);
  }
}
