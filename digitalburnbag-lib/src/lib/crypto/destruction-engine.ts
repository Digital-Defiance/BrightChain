import type { ECIESService } from '@digitaldefiance/ecies-lib';
import { VaultState } from '../enumerations/vault-state';
import { VaultDestroyedError } from '../errors';
import type { IDestructionProof } from '../interfaces';
import type { LedgerGateway } from '../ledger/ledger-gateway';
import { MemoryEraser } from './memory-eraser';
import type { Vault } from './vault';

/**
 * Produces signed destruction proofs and securely erases vault contents.
 *
 * Protocol:
 * 1. Assert vault state is not Destroyed
 * 2. Record destruction on ledger
 * 3. Request custodial release of treeSeed
 * 4. Generate nonce, record timestamp
 * 5. Sign message: treeSeed || nonce || bigEndian64(timestamp)
 * 6. Erase encrypted payload, encryptedTreeSeed, plaintext treeSeed
 * 7. Mark vault as Destroyed
 * 8. Return IDestructionProof
 *
 * Validates: Requirements 5.1–5.6, 10.1, 13.3, 14.6
 */
export class DestructionEngine {
  constructor(
    private readonly eciesService: ECIESService,
    private readonly ledgerGateway: LedgerGateway,
  ) {}

  async destroy(
    vault: Vault,
    creatorPrivateKey: Uint8Array,
    requesterPublicKey: Uint8Array,
    adminSignatures?: import('../interfaces').IAdminSignature[],
  ): Promise<IDestructionProof> {
    // 1. Assert state is not Destroyed
    if (vault.state === VaultState.Destroyed) {
      throw new VaultDestroyedError();
    }

    const internals = vault.internals;

    // 2. Record destruction on ledger
    await this.ledgerGateway.recordDestruction(
      internals.creationLedgerEntryHash,
    );

    // 3. Get treeSeed via custodial release
    // For destruction, we need the custodian to release the tree seed
    // The vault's ICustodian is not directly accessible here, so we
    // accept the treeSeed from the caller or use a custodian parameter.
    // For simplicity, we decrypt via the vault's custodian interface
    // passed through the vault's read mechanism. But per the design,
    // the DestructionEngine gets the treeSeed from the vault internals.
    // We'll accept a custodian parameter for key release.
    let treeSeed: Uint8Array | null = null;

    try {
      // Request key release from custodian (passed via vault)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      treeSeed = await (vault as any)['custodian'].requestKeyRelease(
        internals.creationLedgerEntryHash,
        internals.encryptedTreeSeed,
        requesterPublicKey,
        adminSignatures,
      );
      const seed = treeSeed!;

      // 4. Generate 32-byte random nonce
      const nonce = new Uint8Array(32);
      crypto.getRandomValues(nonce);

      // 5. Record timestamp as current UTC milliseconds
      const timestamp = Date.now();

      // 6. Construct message: treeSeed || nonce || bigEndian64(timestamp)
      const message = new Uint8Array(32 + 32 + 8);
      message.set(seed, 0);
      message.set(nonce, 32);
      const tsView = new DataView(message.buffer, 64, 8);
      // bigEndian64: write as two 32-bit values
      tsView.setUint32(0, Math.floor(timestamp / 0x100000000), false);
      tsView.setUint32(4, timestamp >>> 0, false);

      // 7. Sign message
      const signature = this.eciesService.signMessage(
        creatorPrivateKey,
        message,
      );

      // 8. Get creator public key
      const creatorPublicKey =
        this.eciesService.getPublicKey(creatorPrivateKey);

      // 9. Erase encrypted payload, encryptedTreeSeed
      MemoryEraser.wipeAll(
        internals.encryptedPayload,
        internals.encryptedTreeSeed,
      );

      // 10. Mark vault as Destroyed
      vault.markDestroyed();

      // 11. Return IDestructionProof
      // Note: treeSeed is revealed in the proof (not erased yet)
      const proof: IDestructionProof = {
        treeSeed: new Uint8Array(seed),
        nonce,
        timestamp,
        signature,
        creatorPublicKey,
      };

      return proof;
    } finally {
      // Erase plaintext treeSeed
      MemoryEraser.wipe(treeSeed);
    }
  }
}
