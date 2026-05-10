import type { PlatformID } from '@digitaldefiance/ecies-lib';
import type { ICanaryProviderConfig } from '../interfaces/canary-provider/canary-provider-adapter';
import type {
  IProviderConfigValidationResult,
  IProviderConfigValidator,
} from '../interfaces/services/provider-config-validator';

/**
 * The set of required fields for a valid ICanaryProviderConfig.
 * Each entry describes a logical field path and how to check for its presence.
 */
export interface RequiredFieldDescriptor {
  /** Human-readable field path (e.g. 'endpoints.activity.responseMapping') */
  fieldPath: string;
  /** Function that returns true if the field is present and non-empty */
  isPresent: (config: Partial<ICanaryProviderConfig<string>>) => boolean;
}

/**
 * The required fields for provider config validation.
 * Each field produces exactly one error when missing.
 */
export const REQUIRED_PROVIDER_CONFIG_FIELDS: ReadonlyArray<RequiredFieldDescriptor> =
  [
    {
      fieldPath: 'id',
      isPresent: (c) =>
        c.id !== undefined && c.id !== null && String(c.id).trim() !== '',
    },
    {
      fieldPath: 'name',
      isPresent: (c) =>
        c.name !== undefined && c.name !== null && c.name.trim() !== '',
    },
    {
      fieldPath: 'description',
      isPresent: (c) => c.description !== undefined && c.description !== null,
    },
    {
      fieldPath: 'category',
      isPresent: (c) =>
        c.category !== undefined &&
        c.category !== null &&
        String(c.category).trim() !== '',
    },
    {
      fieldPath: 'baseUrl',
      isPresent: (c) => c.baseUrl !== undefined && c.baseUrl !== null,
    },
    {
      fieldPath: 'auth',
      isPresent: (c) =>
        c.auth !== undefined &&
        c.auth !== null &&
        typeof c.auth === 'object' &&
        typeof c.auth.type === 'string' &&
        c.auth.type.trim() !== '',
    },
    {
      fieldPath: 'endpoints.activity',
      isPresent: (c) =>
        c.endpoints !== undefined &&
        c.endpoints !== null &&
        c.endpoints.activity !== undefined &&
        c.endpoints.activity !== null,
    },
    {
      fieldPath: 'endpoints.activity.responseMapping',
      isPresent: (c) =>
        c.endpoints !== undefined &&
        c.endpoints !== null &&
        c.endpoints.activity !== undefined &&
        c.endpoints.activity !== null &&
        c.endpoints.activity.responseMapping !== undefined &&
        c.endpoints.activity.responseMapping !== null,
    },
  ];

/**
 * Validates a provider configuration and returns specific errors for each
 * missing required field.
 *
 * This function guarantees error specificity: for any config with N missing
 * required fields, exactly N errors are returned, one per missing field.
 *
 * Required fields:
 *   - id (non-empty string)
 *   - name (non-empty string)
 *   - description (present)
 *   - category (non-empty string)
 *   - baseUrl (present)
 *   - auth (object with non-empty type)
 *   - endpoints.activity (present)
 *   - endpoints.activity.responseMapping (present)
 *
 * @param config - The provider config to validate (may be partial/incomplete)
 * @returns Validation result with specific errors for each missing field
 */
export function validateProviderConfig(
  config: Partial<ICanaryProviderConfig<string>>,
): IProviderConfigValidationResult {
  if (config == null || typeof config !== 'object') {
    return {
      valid: false,
      errors: REQUIRED_PROVIDER_CONFIG_FIELDS.map(
        (f) => `Missing required field: ${f.fieldPath}`,
      ),
    };
  }

  const errors: string[] = [];

  for (const field of REQUIRED_PROVIDER_CONFIG_FIELDS) {
    if (!field.isPresent(config)) {
      errors.push(`Missing required field: ${field.fieldPath}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Concrete implementation of IProviderConfigValidator that guarantees
 * error specificity: exactly one error per missing required field.
 */
export class ProviderConfigValidatorImpl<TID extends PlatformID = string>
  implements IProviderConfigValidator<TID>
{
  validate(config: ICanaryProviderConfig<TID>): IProviderConfigValidationResult {
    return validateProviderConfig(
      config as unknown as Partial<ICanaryProviderConfig<string>>,
    );
  }
}
