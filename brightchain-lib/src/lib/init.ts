import {
  ConstantsRegistry,
  createRuntimeConfiguration,
  getEnhancedIdProvider,
  GuidV4Provider,
  PlatformID,
  TypedIdProviderWrapper,
} from '@digitaldefiance/ecies-lib';
import { BRIGHTCHAIN_CONFIG_KEY } from './config/constants';
import { ServiceProvider } from './services/service.provider';

let isInitialized = false;

/**
 * Initialize the BrightChain library with browser-compatible configuration
 * This must be called before using any other library functions
 */
export function initializeBrightChain(): void {
  if (isInitialized) {
    return;
  }

  // Set up browser-compatible runtime configuration with GuidV4Provider
  const config = createRuntimeConfiguration({
    idProvider: new GuidV4Provider(),
  });

  // Register this configuration with a specific key
  ConstantsRegistry.register(BRIGHTCHAIN_CONFIG_KEY, config, {
    description:
      'BrightChain browser-compatible configuration with GuidV4Provider',
  });

  // Initialize ServiceProvider (this will register itself with ServiceLocator)
  ServiceProvider.getInstance();

  isInitialized = true;
}

/**
 * Get the BrightChain configuration key
 */
export function getBrightChainConfigKey() {
  return BRIGHTCHAIN_CONFIG_KEY;
}

/**
 * Check if the library has been initialized
 */
export function isLibraryInitialized(): boolean {
  return isInitialized;
}

/**
 * Get the BrightChain ID provider with the correct configuration.
 * This ensures all code uses the GuidV4Provider (16 bytes) instead of the default ObjectIdProvider (12 bytes).
 *
 * @param autoInit - If true, automatically initialize BrightChain if not already initialized (default: true)
 * @returns The ID provider configured for BrightChain (GuidV4Provider with 16-byte IDs)
 * @throws Error if the library has not been initialized and autoInit is false
 */
export function getBrightChainIdProvider<TID extends PlatformID = Uint8Array>(
  autoInit = true,
): TypedIdProviderWrapper<TID> {
  if (!isInitialized) {
    if (autoInit) {
      initializeBrightChain();
    } else {
      throw new Error(
        'BrightChain library not initialized. Call initializeBrightChain() first.',
      );
    }
  }
  return getEnhancedIdProvider<TID>(BRIGHTCHAIN_CONFIG_KEY);
}

/**
 * Reset initialization state (for testing)
 */
export function resetInitialization(): void {
  isInitialized = false;
  // Unregister the BrightChain configuration
  ConstantsRegistry.unregister(BRIGHTCHAIN_CONFIG_KEY);
  // Also reset any existing ServiceProvider instances
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ServiceProvider } = require('./services/service.provider');
    ServiceProvider.resetInstance();
  } catch {
    // ServiceProvider might not be loaded yet, which is fine
  }
}
