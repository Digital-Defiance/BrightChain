import {
  ConstantsRegistry,
  createRuntimeConfiguration,
  GuidV4Provider,
} from '@digitaldefiance/ecies-lib';
import { ServiceProvider } from './services/service.provider';

let isInitialized = false;
const BRIGHTCHAIN_CONFIG_KEY = Symbol.for('brightchain.config');

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
    description: 'BrightChain browser-compatible configuration with GuidV4Provider'
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
 * Reset initialization state (for testing)
 */
export function resetInitialization(): void {
  isInitialized = false;
  // Unregister the BrightChain configuration
  ConstantsRegistry.unregister(BRIGHTCHAIN_CONFIG_KEY);
  // Also reset any existing ServiceProvider instances
  try {
    const { ServiceProvider } = require('./services/service.provider');
    ServiceProvider.resetInstance();
  } catch {
    // ServiceProvider might not be loaded yet, which is fine
  }
}