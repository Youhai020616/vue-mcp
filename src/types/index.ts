export interface VueBitsComponent {
  id: string;
  name: string;
  category: ComponentCategory;
  subcategory: string;
  description: string;
  filePath: string;
  code: string;
  props: ComponentProp[];
  dependencies: string[];
  tags: string[];
  examples: ComponentExample[];
  complexity: 'simple' | 'medium' | 'complex';
  performance: 'high' | 'medium' | 'low';
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  default?: any;
  description: string;
  options?: string[];
}

export interface ComponentExample {
  title: string;
  description: string;
  code: string;
  props?: Record<string, any>;
}

export type ComponentCategory = 
  | 'TextAnimations'
  | 'Animations' 
  | 'Components'
  | 'Backgrounds';

export interface SearchFilters {
  category?: ComponentCategory;
  subcategory?: string;
  tags?: string[];
  complexity?: 'simple' | 'medium' | 'complex';
  performance?: 'high' | 'medium' | 'low';
  hasProps?: string[];
}

export interface SearchResult {
  components: VueBitsComponent[];
  total: number;
  filters: SearchFilters;
}

export interface ComponentMetadata {
  totalComponents: number;
  categories: {
    [K in ComponentCategory]: {
      count: number;
      subcategories: string[];
    }
  };
  dependencies: {
    name: string;
    count: number;
    components: string[];
  }[];
  tags: {
    name: string;
    count: number;
  }[];
}

export interface InstallationGuide {
  component: string;
  dependencies: string[];
  installCommand: string;
  importStatement: string;
  basicUsage: string;
  advancedUsage?: string;
  notes?: string[];
}
