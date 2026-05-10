import type {
  ICanaryProviderConfig,
  IProviderConfigValidationResult,
  IProviderConfigValidator,
} from '@brightchain/digitalburnbag-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Required top-level fields for a valid ICanaryProviderConfig.
 */
const REQUIRED_TOP_LEVEL_FIELDS: ReadonlyArray<keyof ICanaryProviderConfig> = [
  'id',
  'name',
  'baseUrl',
  'auth',
];

/**
 * Concrete implementation of IProviderConfigValidator.
 *
 * Validates that a provider configuration contains all required fields
 * before it is accepted into the Provider Registry.
 *
 * Required fields (per Requirement 8.3):
 *   - id
 *   - name
 *   - baseUrl
 *   - auth
 *   - endpoints.activity
 *   - endpoints.activity.responseMapping
 */
export class ProviderConfigValidator<TID extends PlatformID = string>
  implements IProviderConfigValidator<TID>
{
  validate(
    config: ICanaryProviderConfig<TID>,
  ): IProviderConfigValidationResult {
    const errors: string[] = [];

    if (config == null || typeof config !== 'object') {
      return { valid: false, errors: ['Config must be a non-null object'] };
    }

    // Validate required top-level fields
    for (const field of REQUIRED_TOP_LEVEL_FIELDS) {
      const value = config[field];
      if (value === undefined || value === null) {
        errors.push(`Missing required field: ${String(field)}`);
      } else if (typeof value === 'string' && value.trim() === '') {
        errors.push(`Field "${String(field)}" must not be empty`);
      }
    }

    // Validate endpoints.activity
    if (config.endpoints === undefined || config.endpoints === null) {
      errors.push('Missing required field: endpoints.activity');
      errors.push('Missing required field: endpoints.activity.responseMapping');
    } else if (
      config.endpoints.activity === undefined ||
      config.endpoints.activity === null
    ) {
      errors.push('Missing required field: endpoints.activity');
      errors.push('Missing required field: endpoints.activity.responseMapping');
    } else {
      // endpoints.activity exists — check responseMapping
      if (
        config.endpoints.activity.responseMapping === undefined ||
        config.endpoints.activity.responseMapping === null
      ) {
        errors.push(
          'Missing required field: endpoints.activity.responseMapping',
        );
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
