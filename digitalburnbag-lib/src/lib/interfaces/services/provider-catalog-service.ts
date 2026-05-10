import { PlatformID } from '@digitaldefiance/ecies-lib';
import type {
  ICanaryProviderConfig,
  ProviderCategory,
} from '../canary-provider/canary-provider-adapter';
import type { IProviderCatalogFilters } from '../canary-provider/expansion-types';

/**
 * Service interface for managing the expanded provider catalog.
 * Provides search, filtering, and category organization for 50+ provider configs.
 */
export interface IProviderCatalogService<TID extends PlatformID = string> {
  /** Get all providers in the catalog, optionally filtered */
  getProviders(filters?: IProviderCatalogFilters): ICanaryProviderConfig<TID>[];

  /** Search providers by name/description */
  searchProviders(query: string): ICanaryProviderConfig<TID>[];

  /** Get providers grouped by category */
  getProvidersByCategory(): Map<ProviderCategory, ICanaryProviderConfig<TID>[]>;

  /** Get a single provider config by ID */
  getProvider(providerId: string): ICanaryProviderConfig<TID> | undefined;

  /** Get provider count per category */
  getCategoryCounts(): Record<ProviderCategory, number>;

  /** Get recommended providers (highest reliability) */
  getRecommendedProviders(): ICanaryProviderConfig<TID>[];
}
