import type { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Global service provider accessor.
 * This is set by ServiceLocator and allows blocks to access services
 * without importing ServiceLocator directly, avoiding circular dependencies.
 * 
 * We use `any` here to avoid importing IServiceProvider which would create cycles.
 * The type is enforced at the setter call site.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let globalServiceProvider: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setGlobalServiceProvider<TID extends PlatformID = Uint8Array>(
  provider: any,
): void {
  globalServiceProvider = provider;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getGlobalServiceProvider<TID extends PlatformID = Uint8Array>(): any {
  if (!globalServiceProvider) {
    throw new Error(
      'Service provider not initialized. Call ServiceProvider.getInstance() first.',
    );
  }
  return globalServiceProvider;
}
