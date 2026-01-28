import type { PlatformID } from '@digitaldefiance/ecies-lib';
import { BrightChainStrings } from '../enumerations';
import { TranslatableBrightChainError } from '../errors/translatableBrightChainError';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Global service provider accessor.
 * This is set by ServiceLocator and allows blocks to access services
 * without importing ServiceLocator directly, avoiding circular dependencies.
 *
 * We use `any` here to avoid importing IServiceProvider which would create cycles.
 * The type is enforced at the setter call site.
 */
let globalServiceProvider: any = null;

export function setGlobalServiceProvider<TID extends PlatformID = Uint8Array>(
  provider: any,
): void {
  globalServiceProvider = provider;
}

export function getGlobalServiceProvider<
  TID extends PlatformID = Uint8Array,
>(): any {
  if (!globalServiceProvider) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.GlobalServiceProvider_NotInitialized,
    );
  }
  return globalServiceProvider;
}
