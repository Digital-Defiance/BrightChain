/**
 * Property test: Provider catalog search correctness.
 *
 * **Property 14: Provider catalog search correctness**
 * **Validates: Requirements 11.4**
 *
 * For any search query and any set of provider configs, all returned providers
 * SHALL have the query as a case-insensitive substring of name or description;
 * no matching provider SHALL be omitted.
 */

import fc from 'fast-check';
import {
  BUILTIN_PROVIDER_CONFIGS,
} from '../providers/builtin-provider-configs';
import { ICanaryProviderConfig } from '../interfaces/canary-provider';

// ── Pure search function under test ─────────────────────────────────

/**
 * Pure function that searches provider configs by checking if the query
 * is a case-insensitive substring of the provider's name or description.
 */
function searchProviders(
  query: string,
  configs: ICanaryProviderConfig<string>[],
): ICanaryProviderConfig<string>[] {
  const lowerQuery = query.toLowerCase();
  return configs.filter(
    (config) =>
      config.name.toLowerCase().includes(lowerQuery) ||
      config.description.toLowerCase().includes(lowerQuery),
  );
}

// ── Generators ──────────────────────────────────────────────────────

/**
 * Generator that produces substrings of existing provider names/descriptions.
 * This ensures we get queries that are likely to match at least one provider.
 */
function substringOfExistingProvider(): fc.Arbitrary<string> {
  return fc
    .integer({ min: 0, max: BUILTIN_PROVIDER_CONFIGS.length - 1 })
    .chain((index) => {
      const config = BUILTIN_PROVIDER_CONFIGS[index];
      // Pick either name or description
      return fc.boolean().chain((useName) => {
        const source = useName ? config.name : config.description;
        if (source.length === 0) return fc.constant('');
        return fc
          .integer({ min: 0, max: source.length - 1 })
          .chain((start) =>
            fc
              .integer({ min: start, max: source.length - 1 })
              .map((end) => source.slice(start, end + 1)),
          );
      });
    });
}

/**
 * Generator that produces a mix of:
 * - Substrings from existing providers (likely to match)
 * - Random strings (likely to not match)
 * - Empty string (matches everything)
 */
function searchQueryArbitrary(): fc.Arbitrary<string> {
  return fc.oneof(
    { weight: 3, arbitrary: substringOfExistingProvider() },
    { weight: 1, arbitrary: fc.string({ minLength: 1, maxLength: 20 }) },
    { weight: 1, arbitrary: fc.constant('') },
  );
}

// ── Property Tests ──────────────────────────────────────────────────

describe('Property 14: Provider catalog search correctness', () => {
  const configs = BUILTIN_PROVIDER_CONFIGS;

  it('soundness: every returned provider has the query as a case-insensitive substring of its name or description', () => {
    fc.assert(
      fc.property(searchQueryArbitrary(), (query) => {
        const results = searchProviders(query, configs);
        const lowerQuery = query.toLowerCase();

        for (const result of results) {
          const nameMatches = result.name.toLowerCase().includes(lowerQuery);
          const descMatches = result.description
            .toLowerCase()
            .includes(lowerQuery);
          expect(nameMatches || descMatches).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('completeness: no provider that matches the query is omitted from the results', () => {
    fc.assert(
      fc.property(searchQueryArbitrary(), (query) => {
        const results = searchProviders(query, configs);
        const lowerQuery = query.toLowerCase();

        // Check every config in the full catalog
        for (const config of configs) {
          const nameMatches = config.name.toLowerCase().includes(lowerQuery);
          const descMatches = config.description
            .toLowerCase()
            .includes(lowerQuery);

          if (nameMatches || descMatches) {
            // This config should be in the results
            expect(results).toContainEqual(config);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('empty query returns all providers', () => {
    const results = searchProviders('', configs);
    expect(results.length).toBe(configs.length);
  });

  it('search is case-insensitive', () => {
    fc.assert(
      fc.property(searchQueryArbitrary(), (query) => {
        const lowerResults = searchProviders(query.toLowerCase(), configs);
        const upperResults = searchProviders(query.toUpperCase(), configs);
        const mixedResults = searchProviders(query, configs);

        // All case variants should return the same set of results
        expect(lowerResults.length).toBe(mixedResults.length);
        expect(upperResults.length).toBe(mixedResults.length);
      }),
      { numRuns: 100 },
    );
  });
});
