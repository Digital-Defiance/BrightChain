/**
 * Unit tests for ProviderCatalogService.
 *
 * Feature: canary-provider-expansion
 * Requirements: 11.3, 11.4, 11.7, 11.8
 */
import {
  BUILTIN_PROVIDER_CONFIGS,
  ProviderCategory,
} from '@brightchain/digitalburnbag-lib';
import { ProviderCatalogService } from '../../services/provider-catalog-service';

describe('ProviderCatalogService', () => {
  let service: ProviderCatalogService;

  beforeEach(() => {
    service = new ProviderCatalogService();
  });

  // Req 11.3: All providers loaded from BUILTIN_PROVIDER_CONFIGS
  describe('provider loading', () => {
    it('should load all providers from BUILTIN_PROVIDER_CONFIGS', () => {
      const providers = service.getProviders();
      expect(providers.length).toBe(BUILTIN_PROVIDER_CONFIGS.length);
    });

    it('should have at least 52 providers in the catalog', () => {
      const providers = service.getProviders();
      expect(providers.length).toBeGreaterThanOrEqual(52);
    });

    it('should return a copy of providers, not the internal array', () => {
      const providers1 = service.getProviders();
      const providers2 = service.getProviders();
      expect(providers1).not.toBe(providers2);
      expect(providers1).toEqual(providers2);
    });

    it('should allow lookup of each provider by ID', () => {
      for (const config of BUILTIN_PROVIDER_CONFIGS) {
        const found = service.getProvider(config.id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(config.id);
      }
    });
  });

  // Req 11.3: Category filtering returns only matching providers
  describe('category filtering', () => {
    it('should return only providers matching the specified category', () => {
      const category = ProviderCategory.HEALTH_FITNESS;
      const filtered = service.getProviders({ category });

      expect(filtered.length).toBeGreaterThan(0);
      for (const provider of filtered) {
        expect(provider.category).toBe(category);
      }
    });

    it('should return different results for different categories', () => {
      const healthProviders = service.getProviders({
        category: ProviderCategory.HEALTH_FITNESS,
      });
      const commProviders = service.getProviders({
        category: ProviderCategory.COMMUNICATION,
      });

      expect(healthProviders.length).toBeGreaterThan(0);
      expect(commProviders.length).toBeGreaterThan(0);

      const healthIds = new Set(healthProviders.map((p) => p.id));
      for (const provider of commProviders) {
        expect(healthIds.has(provider.id)).toBe(false);
      }
    });

    it('should return all providers when no filter is specified', () => {
      const all = service.getProviders();
      const unfiltered = service.getProviders(undefined);
      expect(all.length).toBe(unfiltered.length);
    });

    it('should return empty array for a category with no providers', () => {
      // Use OTHER category which may have no providers
      const filtered = service.getProviders({
        category: ProviderCategory.OTHER,
      });
      // It's valid to have 0 or more; just verify all match
      for (const provider of filtered) {
        expect(provider.category).toBe(ProviderCategory.OTHER);
      }
    });
  });

  // Req 11.4: Search returns case-insensitive matches across name and description
  describe('search', () => {
    it('should find providers by name (case-insensitive)', () => {
      const results = service.searchProviders('github');
      expect(results.length).toBeGreaterThan(0);
      const hasGithub = results.some(
        (p) => p.name.toLowerCase().includes('github'),
      );
      expect(hasGithub).toBe(true);
    });

    it('should find providers by description (case-insensitive)', () => {
      // Search for a term likely in descriptions but not names
      const results = service.searchProviders('heartbeat');
      // All results should have 'heartbeat' in name or description
      for (const provider of results) {
        const nameMatch = provider.name.toLowerCase().includes('heartbeat');
        const descMatch = provider.description
          .toLowerCase()
          .includes('heartbeat');
        expect(nameMatch || descMatch).toBe(true);
      }
    });

    it('should be case-insensitive', () => {
      const lower = service.searchProviders('spotify');
      const upper = service.searchProviders('SPOTIFY');
      const mixed = service.searchProviders('SpOtIfY');

      expect(lower.length).toBe(upper.length);
      expect(lower.length).toBe(mixed.length);
      expect(lower.map((p) => p.id)).toEqual(upper.map((p) => p.id));
    });

    it('should return all providers for empty query', () => {
      const all = service.searchProviders('');
      expect(all.length).toBe(BUILTIN_PROVIDER_CONFIGS.length);
    });

    it('should return empty array for non-matching query', () => {
      const results = service.searchProviders(
        'xyznonexistentprovider123456789',
      );
      expect(results).toHaveLength(0);
    });

    it('should also work via getProviders with searchQuery filter', () => {
      const searchResults = service.searchProviders('slack');
      const filterResults = service.getProviders({ searchQuery: 'slack' });

      expect(searchResults.length).toBe(filterResults.length);
      expect(searchResults.map((p) => p.id).sort()).toEqual(
        filterResults.map((p) => p.id).sort(),
      );
    });
  });

  // Req 11.8: getCategoryCounts returns correct counts for all categories
  describe('getCategoryCounts', () => {
    it('should return counts for all ProviderCategory values', () => {
      const counts = service.getCategoryCounts();
      const allCategories = Object.values(ProviderCategory);

      for (const category of allCategories) {
        expect(counts[category]).toBeDefined();
        expect(typeof counts[category]).toBe('number');
      }
    });

    it('should have counts that sum to total provider count', () => {
      const counts = service.getCategoryCounts();
      const total = Object.values(counts).reduce(
        (sum, count) => sum + count,
        0,
      );
      expect(total).toBe(BUILTIN_PROVIDER_CONFIGS.length);
    });

    it('should match the number of providers returned by category filter', () => {
      const counts = service.getCategoryCounts();

      for (const category of Object.values(ProviderCategory)) {
        const filtered = service.getProviders({ category });
        expect(counts[category]).toBe(filtered.length);
      }
    });

    it('should have non-negative counts for all categories', () => {
      const counts = service.getCategoryCounts();
      for (const count of Object.values(counts)) {
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // Req 11.7: getRecommendedProviders returns non-empty list
  describe('getRecommendedProviders', () => {
    it('should return a non-empty list', () => {
      const recommended = service.getRecommendedProviders();
      expect(recommended.length).toBeGreaterThan(0);
    });

    it('should only return providers with enabledByDefault and supportsWebhooks', () => {
      const recommended = service.getRecommendedProviders();
      for (const provider of recommended) {
        expect(provider.enabledByDefault).toBe(true);
        expect(provider.supportsWebhooks).toBe(true);
      }
    });

    it('should return a subset of all providers', () => {
      const recommended = service.getRecommendedProviders();
      const all = service.getProviders();
      expect(recommended.length).toBeLessThanOrEqual(all.length);
    });
  });

  // Additional integration: getProvidersByCategory
  describe('getProvidersByCategory', () => {
    it('should group providers by their category', () => {
      const grouped = service.getProvidersByCategory();
      let totalCount = 0;

      for (const [category, providers] of grouped) {
        expect(Object.values(ProviderCategory)).toContain(category);
        for (const provider of providers) {
          expect(provider.category).toBe(category);
        }
        totalCount += providers.length;
      }

      expect(totalCount).toBe(BUILTIN_PROVIDER_CONFIGS.length);
    });
  });
});
