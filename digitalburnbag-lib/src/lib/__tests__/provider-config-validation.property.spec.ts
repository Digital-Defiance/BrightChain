/**
 * Property test: Provider config schema validation completeness.
 *
 * **Property 16: Provider config schema validation completeness**
 * **Validates: Requirements 15.1, 15.3, 15.4, 15.5, 15.7**
 *
 * For any config in BUILTIN_PROVIDER_CONFIGS, validation SHALL pass with all
 * required fields present: id, name, description, category, baseUrl, auth,
 * endpoints.activity (with responseMapping), endpoints.healthCheck.
 */

import fc from 'fast-check';
import {
  BUILTIN_PROVIDER_CONFIGS,
} from '../providers/builtin-provider-configs';
import {
  ProviderCategory,
} from '../interfaces/canary-provider/canary-provider-adapter';

// ── Helpers ─────────────────────────────────────────────────────────

const validProviderCategories = Object.values(ProviderCategory);

/**
 * Providers that are platform-native and may not have a healthCheck endpoint.
 * The task spec notes healthCheck is "optional for some providers".
 */
const PROVIDERS_WITHOUT_HEALTH_CHECK = new Set(['birdbag']);

// ── Property Test ───────────────────────────────────────────────────

describe('Property 16: Provider config schema validation completeness', () => {
  it('for any config in BUILTIN_PROVIDER_CONFIGS, all required fields are present and valid', () => {
    // Ensure we have configs to test
    expect(BUILTIN_PROVIDER_CONFIGS.length).toBeGreaterThan(0);

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: BUILTIN_PROVIDER_CONFIGS.length - 1 }),
        (index) => {
          const config = BUILTIN_PROVIDER_CONFIGS[index];

          // id: non-empty string
          expect(typeof config.id).toBe('string');
          expect(config.id.length).toBeGreaterThan(0);

          // name: non-empty string
          expect(typeof config.name).toBe('string');
          expect(config.name.length).toBeGreaterThan(0);

          // description: non-empty string
          expect(typeof config.description).toBe('string');
          expect(config.description.length).toBeGreaterThan(0);

          // category: valid ProviderCategory value
          expect(validProviderCategories).toContain(config.category);

          // baseUrl: string (can be empty for platform-native providers)
          expect(typeof config.baseUrl).toBe('string');

          // auth: has a type field
          expect(config.auth).toBeDefined();
          expect(typeof config.auth.type).toBe('string');
          expect(config.auth.type.length).toBeGreaterThan(0);

          // endpoints.activity: has path, method, responseMapping
          expect(config.endpoints).toBeDefined();
          expect(config.endpoints.activity).toBeDefined();
          expect(typeof config.endpoints.activity.path).toBe('string');
          expect(config.endpoints.activity.path.length).toBeGreaterThan(0);
          expect(['GET', 'POST']).toContain(config.endpoints.activity.method);

          // endpoints.activity.responseMapping: has eventsPath, timestampPath, timestampFormat
          const mapping = config.endpoints.activity.responseMapping;
          expect(mapping).toBeDefined();
          expect(typeof mapping.eventsPath).toBe('string');
          expect(mapping.eventsPath.length).toBeGreaterThan(0);
          expect(typeof mapping.timestampPath).toBe('string');
          expect(mapping.timestampPath.length).toBeGreaterThan(0);
          expect(typeof mapping.timestampFormat).toBe('string');
          expect(mapping.timestampFormat.length).toBeGreaterThan(0);

          // endpoints.healthCheck: has path, method, expectedStatus (optional for some providers)
          if (!PROVIDERS_WITHOUT_HEALTH_CHECK.has(config.id as string)) {
            expect(config.endpoints.healthCheck).toBeDefined();
            expect(typeof config.endpoints.healthCheck!.path).toBe('string');
            expect(config.endpoints.healthCheck!.path.length).toBeGreaterThan(0);
            expect(['GET', 'POST']).toContain(config.endpoints.healthCheck!.method);
            expect(typeof config.endpoints.healthCheck!.expectedStatus).toBe('number');
            expect(config.endpoints.healthCheck!.expectedStatus).toBeGreaterThanOrEqual(100);
            expect(config.endpoints.healthCheck!.expectedStatus).toBeLessThan(600);
          }
        },
      ),
      { numRuns: BUILTIN_PROVIDER_CONFIGS.length * 3 },
    );
  });
});

// ── Exhaustive (non-property-based) Validation ──────────────────────

describe('Exhaustive provider config validation', () => {
  it('all configs in BUILTIN_PROVIDER_CONFIGS have unique IDs', () => {
    const ids = BUILTIN_PROVIDER_CONFIGS.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it.each(
    BUILTIN_PROVIDER_CONFIGS.map((config) => [config.id, config] as const),
  )('config "%s" has all required fields present and valid', (_id, config) => {
    // id: non-empty string
    expect(typeof config.id).toBe('string');
    expect((config.id as string).length).toBeGreaterThan(0);

    // name: non-empty string
    expect(typeof config.name).toBe('string');
    expect(config.name.length).toBeGreaterThan(0);

    // description: non-empty string
    expect(typeof config.description).toBe('string');
    expect(config.description.length).toBeGreaterThan(0);

    // category: valid ProviderCategory value
    expect(validProviderCategories).toContain(config.category);

    // baseUrl: string (can be empty for platform-native)
    expect(typeof config.baseUrl).toBe('string');

    // auth: has a type field with valid value
    expect(config.auth).toBeDefined();
    expect(typeof config.auth.type).toBe('string');
    expect(['oauth2', 'api_key', 'webhook', 'basic', 'custom']).toContain(
      config.auth.type,
    );

    // endpoints.activity exists with path, method, responseMapping
    expect(config.endpoints).toBeDefined();
    expect(config.endpoints.activity).toBeDefined();
    expect(typeof config.endpoints.activity.path).toBe('string');
    expect(config.endpoints.activity.path.length).toBeGreaterThan(0);
    expect(['GET', 'POST']).toContain(config.endpoints.activity.method);

    // responseMapping has eventsPath, timestampPath, timestampFormat
    const mapping = config.endpoints.activity.responseMapping;
    expect(mapping).toBeDefined();
    expect(typeof mapping.eventsPath).toBe('string');
    expect(mapping.eventsPath.length).toBeGreaterThan(0);
    expect(typeof mapping.timestampPath).toBe('string');
    expect(mapping.timestampPath.length).toBeGreaterThan(0);
    expect(typeof mapping.timestampFormat).toBe('string');
    expect(mapping.timestampFormat.length).toBeGreaterThan(0);

    // healthCheck (optional for platform-native providers without external API)
    if (!PROVIDERS_WITHOUT_HEALTH_CHECK.has(config.id as string)) {
      expect(config.endpoints.healthCheck).toBeDefined();
      expect(typeof config.endpoints.healthCheck!.path).toBe('string');
      expect(config.endpoints.healthCheck!.path.length).toBeGreaterThan(0);
      expect(['GET', 'POST']).toContain(config.endpoints.healthCheck!.method);
      expect(typeof config.endpoints.healthCheck!.expectedStatus).toBe('number');
    }
  });

  it('catalog contains at least 50 providers', () => {
    expect(BUILTIN_PROVIDER_CONFIGS.length).toBeGreaterThanOrEqual(50);
  });

  it('all provider categories in the catalog are valid ProviderCategory values', () => {
    for (const config of BUILTIN_PROVIDER_CONFIGS) {
      expect(validProviderCategories).toContain(config.category);
    }
  });
});
