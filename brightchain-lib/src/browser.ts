// Minimal browser-compatible exports
// Only exports core functionality that works without Node.js modules

export * from './lib/brightChain';
export * from './lib/enumerations/blockSize';
export * from './lib/stores/memoryBlockStore';
export * from './lib/factories/blockStoreFactory';
export * from './lib/interfaces/storage/blockStore';

// Export ServiceProvider for advanced usage
export { ServiceProvider } from './lib/services/service.provider';

// Export the proper initialization function
export { initializeBrightChain } from './lib/init';

// Re-export types for convenience
export type { FileReceipt, BlockInfo } from './lib/brightChain';
