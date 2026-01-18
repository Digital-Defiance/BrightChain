import {
  createRuntimeConfiguration,
  ECIESService,
  GuidV4Provider,
  PlatformID,
} from '@digitaldefiance/ecies-lib';

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
 * Backported from node-ecies-lib: Calculate overhead for multiple recipient encryption
 */
export function calculateECIESMultipleRecipientOverhead(
  recipientCount: number,
  includeMessageOverhead: boolean = true,
): number {
  // Based on node-ecies-lib implementation
  const ECIES_OVERHEAD = 97; // ephemeral pubkey (33) + iv (16) + tag (16) + mac (32)
  const RECIPIENT_OVERHEAD = 113; // per recipient overhead

  let overhead = recipientCount * RECIPIENT_OVERHEAD;
  if (includeMessageOverhead) {
    overhead += ECIES_OVERHEAD;
  }
  return overhead;
}

/**
 * Backported from node-ecies-lib: Parse multi-encrypted header
 */
export function parseMultiEncryptedHeader(_data: Uint8Array): unknown {
  // Simplified implementation - would need full backport for production
  throw new Error(
    'parseMultiEncryptedHeader not yet implemented in browser version',
  );
}

/**
 * Backported from node-ecies-lib: Build multi-recipient header
 */
export function buildECIESMultipleRecipientHeader(_data: unknown): Uint8Array {
  // Simplified implementation - would need full backport for production
  throw new Error(
    'buildECIESMultipleRecipientHeader not yet implemented in browser version',
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
  throw new Error(
    'decryptMultipleECIEForRecipient not yet implemented in browser version',
  );
}
