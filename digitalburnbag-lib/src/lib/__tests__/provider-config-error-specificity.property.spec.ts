/**
 * Property test: Provider config validation error specificity.
 *
 * **Property 17: Provider config validation error specificity**
 * **Validates: Requirements 15.2, 15.6**
 *
 * For any config with one or more missing required fields, validation SHALL
 * include a specific error for each missing field; error count SHALL equal
 * missing field count.
 */

import * as fc from 'fast-check';
import {
  BUILTIN_PROVIDER_CONFIGS,
} from '../providers/builtin-provider-configs';
import {
  validateProviderConfig,
  REQUIRED_PROVIDER_CONFIG_FIELDS,
} from '../providers/provider-config-validator';
import type { ICanaryProviderConfig } from '../interfaces/canary-provider/canary-provider-adapter';

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Each remover removes a single logical field from a config.
 * The label matches the fieldPath in REQUIRED_PROVIDER_CONFIG_FIELDS.
 */
type ConfigRemover = {
  label: string;
  remove: (config: ICanaryProviderConfig<string>) => Partial<ICanaryProviderConfig<string>>;
};

const fieldRemovers: ConfigRemover[] = [
  {
    label: 'id',
    remove: (c) => {
      const copy = { ...c };
      delete (copy as Record<string, unknown>)['id'];
      return copy;
    },
  },
  {
    label: 'name',
    remove: (c) => {
      const copy = { ...c };
      delete (copy as Record<string, unknown>)['name'];
      return copy;
    },
  },
  {
    label: 'description',
    remove: (c) => {
      const copy = { ...c };
      delete (copy as Record<string, unknown>)['description'];
      return copy;
    },
  },
  {
    label: 'category',
    remove: (c) => {
      const copy = { ...c };
      delete (copy as Record<string, unknown>)['category'];
      return copy;
    },
  },
  {
    label: 'baseUrl',
    remove: (c) => {
      const copy = { ...c };
      delete (copy as Record<string, unknown>)['baseUrl'];
      return copy;
    },
  },
  {
    label: 'auth',
    remove: (c) => {
      const copy = { ...c };
      delete (copy as Record<string, unknown>)['auth'];
      return copy;
    },
  },
  {
    label: 'endpoints.activity',
    remove: (c) => {
      const copy = { ...c, endpoints: { ...c.endpoints } };
      delete (copy.endpoints as Record<string, unknown>)['activity'];
      return copy;
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
      return copy;
    },
  },
];

/**
 * Given a partial config, count how many required fields are actually missing
 * by checking each field descriptor's `isPresent` function.
 */
function countActualMissingFields(
  config: Partial<ICanaryProviderConfig<string>>,
): number {
  return REQUIRED_PROVIDER_CONFIG_FIELDS.filter(
    (field) => !field.isPresent(config),
  ).length;
}

/**
 * Given a partial config, get the field paths of all actually missing fields.
 */
function getActualMissingFieldPaths(
  config: Partial<ICanaryProviderConfig<string>>,
): string[] {
  return REQUIRED_PROVIDER_CONFIG_FIELDS
    .filter((field) => !field.isPresent(config))
    .map((field) => field.fieldPath);
}

// ── Property Tests ──────────────────────────────────────────────────

describe('Property 17: Provider config validation error specificity', () => {
  // Ensure we have configs to use as base
  expect(BUILTIN_PROVIDER_CONFIGS.length).toBeGreaterThan(0);

  it('error count equals the number of missing required fields for any subset removal', () => {
    /**
     * **Validates: Requirements 15.2, 15.6**
     *
     * For any config from BUILTIN_PROVIDER_CONFIGS and any non-empty subset
     * of required fields removed, the validation error count SHALL equal
     * the number of fields that are actually missing from the config.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: BUILTIN_PROVIDER_CONFIGS.length - 1 }),
        fc
          .subarray(fieldRemovers, { minLength: 1 })
          .filter((arr) => arr.length > 0),
        (configIndex, removers) => {
          const baseConfig = BUILTIN_PROVIDER_CONFIGS[configIndex];

          // Apply all removers to create a broken config
          let brokenConfig: Partial<ICanaryProviderConfig<string>> =
            baseConfig as ICanaryProviderConfig<string>;
          for (const { remove } of removers) {
            brokenConfig = remove(
              brokenConfig as ICanaryProviderConfig<string>,
            );
          }

          // Validate the broken config
          const result = validateProviderConfig(brokenConfig);

          // Count how many fields are actually missing
          const actualMissingCount = countActualMissingFields(brokenConfig);

          // Property: error count equals missing field count
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBe(actualMissingCount);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('each missing field has a corresponding specific error message', () => {
    /**
     * **Validates: Requirements 15.2, 15.6**
     *
     * For any config with missing required fields, each missing field SHALL
     * have a corresponding error message that references that field by name.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: BUILTIN_PROVIDER_CONFIGS.length - 1 }),
        fc
          .subarray(fieldRemovers, { minLength: 1 })
          .filter((arr) => arr.length > 0),
        (configIndex, removers) => {
          const baseConfig = BUILTIN_PROVIDER_CONFIGS[configIndex];

          // Apply all removers
          let brokenConfig: Partial<ICanaryProviderConfig<string>> =
            baseConfig as ICanaryProviderConfig<string>;
          for (const { remove } of removers) {
            brokenConfig = remove(
              brokenConfig as ICanaryProviderConfig<string>,
            );
          }

          // Validate
          const result = validateProviderConfig(brokenConfig);

          // Get the actually missing field paths
          const missingFieldPaths = getActualMissingFieldPaths(brokenConfig);

          // Property: each missing field has a corresponding error
          for (const fieldPath of missingFieldPaths) {
            const hasCorrespondingError = result.errors.some((error) =>
              error.includes(fieldPath),
            );
            expect(hasCorrespondingError).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('valid configs produce zero errors', () => {
    /**
     * **Validates: Requirements 15.2, 15.6**
     *
     * Sanity check: all BUILTIN_PROVIDER_CONFIGS pass validation with no errors.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: BUILTIN_PROVIDER_CONFIGS.length - 1 }),
        (configIndex) => {
          const config = BUILTIN_PROVIDER_CONFIGS[configIndex];
          const result = validateProviderConfig(
            config as unknown as Partial<ICanaryProviderConfig<string>>,
          );
          expect(result.valid).toBe(true);
          expect(result.errors.length).toBe(0);
        },
      ),
      { numRuns: BUILTIN_PROVIDER_CONFIGS.length },
    );
  });
});
