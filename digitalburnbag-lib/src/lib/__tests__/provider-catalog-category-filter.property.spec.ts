/**
 * Property test: Provider catalog category filtering.
 *
 * **Property 15: Provider catalog category filtering**
 * **Validates: Requirements 11.3**
 *
 * For any category filter, all returned providers SHALL have matching category;
 * no provider with matching category SHALL be omitted.
 */

import fc from 'fast-check';
import { ProviderCategory } from '../interfaces/canary-provider/canary-provider-adapter';
import { BUILTIN_PROVIDER_CONFIGS } from '../providers/builtin-provider-configs';
import { ICanaryProviderConfig } from '../interfaces/canary-provider';

// ── Pure filter function under test ─────────────────────────────────

/**
 * Pure function that filters provider configs by category.
 * Returns only configs whose category matches the specified category.
 */
function filterByCategory(
  category: ProviderCategory,
  configs: ICanaryProviderConfig<string>[],
): ICanaryProviderConfig<string>[] {
  return configs.filter((config) => config.category === category);
}

// ── Generators ──────────────────────────────────────────────────────

/**
 * Generator that produces random ProviderCategory values from the enum.
 */
function providerCategoryArbitrary(): fc.Arbitrary<ProviderCategory> {
  const categories = Object.values(ProviderCategory);
  return fc.constantFrom(...categories);
}

// ── Property Tests ──────────────────────────────────────────────────

describe('Property 15: Provider catalog category filtering', () => {
  const configs = BUILTIN_PROVIDER_CONFIGS;

  it('soundness: every returned provider has the specified category', () => {
    fc.assert(
      fc.property(providerCategoryArbitrary(), (category) => {
        const results = filterByCategory(category, configs);

        for (const result of results) {
          expect(result.category).toBe(category);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('completeness: no provider with matching category is omitted from results', () => {
    fc.assert(
      fc.property(providerCategoryArbitrary(), (category) => {
        const results = filterByCategory(category, configs);

        // Check every config in the full catalog
        for (const config of configs) {
          if (config.category === category) {
            // This config should be in the results
            expect(results).toContainEqual(config);
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});
