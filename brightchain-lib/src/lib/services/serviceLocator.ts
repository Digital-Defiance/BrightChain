import { IServiceProvider } from '../interfaces/serviceProvider.interface';

/**
 * ServiceLocator provides a way to access services without direct imports
 * This helps break circular dependencies
 */
export class ServiceLocator {
  private static serviceProvider: IServiceProvider | undefined;

  /**
   * Set the service provider implementation
   * @param provider The service provider implementation
   */
  public static setServiceProvider(provider: IServiceProvider): void {
    ServiceLocator.serviceProvider = provider;
  }

  /**
   * Get the service provider
   * @returns The service provider
   * @throws Error if the service provider is not set
   */
  public static getServiceProvider(): IServiceProvider {
    if (!ServiceLocator.serviceProvider) {
      throw new Error(
        'ServiceProvider not set. Call setServiceProvider first.',
      );
    }
    return ServiceLocator.serviceProvider;
  }

  /**
   * Reset the service provider (useful for testing)
   */
  public static reset(): void {
    ServiceLocator.serviceProvider = undefined;
  }
}
