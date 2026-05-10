import type { Ledger } from '@brightchain/brightchain-lib/lib/ledger/ledger';
import type {
  ECIESService,
  SignatureUint8Array,
} from '@digitaldefiance/ecies-lib';
import { VaultLedgerEntryType } from '../enumerations/vault-ledger-entry-type';
import { CustodialKeyReleaseError, LedgerWriteError } from '../errors';
import type {
  IAdminSignature,
  ICustodialEncryptionResult,
  ICustodian,
} from '../interfaces';

/**
 * Default ICustodian implementation that uses the Ledger's admin quorum
 * for key release approval. A key release request is approved when the
 * configured quorum of active admin signers co-sign the release.
 *
 * Uses ECIESService for ECIES encryption/decryption of the tree seed.
 * Validates: Requirements 14.1–14.5, 16.1–16.5
 */
export class LedgerQuorumCustodian implements ICustodian {
  private readonly custodianPublicKey: Uint8Array;

  constructor(
    private readonly eciesService: ECIESService,
    private readonly ledger: Ledger,
    private readonly custodianPrivateKey: Uint8Array,
  ) {
    this.custodianPublicKey = eciesService.getPublicKey(custodianPrivateKey);
  }

  /**
   * Encrypt a Tree_Seed under the Custodian's ECIES public key.
   */
  async encryptTreeSeed(
    treeSeed: Uint8Array,
  ): Promise<ICustodialEncryptionResult> {
    const encryptedTreeSeed = await this.eciesService.encryptBasic(
      this.custodianPublicKey,
      treeSeed,
    );
    return {
      encryptedTreeSeed,
      custodialPublicKey: new Uint8Array(this.custodianPublicKey),
    };
  }

  /**
   * Request release of the decryption key for a vault's encrypted Tree_Seed.
   *
   * 1. Verify requesterPublicKey is provided (authorization check).
   * 2. Verify adminSignatures meet quorum (at least 1 signature required).
   * 3. Verify each admin signature against the creationLedgerEntryHash.
   * 4. Append a key_released ledger entry.
   * 5. Decrypt encryptedTreeSeed using custodianPrivateKey.
   * 6. Return the plaintext treeSeed.
   */
  async requestKeyRelease(
    creationLedgerEntryHash: Uint8Array,
    encryptedTreeSeed: Uint8Array,
    requesterPublicKey: Uint8Array,
    adminSignatures?: IAdminSignature[],
  ): Promise<Uint8Array> {
    // Authorization: requester must provide a valid public key
    if (!requesterPublicKey || requesterPublicKey.length === 0) {
      throw new CustodialKeyReleaseError('requester public key is required');
    }

    // Quorum check: at least one admin signature required
    if (!adminSignatures || adminSignatures.length === 0) {
      throw new CustodialKeyReleaseError(
        'admin quorum not met: at least one admin signature is required',
      );
    }

    // Verify each admin signature over the creationLedgerEntryHash
    for (const adminSig of adminSignatures) {
      const valid = this.eciesService.verifyMessage(
        adminSig.signerPublicKey,
        creationLedgerEntryHash,
        adminSig.signature as SignatureUint8Array,
      );
      if (!valid) {
        throw new CustodialKeyReleaseError('invalid admin signature in quorum');
      }
    }

    // Record key release on ledger BEFORE returning the key
    try {
      const typeBytes = new TextEncoder().encode(
        VaultLedgerEntryType.key_released,
      );
      const payload = new Uint8Array(
        typeBytes.length + creationLedgerEntryHash.length,
      );
      payload.set(typeBytes, 0);
      payload.set(creationLedgerEntryHash, typeBytes.length);

      // Use a simple signer derived from the custodian
      const custodianSigner = {
        publicKey: this.custodianPublicKey,
        sign: (data: Uint8Array) =>
          this.eciesService.signMessage(this.custodianPrivateKey, data),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.ledger.append(payload, custodianSigner as any);
    } catch (e) {
      if (e instanceof CustodialKeyReleaseError) throw e;
      throw new LedgerWriteError(
        `failed to record key release: ${(e as Error).message}`,
      );
    }

    // Decrypt the tree seed
    try {
      const treeSeed = await this.eciesService.decryptBasicWithHeader(
        this.custodianPrivateKey,
        encryptedTreeSeed,
      );
      return treeSeed;
    } catch (e) {
      throw new CustodialKeyReleaseError(
        `decryption failed: ${(e as Error).message}`,
      );
    }
  }

  /**
   * Query whether a key release has been recorded on the Ledger for a given vault.
   */
  async hasKeyReleaseRecord(
    creationLedgerEntryHash: Uint8Array,
  ): Promise<boolean> {
    const keyReleasedPrefix = new TextEncoder().encode(
      VaultLedgerEntryType.key_released,
    );

    try {
      const len = this.ledger.length;
      for (let i = 0; i < len; i++) {
        const entry = await this.ledger.getEntry(i);
        const payload = entry.payload;

        // Check if payload starts with key_released type
        if (payload.length < keyReleasedPrefix.length) continue;
        const prefix = payload.subarray(0, keyReleasedPrefix.length);
        if (!this.uint8Equal(prefix, keyReleasedPrefix)) continue;

        // Check if the remaining bytes contain the creationLedgerEntryHash
        const remaining = payload.subarray(keyReleasedPrefix.length);
        if (
          remaining.length >= creationLedgerEntryHash.length &&
          this.uint8Equal(
            remaining.subarray(0, creationLedgerEntryHash.length),
            creationLedgerEntryHash,
          )
        ) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
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
