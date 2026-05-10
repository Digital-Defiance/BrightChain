import type { ILedgerSigner } from '@brightchain/brightchain-lib/lib/interfaces/ledger/ledgerSigner';
import type { Ledger } from '@brightchain/brightchain-lib/lib/ledger/ledger';
import { VaultLedgerEntryType } from '../enumerations/vault-ledger-entry-type';
import { LedgerWriteError } from '../errors';

/**
 * Mediates all vault operations through the Ledger.
 * Every vault lifecycle event is recorded as a typed ledger entry
 * BEFORE the corresponding operation executes.
 *
 * Validates: Requirements 13.1–13.7
 */
export class LedgerGateway {
  constructor(
    private readonly ledger: Ledger,
    private readonly signer: ILedgerSigner,
  ) {}

  /**
   * Append a "vault_created" entry to the ledger.
   * Returns the ledger entry hash as Uint8Array.
   */
  async recordCreation(
    merkleRoot: Uint8Array,
    creatorPublicKey: Uint8Array,
  ): Promise<Uint8Array> {
    return this.appendEntry(
      VaultLedgerEntryType.vault_created,
      merkleRoot,
      creatorPublicKey,
    );
  }

  /**
   * Append a "vault_read_requested" entry to the ledger.
   */
  async recordRead(creationLedgerEntryHash: Uint8Array): Promise<Uint8Array> {
    return this.appendEntry(
      VaultLedgerEntryType.vault_read_requested,
      creationLedgerEntryHash,
    );
  }

  /**
   * Append a "vault_destroyed" entry to the ledger.
   */
  async recordDestruction(
    creationLedgerEntryHash: Uint8Array,
  ): Promise<Uint8Array> {
    return this.appendEntry(
      VaultLedgerEntryType.vault_destroyed,
      creationLedgerEntryHash,
    );
  }

  /**
   * Validate that a creationLedgerEntryHash references a real entry
   * of type "vault_created" in the ledger.
   */
  async validateLedgerReference(
    creationLedgerEntryHash: Uint8Array,
  ): Promise<boolean> {
    try {
      // Walk entries to find one matching the hash
      const len = this.ledger.length;
      for (let i = 0; i < len; i++) {
        const entry = await this.ledger.getEntry(i);
        if (
          this.uint8Equal(
            entry.entryHash.toUint8Array(),
            creationLedgerEntryHash,
          )
        ) {
          // Check payload starts with vault_created type
          const payloadStr = new TextDecoder().decode(
            entry.payload.subarray(
              0,
              VaultLedgerEntryType.vault_created.length,
            ),
          );
          return payloadStr === VaultLedgerEntryType.vault_created;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  private async appendEntry(
    entryType: VaultLedgerEntryType,
    ...data: Uint8Array[]
  ): Promise<Uint8Array> {
    try {
      const typeBytes = new TextEncoder().encode(entryType);
      let totalLen = typeBytes.length;
      for (const d of data) totalLen += d.length;
      const payload = new Uint8Array(totalLen);
      let offset = 0;
      payload.set(typeBytes, offset);
      offset += typeBytes.length;
      for (const d of data) {
        payload.set(d, offset);
        offset += d.length;
      }
      const checksum = await this.ledger.append(payload, this.signer);
      return checksum.toUint8Array();
    } catch (e) {
      throw new LedgerWriteError((e as Error).message);
    }
  }

  private uint8Equal(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}
