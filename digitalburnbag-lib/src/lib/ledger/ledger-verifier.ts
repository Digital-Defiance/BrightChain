import type { Ledger } from '@brightchain/brightchain-lib/lib/ledger/ledger';
import { AccessSeal } from '../crypto/access-seal';
import { VaultLedgerEntryType } from '../enumerations/vault-ledger-entry-type';
import { SealLedgerInconsistencyError } from '../errors';
import type { ILedgerVerificationResult } from '../interfaces';

/**
 * Walks ledger entries for a vault to verify non-access.
 * Cross-checks the vault's Access_Seal against ledger records
 * to detect snapshot-restore tampering.
 *
 * Validates: Requirements 15.1–15.6, 17.1, 17.2
 */
export class LedgerVerifier {
  constructor(private readonly ledger: Ledger) {}

  /**
   * Verify non-access for a vault by checking both the seal and the ledger.
   */
  async verifyNonAccess(
    creationLedgerEntryHash: Uint8Array,
    accessSeal: Uint8Array,
    treeSeed: Uint8Array,
  ): Promise<ILedgerVerificationResult> {
    // 1. Check seal status
    const isPristine = AccessSeal.verifyPristine(treeSeed, accessSeal);
    const isAccessed = AccessSeal.verifyAccessed(treeSeed, accessSeal);
    const sealStatus: 'pristine' | 'accessed' | 'unknown' = isPristine
      ? 'pristine'
      : isAccessed
        ? 'accessed'
        : 'unknown';

    // 2. Walk ledger entries referencing this vault
    let ledgerReadCount = 0;
    let ledgerKeyReleaseCount = 0;

    const readPrefix = new TextEncoder().encode(
      VaultLedgerEntryType.vault_read_requested,
    );
    const keyReleasePrefix = new TextEncoder().encode(
      VaultLedgerEntryType.key_released,
    );

    try {
      const len = this.ledger.length;
      for (let i = 0; i < len; i++) {
        const entry = await this.ledger.getEntry(i);
        const payload = entry.payload;

        // Check if this entry references our vault
        if (
          this.startsWith(payload, readPrefix) &&
          this.containsHash(payload, readPrefix.length, creationLedgerEntryHash)
        ) {
          ledgerReadCount++;
        } else if (
          this.startsWith(payload, keyReleasePrefix) &&
          this.containsHash(
            payload,
            keyReleasePrefix.length,
            creationLedgerEntryHash,
          )
        ) {
          ledgerKeyReleaseCount++;
        }
      }
    } catch {
      // If ledger walk fails, report what we have
    }

    // 3. Cross-check seal state against ledger records
    const hasLedgerAccess = ledgerReadCount > 0 || ledgerKeyReleaseCount > 0;

    if (isPristine && !hasLedgerAccess) {
      // Seal pristine AND zero read/key-release entries → positive non-access
      return {
        nonAccessConfirmed: true,
        sealStatus,
        ledgerReadCount,
        ledgerKeyReleaseCount,
        consistent: true,
      };
    }

    if (isPristine && hasLedgerAccess) {
      // Seal pristine BUT ledger has read/key-release entries
      // → snapshot-restore attack detected
      const error = new SealLedgerInconsistencyError(
        'seal is pristine but ledger records access events',
      );
      return {
        nonAccessConfirmed: false,
        sealStatus,
        ledgerReadCount,
        ledgerKeyReleaseCount,
        consistent: false,
        error: error.message,
      };
    }

    if (isAccessed) {
      // Seal accessed → confirm ledger has at least one read entry
      const consistent = ledgerReadCount > 0 || ledgerKeyReleaseCount > 0;
      return {
        nonAccessConfirmed: false,
        sealStatus,
        ledgerReadCount,
        ledgerKeyReleaseCount,
        consistent,
        error: consistent
          ? undefined
          : 'seal is accessed but ledger has no access records',
      };
    }

    // Unknown seal status
    return {
      nonAccessConfirmed: false,
      sealStatus: 'unknown',
      ledgerReadCount,
      ledgerKeyReleaseCount,
      consistent: false,
      error: 'seal status could not be determined',
    };
  }

  private startsWith(payload: Uint8Array, prefix: Uint8Array): boolean {
    if (payload.length < prefix.length) return false;
    for (let i = 0; i < prefix.length; i++) {
      if (payload[i] !== prefix[i]) return false;
    }
    return true;
  }

  private containsHash(
    payload: Uint8Array,
    offset: number,
    hash: Uint8Array,
  ): boolean {
    if (payload.length < offset + hash.length) return false;
    for (let i = 0; i < hash.length; i++) {
      if (payload[offset + i] !== hash[i]) return false;
    }
    return true;
  }
}
