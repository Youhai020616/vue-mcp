import { VueBitsComponent, SearchFilters, SearchResult, ComponentMetadata } from '../types/index.js';

export class SearchEngine {
  private components: VueBitsComponent[] = [];

  constructor(components: VueBitsComponent[]) {
    this.components = components;
  }

  search(query: string, filters: SearchFilters = {}): SearchResult {
    let results = [...this.components];

    // Apply text search
    if (query.trim()) {
      const searchTerms = query.toLowerCase().split(' ');
      results = results.filter(component => {
        const searchableText = [
          component.name,
          component.description,
          component.subcategory,
          ...component.tags
        ].join(' ').toLowerCase();

        return searchTerms.every(term => searchableText.includes(term));
      });
    }

    // Apply filters
    if (filters.category) {
      results = results.filter(c => c.category === filters.category);
    }

    if (filters.subcategory) {
      results = results.filter(c =>
        c.subcategory.toLowerCase().includes(filters.subcategory!.toLowerCase())
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(c => 
        filters.tags!.some(tag => c.tags.includes(tag))
      );
    }

    if (filters.complexity) {
      results = results.filter(c => c.complexity === filters.complexity);
    }

    if (filters.performance) {
      results = results.filter(c => c.performance === filters.performance);
    }

    if (filters.hasProps && filters.hasProps.length > 0) {
      results = results.filter(c => 
        filters.hasProps!.some(propName => 
          c.props.some(prop => prop.name.toLowerCase().includes(propName.toLowerCase()))
        )
      );
    }

    // Sort by relevance
    results = this.sortByRelevance(results, query);

    return {
      components: results,
      total: results.length,
      filters
    };
  }

  getComponentById(id: string): VueBitsComponent | null {
    return this.components.find(c => c.id === id) || null;
  }

  getComponentByName(name: string): VueBitsComponent | null {
    return this.components.find(c => 
      c.name.toLowerCase() === name.toLowerCase()
    ) || null;
  }

  getComponentsByCategory(category: string): VueBitsComponent[] {
    return this.components.filter(c => 
      c.category.toLowerCase() === category.toLowerCase()
    );
  }

  getComponentsBySubcategory(subcategory: string): VueBitsComponent[] {
    return this.components.filter(c => 
      c.subcategory.toLowerCase().includes(subcategory.toLowerCase())
    );
  }

  getComponentsByTags(tags: string[]): VueBitsComponent[] {
    return this.components.filter(c => 
      tags.some(tag => c.tags.includes(tag.toLowerCase()))
    );
  }

  getSimilarComponents(componentId: string, limit: number = 5): VueBitsComponent[] {
    const component = this.getComponentById(componentId);
    if (!component) return [];

    const similar = this.components
      .filter(c => c.id !== componentId)
      .map(c => ({
        component: c,
        score: this.calculateSimilarity(component, c)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.component);

    return similar;
  }

  getMetadata(): ComponentMetadata {
    const categories = {
      TextAnimations: { count: 0, subcategories: [] as string[] },
      Animations: { count: 0, subcategories: [] as string[] },
      Components: { count: 0, subcategories: [] as string[] },
      Backgrounds: { count: 0, subcategories: [] as string[] }
    };

    const dependencyMap = new Map<string, { count: number; components: string[] }>();
    const tagMap = new Map<string, number>();

    this.components.forEach(component => {
      // Count categories
      categories[component.category].count++;
      if (!categories[component.category].subcategories.includes(component.subcategory)) {
        categories[component.category].subcategories.push(component.subcategory);
      }

      // Count dependencies
      component.dependencies.forEach(dep => {
        if (!dependencyMap.has(dep)) {
          dependencyMap.set(dep, { count: 0, components: [] });
        }
        const depData = dependencyMap.get(dep)!;
        depData.count++;
        depData.components.push(component.name);
      });

      // Count tags
      component.tags.forEach(tag => {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      });
    });

    const dependencies = Array.from(dependencyMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);

    const tags = Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalComponents: this.components.length,
      categories,
      dependencies,
      tags
    };
  }

  private sortByRelevance(components: VueBitsComponent[], query: string): VueBitsComponent[] {
    if (!query.trim()) return components;

    const queryLower = query.toLowerCase();
    
    return components.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Exact name match gets highest score
      if (a.name.toLowerCase() === queryLower) scoreA += 100;
      if (b.name.toLowerCase() === queryLower) scoreB += 100;

      // Name starts with query
      if (a.name.toLowerCase().startsWith(queryLower)) scoreA += 50;
      if (b.name.toLowerCase().startsWith(queryLower)) scoreB += 50;

      // Name contains query
      if (a.name.toLowerCase().includes(queryLower)) scoreA += 25;
      if (b.name.toLowerCase().includes(queryLower)) scoreB += 25;

      // Subcategory match
      if (a.subcategory.toLowerCase().includes(queryLower)) scoreA += 20;
      if (b.subcategory.toLowerCase().includes(queryLower)) scoreB += 20;

      // Tag match
      const aTagMatch = a.tags.some(tag => tag.includes(queryLower));
      const bTagMatch = b.tags.some(tag => tag.includes(queryLower));
      if (aTagMatch) scoreA += 15;
      if (bTagMatch) scoreB += 15;

      // Description match
      if (a.description.toLowerCase().includes(queryLower)) scoreA += 10;
      if (b.description.toLowerCase().includes(queryLower)) scoreB += 10;

      return scoreB - scoreA;
    });
  }

