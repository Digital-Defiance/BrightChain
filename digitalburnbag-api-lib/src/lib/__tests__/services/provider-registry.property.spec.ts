/**
 * Property-based tests for CanaryProviderRegistry.
 *
 * Feature: canary-provider-system
 */
import type { ICanaryProviderConfig } from '@brightchain/digitalburnbag-lib';
import * as fc from 'fast-check';
import { ProviderConfigValidator } from '../../services/provider-config-validator';
import { CanaryProviderRegistry } from '../../services/provider-registry';

// ---------------------------------------------------------------------------
// Helpers / Arbitraries
// ---------------------------------------------------------------------------

const validator = new ProviderConfigValidator();

const PROVIDER_CATEGORIES = [
  'social_media',
  'health_fitness',
  'developer',
  'communication',
  'financial',
  'iot_smart_home',
  'gaming',
  'email',
  'productivity',
  'custom_webhook',
  'platform_native',
  'other',
] as const;

const arbNonEmptyString = fc
  .string({ minLength: 1 })
  .filter((s) => s.trim().length > 0);

const arbCategory = fc.constantFrom(...PROVIDER_CATEGORIES);

const arbResponseMapping = fc.record({
  eventsPath: arbNonEmptyString,
  timestampPath: arbNonEmptyString,
  timestampFormat: fc.constantFrom(
    'iso8601' as const,
    'unix' as const,
    'unix_ms' as const,
  ),
});

const arbAuth = fc.record({
  type: fc.constantFrom(
    'oauth2' as const,
    'api_key' as const,
    'webhook' as const,
    'basic' as const,
    'custom' as const,
  ),
});

/** Arbitrary for a complete, valid ICanaryProviderConfig with unique IDs. */
const arbValidConfig: fc.Arbitrary<ICanaryProviderConfig<string>> = fc
  .record({
    id: fc.uuid(),
    name: arbNonEmptyString,
    description: fc.string(),
    category: arbCategory,
    baseUrl: arbNonEmptyString,
    auth: arbAuth,
    responseMapping: arbResponseMapping,
    defaultLookbackMs: fc.integer({ min: 1000, max: 86400000 }),
    minCheckIntervalMs: fc.integer({ min: 1000, max: 3600000 }),
    supportsWebhooks: fc.boolean(),
    enabledByDefault: fc.boolean(),
  })
  .map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    category: r.category,
    baseUrl: r.baseUrl,
    auth: r.auth,
    defaultLookbackMs: r.defaultLookbackMs,
    minCheckIntervalMs: r.minCheckIntervalMs,
    supportsWebhooks: r.supportsWebhooks,
    enabledByDefault: r.enabledByDefault,
    endpoints: {
      activity: {
        path: '/activity',
        method: 'GET' as const,
        responseMapping: r.responseMapping,
      },
    },
  }));

// ---------------------------------------------------------------------------
// Property 16: Provider registry registration and retrieval
// Tag: Feature: canary-provider-system, Property 16
// Validates: Requirements 8.1, 8.2
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 16: Provider registry registration and retrieval', () => {
  it('after registration, provider is retrievable by ID and config equals registered config', () => {
    /**
     * **Validates: Requirements 8.1, 8.2**
     *
     * For any valid config, after registration the provider is retrievable
     * by ID and the retrieved config equals the registered config.
     */
    fc.assert(
      fc.property(arbValidConfig, (config) => {
        const registry = new CanaryProviderRegistry<string>([], validator);
        registry.registerCustomProvider(config);

        const adapter = registry.getProvider(config.id);
        if (!adapter) return false;

        const retrieved = adapter.getConfig();
        return (
          retrieved.id === config.id &&
          retrieved.name === config.name &&
          retrieved.baseUrl === config.baseUrl &&
          retrieved.category === config.category
        );
      }),
      { numRuns: 100 },
    );
  });

  it('built-in configs are retrievable after initialization', () => {
    /**
     * **Validates: Requirements 8.1**
     *
     * For any set of valid configs passed as builtins, all are retrievable.
     */
    fc.assert(
      fc.property(
        fc
          .array(arbValidConfig, { minLength: 1, maxLength: 10 })
          .map((configs) => {
            // Ensure unique IDs
            const seen = new Set<string>();
            return configs.filter((c) => {
              if (seen.has(c.id)) return false;
              seen.add(c.id);
              return true;
            });
          })
          .filter((arr) => arr.length > 0),
        (configs) => {
          const registry = new CanaryProviderRegistry<string>(
            configs,
            validator,
          );

          for (const config of configs) {
            const adapter = registry.getProvider(config.id);
            if (!adapter) return false;
            if (adapter.getConfig().id !== config.id) return false;
          }

          return registry.getProviderConfigs().length === configs.length;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 18: Provider config export/import round-trip
// Tag: Feature: canary-provider-system, Property 18
// Validates: Requirements 8.4, 8.5
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 18: Provider config export/import round-trip', () => {
  it('export to JSON then import produces equivalent config', () => {
    /**
     * **Validates: Requirements 8.4, 8.5**
     *
     * For any valid registered config, export to JSON then import from
     * that JSON produces an equivalent config.
     */
    fc.assert(
      fc.property(arbValidConfig, (config) => {
        const registry = new CanaryProviderRegistry<string>([], validator);
        registry.registerCustomProvider(config);

        // Export
        const exported = registry.exportProviderConfig(config.id);
        if (!exported) return false;

        // Serialize to JSON and back (simulates real export/import)
        const json = JSON.stringify(exported);
        const parsed = JSON.parse(json) as ICanaryProviderConfig<string>;

        // Import into a fresh registry
        const registry2 = new CanaryProviderRegistry<string>([], validator);
        registry2.importProviderConfig(parsed);

        const reimported = registry2.getProvider(config.id);
        if (!reimported) return false;

        const reimportedConfig = reimported.getConfig();
        return (
          reimportedConfig.id === config.id &&
          reimportedConfig.name === config.name &&
          reimportedConfig.baseUrl === config.baseUrl &&
          reimportedConfig.category === config.category &&
          reimportedConfig.endpoints.activity.path ===
            config.endpoints.activity.path &&
          reimportedConfig.endpoints.activity.responseMapping.eventsPath ===
            config.endpoints.activity.responseMapping.eventsPath
        );
      }),
      { numRuns: 100 },
    );
  });
});
