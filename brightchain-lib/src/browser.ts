// Minimal browser-compatible exports
// Only exports core functionality that works without Node.js modules

export * from './lib/brightChain';
export * from './lib/enumerations/blockSize';
export * from './lib/factories/blockStoreFactory';
export * from './lib/interfaces/storage/blockStore';
export * from './lib/stores/memoryBlockStore';

// Export block classes and utilities
export { BaseBlock } from './lib/blocks/base';
export {
  createBlockHandle,
  isBlockHandle,
  type BlockHandle,
} from './lib/blocks/handle';
export { RawDataBlock } from './lib/blocks/rawData';

// Export ServiceProvider for advanced usage
export { ServiceProvider } from './lib/services/service.provider';

// Export the proper initialization function
export { initializeBrightChain } from './lib/init';

// Export Checksum type for working with block IDs
export { Checksum } from './lib/types/checksum';

// Export services
export { CBLService } from './lib/services/cblService';
export { ChecksumService } from './lib/services/checksum.service';
export { JsonCBLCapacityCalculator } from './lib/services/jsonCblCapacity.service';
export { MessageCBLService } from './lib/services/messaging/messageCBLService';
export { SuperCBLService, parseCBLData } from './lib/services/superCbl.service';

// Export messaging enums and interfaces
export { MessageDeliveryStatus } from './lib/enumerations/messaging/messageDeliveryStatus';
export { MessageEncryptionScheme } from './lib/enumerations/messaging/messageEncryptionScheme';
export { MessagePriority } from './lib/enumerations/messaging/messagePriority';
export type { IMessageMetadata } from './lib/interfaces/messaging/messageMetadata';
export type { IMessageCBLOptions } from './lib/services/messaging/messageCBLService';

// Re-export types for convenience
export type { BlockInfo, FileReceipt } from './lib/brightChain';
export { SuperCBLError, SuperCBLErrorType } from './lib/errors/superCbl';
export type {
  CBLMagnetComponents,
  CBLStorageResult,
  CBLWhiteningOptions,
} from './lib/interfaces/storage/cblWhitening';
export type {
  CBLData,
  CBLType,
  CBLv1,
  RegularCBLv2,
  SubCBL,
  SuperCBL,
  SuperCBLConfig,
  SuperCBLCreationResult,
} from './lib/interfaces/storage/superCbl';