  private calculateSimilarity(componentA: VueBitsComponent, componentB: VueBitsComponent): number {
    let score = 0;

    // Same category
    if (componentA.category === componentB.category) score += 30;

    // Same subcategory
    if (componentA.subcategory === componentB.subcategory) score += 20;

    // Shared tags
    const sharedTags = componentA.tags.filter(tag => componentB.tags.includes(tag));
    score += sharedTags.length * 10;

    // Shared dependencies
    const sharedDeps = componentA.dependencies.filter(dep => componentB.dependencies.includes(dep));
    score += sharedDeps.length * 5;

    // Similar complexity
    if (componentA.complexity === componentB.complexity) score += 5;

    // Similar performance
    if (componentA.performance === componentB.performance) score += 5;

    return score;
  }

  getPopularComponents(limit: number = 10): VueBitsComponent[] {
    // Sort by a combination of factors that indicate popularity
    return this.components
      .sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        // Simpler components tend to be more popular
        if (a.complexity === 'simple') scoreA += 3;
        if (a.complexity === 'medium') scoreA += 2;
        if (b.complexity === 'simple') scoreB += 3;
        if (b.complexity === 'medium') scoreB += 2;

        // Better performance components
        if (a.performance === 'high') scoreA += 3;
        if (a.performance === 'medium') scoreA += 1;
        if (b.performance === 'high') scoreB += 3;
        if (b.performance === 'medium') scoreB += 1;

        // More props indicate more customization options
        scoreA += Math.min(a.props.length, 5);
        scoreB += Math.min(b.props.length, 5);

        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  getRecommendations(userPreferences: {
    categories?: string[];
    complexity?: string;
    performance?: string;
    tags?: string[];
  }): VueBitsComponent[] {
    let candidates = [...this.components];

    // Filter by preferences
    if (userPreferences.categories && userPreferences.categories.length > 0) {
      candidates = candidates.filter(c => 
        userPreferences.categories!.includes(c.category)
      );
    }

    if (userPreferences.complexity) {
      candidates = candidates.filter(c => c.complexity === userPreferences.complexity);
    }

    if (userPreferences.performance) {
      candidates = candidates.filter(c => c.performance === userPreferences.performance);
    }

    if (userPreferences.tags && userPreferences.tags.length > 0) {
      candidates = candidates.filter(c => 
        userPreferences.tags!.some(tag => c.tags.includes(tag))
      );
    }

    // Sort by relevance to preferences
    return candidates.slice(0, 8);
  }
}
