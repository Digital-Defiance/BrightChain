import { PlatformID } from '@digitaldefiance/ecies-lib';
import { BrightChainStrings } from '../enumerations';
import { TranslatableBrightChainError } from '../errors/translatableBrightChainError';
import { IServiceProvider } from '../interfaces/serviceProvider.interface';
import { setGlobalServiceProvider } from './globalServiceProvider';

/**
 * ServiceLocator provides a way to access services without direct imports
 * This helps break circular dependencies
 */
export class ServiceLocator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static serviceProvider: IServiceProvider<any> | undefined;

  /**
   * Set the service provider implementation
   * @param provider The service provider implementation
   */
  public static setServiceProvider<TID extends PlatformID = Uint8Array>(
    provider: IServiceProvider<TID>,
  ): void {
    ServiceLocator.serviceProvider = provider;
    setGlobalServiceProvider(provider);
  }

  /**
   * Get the service provider
   * @returns The service provider
   * @throws TranslatableBrightChainError if the service provider is not set
   */
  public static getServiceProvider<
    TID extends PlatformID = Uint8Array,
  >(): IServiceProvider<TID> {
    if (!ServiceLocator.serviceProvider) {
      throw new TranslatableBrightChainError(
        BrightChainStrings.Error_ServiceLocator_NotSet,
      );
    }
    return ServiceLocator.serviceProvider as IServiceProvider<TID>;
  }

  /**
   * Reset the service provider (useful for testing)
   */
  public static reset(): void {
    ServiceLocator.serviceProvider = undefined;
  }
}
