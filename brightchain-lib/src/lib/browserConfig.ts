import {
  createRuntimeConfiguration,
  ECIES,
  ECIESService,
  GuidV4Provider,
  PlatformID,
} from '@digitaldefiance/ecies-lib';
import { BrightChainStrings } from './enumerations/brightChainStrings';
import { TranslatableBrightChainError } from './errors/translatableBrightChainError';

/**
 * Get browser-compatible runtime configuration with GuidV4Provider
 * This is the browser equivalent of getNodeRuntimeConfiguration() from node-ecies-lib
 */
export function getBrowserRuntimeConfiguration() {
  return createRuntimeConfiguration({
    idProvider: new GuidV4Provider(),
  });
}

/**
 * Create ECIESService with GuidV4Provider configuration for browser compatibility
 */
export function createECIESService<
  TID extends PlatformID = Uint8Array,
>(): ECIESService<TID> {
  const config = getBrowserRuntimeConfiguration();
  return new ECIESService<TID>(config);
}

/**
 * Calculate overhead for single recipient encryption using ecies-lib constants.
 *
 * Formula: idSize + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE
 *        = idSize + 72
 *
 * BrightChain uses WITH_LENGTH format for single-recipient encryption because:
 * 1. The data length field enables streaming decryption
 * 2. It's only 8 bytes more than BASIC
 * 3. Block sizes are known, making length verification valuable
 *
 * @param idSize - Size of recipient ID in bytes (default 16 for GUID)
 * @returns Total overhead in bytes
 *
 * @see Requirements 2.3
 */
export function calculateSingleRecipientOverhead(idSize: number = 16): number {
  // BrightChain prepends recipient ID for routing
  return idSize + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
}

/**
 * Calculate overhead for multiple recipient encryption using ecies-lib constants.
 *
 * Formula: FIXED_OVERHEAD_SIZE + DATA_LENGTH_SIZE + RECIPIENT_COUNT_SIZE + (recipientCount * (idSize + ENCRYPTED_KEY_SIZE))
 *        = 64 + 8 + 2 + (recipientCount * (idSize + 60))
 *        = 74 + (recipientCount * (idSize + 60))
 *
 * @param recipientCount - Number of recipients
 * @param includeMessageOverhead - Whether to include the fixed message overhead (default true)
 * @param idSize - Size of recipient ID in bytes (default ECIES.MULTIPLE.RECIPIENT_ID_SIZE = 12)
 * @returns Total overhead in bytes
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4
 */
export function calculateECIESMultipleRecipientOverhead(
  recipientCount: number,
  includeMessageOverhead: boolean = true,
  idSize: number = ECIES.MULTIPLE.RECIPIENT_ID_SIZE,
): number {
  // Per-recipient overhead: ID size + encrypted key size (IV + AuthTag + SymKey = 12 + 16 + 32 = 60)
  const perRecipientOverhead = idSize + ECIES.MULTIPLE.ENCRYPTED_KEY_SIZE;
  let overhead = recipientCount * perRecipientOverhead;

  if (includeMessageOverhead) {
    // Fixed overhead includes:
    // - FIXED_OVERHEAD_SIZE (64): version + cipher suite + type + public key + IV + auth tag
    // - DATA_LENGTH_SIZE (8): data length field
    // - RECIPIENT_COUNT_SIZE (2): recipient count field
    overhead +=
      ECIES.MULTIPLE.FIXED_OVERHEAD_SIZE +
      ECIES.MULTIPLE.DATA_LENGTH_SIZE +
      ECIES.MULTIPLE.RECIPIENT_COUNT_SIZE;
  }
  return overhead;
}

/**
 * Backported from node-ecies-lib: Parse multi-encrypted header
 */
export function parseMultiEncryptedHeader(_data: Uint8Array): unknown {
  // Simplified implementation - would need full backport for production
  throw new TranslatableBrightChainError(
    BrightChainStrings.Error_BrowserConfig_NotImplementedTemplate,
    { FUNCTION_NAME: 'parseMultiEncryptedHeader' },
  );
}

/**
 * Backported from node-ecies-lib: Build multi-recipient header
 */
export function buildECIESMultipleRecipientHeader(_data: unknown): Uint8Array {
  // Simplified implementation - would need full backport for production
  throw new TranslatableBrightChainError(
    BrightChainStrings.Error_BrowserConfig_NotImplementedTemplate,
    { FUNCTION_NAME: 'buildECIESMultipleRecipientHeader' },
  );
}

/**
 * Backported from node-ecies-lib: Decrypt multiple ECIE for recipient
 */
export function decryptMultipleECIEForRecipient(
  _encryptedData: unknown,
  _recipient: unknown,
): Uint8Array {
  // Simplified implementation - would need full backport for production
  throw new TranslatableBrightChainError(
    BrightChainStrings.Error_BrowserConfig_NotImplementedTemplate,
    { FUNCTION_NAME: 'decryptMultipleECIEForRecipient' },
  );
}
