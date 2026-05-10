import type { AESGCMService, Pbkdf2Service } from '@digitaldefiance/ecies-lib';
import { VaultState } from '../enumerations/vault-state';
import {
  CustodialKeyReleaseError,
  DecryptionError,
  VaultDestroyedError,
} from '../errors';
import type { ICustodian, IReadResult, IVaultInternals } from '../interfaces';
import type { LedgerGateway } from '../ledger/ledger-gateway';
import { RecipeSerializer } from '../serialization/recipe-serializer';
import { AccessSeal } from './access-seal';
import { MemoryEraser } from './memory-eraser';

/**
 * Holds encrypted payload and state; enforces state machine transitions.
 * Requests custodial key release and records read on ledger before decrypting.
 *
 * State machine:
 *   Sealed  → read() → Accessed
 *   Sealed  → destroy() → Destroyed
 *   Accessed → read() → Accessed
 *   Accessed → destroy() → Destroyed
 *   Destroyed → (all rejected)
 *
 * Validates: Requirements 11.1–11.7, 20.1, 20.2, 20.4
 */
export class Vault {
  private readonly _internals: IVaultInternals;
  private readonly ledgerGateway: LedgerGateway;
  private readonly custodian: ICustodian;
  private readonly aesGcmService: AESGCMService;
  private readonly pbkdf2Service: Pbkdf2Service;
  private _mutex: Promise<void> = Promise.resolve();

  constructor(
    internals: IVaultInternals,
    ledgerGateway: LedgerGateway,
    custodian: ICustodian,
    aesGcmService: AESGCMService,
    pbkdf2Service: Pbkdf2Service,
  ) {
    this._internals = internals;
    this.ledgerGateway = ledgerGateway;
    this.custodian = custodian;
    this.aesGcmService = aesGcmService;
    this.pbkdf2Service = pbkdf2Service;
  }

  get state(): VaultState {
    return this._internals.state;
  }

  /** Expose internals for DestructionEngine and testing */
  get internals(): IVaultInternals {
    return this._internals;
  }

  /**
   * Read the vault's secret payload.
   * Serializes concurrent calls via mutex to prevent race conditions.
   */
  async read(
    requesterPublicKey: Uint8Array,
    adminSignatures?: import('../interfaces').IAdminSignature[],
  ): Promise<IReadResult> {
    // Serialize access
    const release = this.acquireMutex();
    try {
      return await this._readInternal(requesterPublicKey, adminSignatures);
    } finally {
      release();
    }
  }

  private async _readInternal(
    requesterPublicKey: Uint8Array,
    adminSignatures?: import('../interfaces').IAdminSignature[],
  ): Promise<IReadResult> {
    // 1. Assert state is not Destroyed
    if (this._internals.state === VaultState.Destroyed) {
      throw new VaultDestroyedError();
    }

    // 2. Record read on ledger BEFORE decryption
    await this.ledgerGateway.recordRead(
      this._internals.creationLedgerEntryHash,
    );

    // 3. Request custodial key release
    let treeSeed: Uint8Array;
    try {
      treeSeed = await this.custodian.requestKeyRelease(
        this._internals.creationLedgerEntryHash,
        this._internals.encryptedTreeSeed,
        requesterPublicKey,
        adminSignatures,
      );
    } catch (e) {
      if (e instanceof CustodialKeyReleaseError) throw e;
      throw new CustodialKeyReleaseError((e as Error).message);
    }

    let derivedKey: Uint8Array | null = null;
    try {
      // 4. Derive AES key from treeSeed via PBKDF2
      const pbkdf2Result = await this.pbkdf2Service.deriveKeyFromPasswordAsync(
        treeSeed,
        this._internals.pbkdf2Salt,
      );
      derivedKey = pbkdf2Result.hash;

      // 5. Decrypt payload
      // Combine encrypted data with auth tag for AES-GCM
      const encryptedWithTag = new Uint8Array(
        this._internals.encryptedPayload.length +
          this._internals.authTag.length,
      );
      encryptedWithTag.set(this._internals.encryptedPayload, 0);
      encryptedWithTag.set(
        this._internals.authTag,
        this._internals.encryptedPayload.length,
      );

      let plaintext: Uint8Array;
      try {
        plaintext = await this.aesGcmService.decrypt(
          this._internals.iv,
          encryptedWithTag,
          derivedKey,
          true,
        );
      } catch {
        throw new DecryptionError('AES-GCM decryption failed');
      }

      // 6. If Sealed, mutate seal to accessed domain; transition to Accessed
      if (this._internals.state === VaultState.Sealed) {
        this._internals.accessSeal = AccessSeal.derive(
          treeSeed,
          AccessSeal.ACCESSED_DOMAIN,
        );
        this._internals.state = VaultState.Accessed;
      }

      // 7. Parse decrypted payload: [4-byte keyLength BE] || encryptionKey || serializedRecipe
      const payloadView = new DataView(
        plaintext.buffer,
        plaintext.byteOffset,
        plaintext.byteLength,
      );
      const keyLength = payloadView.getUint32(0, false);
      const encryptionKey = plaintext.slice(4, 4 + keyLength);
      const serializedRecipe = plaintext.slice(4 + keyLength);
      const recipe = RecipeSerializer.deserialize(serializedRecipe);

      return { encryptionKey, recipe };
    } finally {
      // 8. Erase sensitive material
      MemoryEraser.wipeAll(derivedKey, treeSeed);
    }
  }

  /**
   * Mark vault as destroyed. Called by DestructionEngine.
   */
  markDestroyed(): void {
    this._internals.state = VaultState.Destroyed;
  }

  /**
   * Simple mutex to serialize state-mutating operations.
   */
  private acquireMutex(): () => void {
    let release: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    const prev = this._mutex;
    this._mutex = prev.then(() => next);
    // Wait for previous operation to complete
    prev.then(() => {});
    return release!;
  }
}
