import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { ICanaryProviderConfig } from '../canary-provider/canary-provider-adapter';

/**
 * Result of validating a provider configuration.
 */
export interface IProviderConfigValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  /** List of validation error messages */
  errors: string[];
}

/**
 * Service interface for validating custom provider configurations
 * before registration.
 */
export interface IProviderConfigValidator<TID extends PlatformID = string> {
  /** Validate that a provider config has all required fields */
  validate(config: ICanaryProviderConfig<TID>): IProviderConfigValidationResult;
}
