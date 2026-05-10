/**
 * ProviderCatalogService — concrete implementation of IProviderCatalogService.
 *
 * Manages the expanded provider catalog with search, filtering, and
 * category organization for 50+ provider configs. Loads from
 * BUILTIN_PROVIDER_CONFIGS on initialization.
 *
 * Feature: canary-provider-expansion
 * Requirements: 11.2, 11.3, 11.4, 11.7, 11.8, 15.1
 */
import type {
  ICanaryProviderConfig,
  IProviderCatalogFilters,
  IProviderCatalogService,
} from '@brightchain/digitalburnbag-lib';
import {
  BUILTIN_PROVIDER_CONFIGS,
  ProviderCategory,
} from '@brightchain/digitalburnbag-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Concrete implementation of IProviderCatalogService.
 *
 * - Loads BUILTIN_PROVIDER_CONFIGS on construction for efficient lookups
 * - Uses a Map for O(1) ID-based provider retrieval
 * - Supports filtering by category, authType, webhooks, and search query (AND logic)
 * - Case-insensitive substring matching for search
 */
export class ProviderCatalogService<TID extends PlatformID = string>
  implements IProviderCatalogService<TID>
{
  private readonly providers: ICanaryProviderConfig<TID>[];
  private readonly providerMap: Map<string, ICanaryProviderConfig<TID>>;

  constructor(configs?: ICanaryProviderConfig<TID>[]) {
    this.providers = (configs ??
      BUILTIN_PROVIDER_CONFIGS) as ICanaryProviderConfig<TID>[];
    this.providerMap = new Map<string, ICanaryProviderConfig<TID>>();
    for (const config of this.providers) {
      this.providerMap.set(String(config.id), config);
    }
  }

  /**
   * Get all providers in the catalog, optionally filtered.
   * Filters are applied with AND logic — all provided filters must match.
   */
  getProviders(filters?: IProviderCatalogFilters): ICanaryProviderConfig<TID>[] {
    if (!filters) {
      return [...this.providers];
    }

    return this.providers.filter((config) => {
      if (
        filters.category !== undefined &&
        config.category !== filters.category
      ) {
        return false;
      }

      if (
        filters.authType !== undefined &&
        config.auth.type !== filters.authType
      ) {
        return false;
      }

      if (
        filters.supportsWebhooks !== undefined &&
        config.supportsWebhooks !== filters.supportsWebhooks
      ) {
        return false;
      }

      if (filters.searchQuery !== undefined && filters.searchQuery !== '') {
        const query = filters.searchQuery.toLowerCase();
        const nameMatch = config.name.toLowerCase().includes(query);
        const descMatch = config.description.toLowerCase().includes(query);
        if (!nameMatch && !descMatch) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Search providers by name/description with case-insensitive substring matching.
   */
  searchProviders(query: string): ICanaryProviderConfig<TID>[] {
    if (!query || query.trim() === '') {
      return [...this.providers];
    }

    const lowerQuery = query.toLowerCase();
    return this.providers.filter((config) => {
      return (
        config.name.toLowerCase().includes(lowerQuery) ||
        config.description.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Get providers grouped by category.
   */
  getProvidersByCategory(): Map<ProviderCategory, ICanaryProviderConfig<TID>[]> {
    const categoryMap = new Map<
      ProviderCategory,
      ICanaryProviderConfig<TID>[]
    >();

    for (const config of this.providers) {
      const existing = categoryMap.get(config.category);
      if (existing) {
        existing.push(config);
      } else {
        categoryMap.set(config.category, [config]);
      }
    }

    return categoryMap;
  }

  /**
   * Get a single provider config by ID.
   * Uses Map for O(1) lookup.
   */
  getProvider(providerId: string): ICanaryProviderConfig<TID> | undefined {
    return this.providerMap.get(providerId);
  }

  /**
   * Get provider count per category.
   */
  getCategoryCounts(): Record<ProviderCategory, number> {
    const counts = {} as Record<ProviderCategory, number>;

    // Initialize all categories to 0
    for (const category of Object.values(ProviderCategory)) {
      counts[category] = 0;
    }

    for (const config of this.providers) {
      counts[config.category] = (counts[config.category] || 0) + 1;
    }

    return counts;
  }

  /**
   * Get recommended providers (highest reliability).
   * Returns providers that have enabledByDefault: true AND supportsWebhooks: true.
   */
  getRecommendedProviders(): ICanaryProviderConfig<TID>[] {
    return this.providers.filter(
      (config) => config.enabledByDefault && config.supportsWebhooks,
    );
  }
}
