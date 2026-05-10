/**
 * Property-based tests for ProviderConfigValidator.
 *
 * Feature: canary-provider-system
 */
import type { ICanaryProviderConfig } from '@brightchain/digitalburnbag-lib';
import * as fc from 'fast-check';
import { ProviderConfigValidator } from '../../services/provider-config-validator';

// ---------------------------------------------------------------------------
// Helpers / Arbitraries
// ---------------------------------------------------------------------------

const validator = new ProviderConfigValidator();

/** Arbitrary for a non-empty trimmed string (valid field value). */
const arbNonEmptyString = fc
  .string({ minLength: 1 })
  .filter((s) => s.trim().length > 0);

/**
 * ProviderCategory string values.
 * NOTE: The enum is stripped by `export type *` in the lib barrel, so we
 * use the raw string values here.
 */
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

/** Arbitrary for a valid ProviderCategory. */
const arbCategory = fc.constantFrom(...PROVIDER_CATEGORIES);

/** Arbitrary for a valid IResponseMapping. */
const arbResponseMapping = fc.record({
  eventsPath: arbNonEmptyString,
  timestampPath: arbNonEmptyString,
  timestampFormat: fc.constantFrom(
    'iso8601' as const,
    'unix' as const,
    'unix_ms' as const,
  ),
});

/** Arbitrary for a valid auth config. */
const arbAuth = fc.record({
  type: fc.constantFrom(
    'oauth2' as const,
    'api_key' as const,
    'webhook' as const,
    'basic' as const,
    'custom' as const,
  ),
});

/** Arbitrary for a complete, valid ICanaryProviderConfig. */
const arbValidConfig: fc.Arbitrary<ICanaryProviderConfig<string>> = fc
  .record({
    id: arbNonEmptyString,
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

/**
 * The six required "paths" that must be present for a config to be valid.
 * Each entry is a label and a function that removes that field from a valid config.
 */
type ConfigRemover = (
  config: ICanaryProviderConfig<string>,
) => ICanaryProviderConfig<string>;

const requiredFieldRemovers: Array<{ label: string; remove: ConfigRemover }> = [
  {
    label: 'id',
    remove: (c) => {
      const copy = { ...c };
      delete (copy as Record<string, unknown>)['id'];
      return copy as ICanaryProviderConfig<string>;
    },
  },
  {
    label: 'name',
    remove: (c) => {
      const copy = { ...c };
      delete (copy as Record<string, unknown>)['name'];
      return copy as ICanaryProviderConfig<string>;
    },
  },
  {
    label: 'baseUrl',
    remove: (c) => {
      const copy = { ...c };
      delete (copy as Record<string, unknown>)['baseUrl'];
      return copy as ICanaryProviderConfig<string>;
    },
  },
  {
    label: 'auth',
    remove: (c) => {
      const copy = { ...c };
      delete (copy as Record<string, unknown>)['auth'];
      return copy as ICanaryProviderConfig<string>;
    },
  },
  {
    label: 'endpoints.activity',
    remove: (c) => {
      const copy = { ...c, endpoints: { ...c.endpoints } };
      delete (copy.endpoints as Record<string, unknown>)['activity'];
      return copy as ICanaryProviderConfig<string>;
    },
  },
  {
    label: 'endpoints.activity.responseMapping',
    remove: (c) => {
      const copy = {
        ...c,
        endpoints: {
          ...c.endpoints,
          activity: { ...c.endpoints.activity },
        },
      };
      delete (copy.endpoints.activity as Record<string, unknown>)[
        'responseMapping'
      ];
      return copy as ICanaryProviderConfig<string>;
    },
  },
];

// ---------------------------------------------------------------------------
// Property 17: Provider config validation rejects incomplete configs
// Tag: Feature: canary-provider-system, Property 17: Provider config validation rejects incomplete configs
// Validates: Requirements 8.3
// ---------------------------------------------------------------------------

describe('Feature: canary-provider-system, Property 17: Provider config validation rejects incomplete configs', () => {
  it('accepts any config with all required fields present', () => {
    /**
     * **Validates: Requirements 8.3**
     *
     * For any config with all required fields present, validation succeeds.
     */
    fc.assert(
      fc.property(arbValidConfig, (config) => {
        const result = validator.validate(config);
        return result.valid === true && result.errors.length === 0;
      }),
      { numRuns: 100 },
    );
  });

  it('rejects any config missing one or more required fields', () => {
    /**
     * **Validates: Requirements 8.3**
     *
     * For any config missing one or more required fields (id, name, baseUrl,
     * auth, endpoints.activity, endpoints.activity.responseMapping),
     * validation fails.
     */
    fc.assert(
      fc.property(
        arbValidConfig,
        // Pick a non-empty subset of required fields to remove
        fc
          .subarray(requiredFieldRemovers, { minLength: 1 })
          .filter((arr) => arr.length > 0),
        (config, removers) => {
          let broken = config;
          for (const { remove } of removers) {
            broken = remove(broken);
          }
          const result = validator.validate(broken);
          return result.valid === false && result.errors.length > 0;
        },
      ),
      { numRuns: 100 },
    );
  });
});
