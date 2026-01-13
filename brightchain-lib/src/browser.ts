// Minimal browser-compatible exports
// Only exports core functionality that works without Node.js modules

export * from './lib/brightChain';
export * from './lib/enumerations/blockSize';
export * from './lib/stores/memoryBlockStore';
export * from './lib/factories/blockStoreFactory';
export * from './lib/interfaces/storage/blockStore';

// Simple browser initialization
export function initializeBrightChain(): void {
  console.log('BrightChain browser mode initialized');
}

// Re-export types for convenience
export type { FileReceipt, BlockInfo } from './lib/brightChain';
