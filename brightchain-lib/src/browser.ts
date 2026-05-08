// Minimal browser-compatible exports
// Only exports core functionality that works without Node.js modules

export * from './lib/brightChain';
export * from './lib/enumerations/blockSize';
export * from './lib/factories/blockStoreFactory';
export * from './lib/interfaces/storage/blockStore';
export * from './lib/stores/memoryBlockStore';

// Export constants
export { CONSTANTS, THEME_COLORS, TUPLE, VALIDATION } from './lib/constants';

// Export block classes and utilities
export { BaseBlock } from './lib/blocks/base';
export {
  createBlockHandle,
  isBlockHandle,
  type BlockHandle,
} from './lib/blocks/handle';
export { RandomBlock } from './lib/blocks/random';
export { RawDataBlock } from './lib/blocks/rawData';

// Export ServiceLocator
export { ServiceLocator } from './lib/services/serviceLocator';

// Export utility functions
export { uint8ArrayToHex } from './lib/utils/checksumUtils';

// Export constant-time XOR utilities (browser-compatible)
export {
  XorLengthMismatchError,
  constantTimeXor,
  constantTimeXorMultiple,
} from './lib/utils/constantTimeXor';

// Export ECIES block encryption utility (browser-compatible)
export { BlockECIES } from './lib/access/ecies';

// Export ServiceProvider for advanced usage
export { ServiceProvider } from './lib/services/service.provider';

// Export the proper initialization function
export { initializeBrightChain } from './lib/init';

// Export Checksum type for working with block IDs
export { Checksum } from './lib/types/checksum';

// Export BlockId branded type and helpers
export { asBlockId } from './lib/interfaces/branded/primitives/blockId';
export type { BlockId } from './lib/interfaces/branded/primitives/blockId';

// Export services
export { CBLService } from './lib/services/cblService';
export { ChecksumService } from './lib/services/checksum.service';
export { MessageCBLService } from './lib/services/messaging/messageCBLService';

// Export asset / joule unit conversion helpers (pure math, browser-safe)
export {
  joulesToMicrojoules,
  microjoulesToJoules,
} from './lib/asset/microunits';
export { formatJoule } from './lib/joule/formatJoule';

// Export durability level enum and helpers (browser-safe)
export {
  DefaultDurabilityLevel,
  DurabilityLevel,
  DurabilityMap,
  getParityCountForDurability,
} from './lib/enumerations/durabilityLevel';

// Export messaging enums and interfaces
export { BrightChainStrings } from './lib/enumerations/brightChainStrings';
export { DeliveryStatus } from './lib/enumerations/messaging/deliveryStatus';
export { MessageEncryptionScheme } from './lib/enumerations/messaging/messageEncryptionScheme';
export { MessagePriority } from './lib/enumerations/messaging/messagePriority';
export type { IMessageMetadata } from './lib/interfaces/messaging/messageMetadata';
export type { IMessageCBLOptions } from './lib/services/messaging/messageCBLService';

// Re-export types for convenience
export type { BlockInfo, FileReceipt } from './lib/brightChain';
export type {
  CBLMagnetComponents,
  CBLStorageResult,
  CBLWhiteningOptions,
} from './lib/interfaces/storage/cblWhitening';

// Head registry (browser-compatible in-memory implementation)
export { InMemoryHeadRegistry } from './lib/db/inMemoryHeadRegistry';
export type { IHeadRegistry } from './lib/interfaces/storage/headRegistry';

// Joule resource-credit primitives (browser-safe)
export * from './lib/joule';

// Ledger
export type { ILedgerEntry } from './lib/interfaces/ledger/ledgerEntry';
export type { ILedgerMetadata } from './lib/interfaces/ledger/ledgerMetadata';
export type { ILedgerSignatureVerifier } from './lib/interfaces/ledger/ledgerSignatureVerifier';
export type { ILedgerSigner } from './lib/interfaces/ledger/ledgerSigner';
export type {
  ILedgerValidationError,
  IValidationResult as ILedgerValidationResult,
  LedgerValidationErrorType,
} from './lib/interfaces/ledger/validationResult';
export { BrowserSignatureVerifier } from './lib/ledger/browserSignatureVerifier';
export { EciesSignatureVerifier } from './lib/ledger/eciesSignatureVerifier';
export { Ledger } from './lib/ledger/ledger';
export { LedgerChainValidator } from './lib/ledger/ledgerChainValidator';
export { LedgerEntrySerializer } from './lib/ledger/ledgerEntrySerializer';
export { MemberSignerAdapter } from './lib/ledger/memberSignerAdapter';

// Ledger - Governance
export type { IAuthorizedSigner } from './lib/interfaces/ledger/authorizedSigner';
export { QuorumType } from './lib/interfaces/ledger/brightTrustPolicy';
export type { IBrightTrustPolicy } from './lib/interfaces/ledger/brightTrustPolicy';
export { GovernanceActionType } from './lib/interfaces/ledger/governanceAction';
export type { IGovernanceAction } from './lib/interfaces/ledger/governanceAction';
export type { IGovernancePayload } from './lib/interfaces/ledger/governancePayload';
export { SignerRole } from './lib/interfaces/ledger/signerRole';
export { SignerStatus } from './lib/interfaces/ledger/signerStatus';
export { AuthorizedSignerSet } from './lib/ledger/authorizedSignerSet';
export { GovernancePayloadSerializer } from './lib/ledger/governancePayloadSerializer';
export type { IGenesisPayloadData } from './lib/ledger/governancePayloadSerializer';

// BrightDate formatting utilities (browser-safe)
export { BrightDateDisplayMode } from './lib/enumerations/brightDateDisplayMode';
export {
  formatDateByMode,
  formatDualDate,
  getDateTooltip,
  getBrightDateTooltip,
  nowAsBrightDate,
  toBrightDateCompact,
  toBrightDateLog,
  toBrightDatePrefixed,
  toBrightDateString,
} from './lib/utils/brightDateFormatting';

// BrightDate conversion utilities (browser-safe)
export {
  brightDateNow,
  brightDateToDate,
  brightDateToISO,
  dateToBrightDate,
  isoToBrightDate,
  normalizeToBrightDate,
} from './lib/utils/brightDateConversions';
