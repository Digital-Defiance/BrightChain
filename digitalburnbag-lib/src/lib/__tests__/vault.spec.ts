import {
  AESGCMService,
  ECIESService,
  Pbkdf2Service,
} from '@digitaldefiance/ecies-lib';
import { AccessSeal } from '../crypto/access-seal';
import { Vault } from '../crypto/vault';
import { VaultState } from '../enumerations/vault-state';
import { CustodialKeyReleaseError, VaultDestroyedError } from '../errors';
import type { IAdminSignature, IRecipe, IVaultInternals } from '../interfaces';
import { RecipeSerializer } from '../serialization/recipe-serializer';

const ecies = new ECIESService();
const aesGcm = new AESGCMService();
const pbkdf2 = new Pbkdf2Service();

// Helper: create a valid encrypted vault for testing
async function createTestVault(opts?: {
  custodianRefuses?: boolean;
  ledgerFails?: boolean;
}) {
  const treeSeed = new Uint8Array(32);
  crypto.getRandomValues(treeSeed);

  // Derive AES key
  const salt = new Uint8Array(32);
  crypto.getRandomValues(salt);
  const pbkdf2Result = await pbkdf2.deriveKeyFromPasswordAsync(treeSeed, salt);
  const derivedKey = pbkdf2Result.hash;

  // Build a simple recipe
  const recipe: IRecipe = {
    blockIds: [new Uint8Array(16).fill(0xaa)],
    totalBlockCount: 1,
  };
  const serializedRecipe = RecipeSerializer.serialize(recipe);

  // Build payload: [4-byte keyLength BE] || encryptionKey || serializedRecipe
  const encryptionKey = new Uint8Array(32);
  crypto.getRandomValues(encryptionKey);
  const payload = new Uint8Array(
    4 + encryptionKey.length + serializedRecipe.length,
  );
  const pView = new DataView(payload.buffer);
  pView.setUint32(0, encryptionKey.length, false);
  payload.set(encryptionKey, 4);
  payload.set(serializedRecipe, 4 + encryptionKey.length);

  // Encrypt
  const encrypted = await aesGcm.encrypt(payload, derivedKey, true);

  // Derive pristine seal
  const accessSeal = AccessSeal.derive(treeSeed, AccessSeal.PRISTINE_DOMAIN);

  // Custodian key pair
  const custodianPrivateKey = ecies.core.generatePrivateKey();
  const custodianPublicKey = ecies.getPublicKey(custodianPrivateKey);
  const encryptedTreeSeed = await ecies.encryptBasic(
    custodianPublicKey,
    treeSeed,
  );

  // Admin key pair for signatures
  const adminPrivateKey = ecies.core.generatePrivateKey();
  const adminPublicKey = ecies.getPublicKey(adminPrivateKey);

  const creationLedgerEntryHash = new Uint8Array(64);
  crypto.getRandomValues(creationLedgerEntryHash);

  const internals: IVaultInternals = {
    encryptedPayload: encrypted.encrypted,
    iv: encrypted.iv,
    authTag: encrypted.tag!,
    pbkdf2Salt: salt,
    encryptedTreeSeed,
    custodialPublicKey: custodianPublicKey,
    creationLedgerEntryHash,
    merkleRoot: new Uint8Array(64),
    treeDepth: 10,
    accessSeal: new Uint8Array(accessSeal),
    state: VaultState.Sealed,
  };

  // Mock ledger gateway
  const ledgerGateway = {
    async recordRead(_hash: Uint8Array) {
      if (opts?.ledgerFails) throw new Error('ledger down');
      return new Uint8Array(64);
    },
    async recordCreation() {
      return new Uint8Array(64);
    },
    async recordDestruction() {
      return new Uint8Array(64);
    },
    async validateLedgerReference() {
      return true;
    },
  };

  // Mock custodian
  const custodian: import('../interfaces').ICustodian = {
    async encryptTreeSeed(seed: Uint8Array) {
      return {
        encryptedTreeSeed: seed,
        custodialPublicKey: custodianPublicKey,
      };
    },
    async requestKeyRelease(
      _hash: Uint8Array,
      encSeed: Uint8Array,
      _requester: Uint8Array,
      _adminSigs?: IAdminSignature[],
    ) {
      if (opts?.custodianRefuses) {
        throw new CustodialKeyReleaseError('access denied');
      }
      return ecies.decryptBasicWithHeader(custodianPrivateKey, encSeed);
    },
    async hasKeyReleaseRecord() {
      return false;
    },
  };

  const vault = new Vault(
    internals,
    ledgerGateway as unknown as import('../ledger-gateway').LedgerGateway,
    custodian,
    aesGcm,
    pbkdf2,
  );

  const adminSignature = ecies.signMessage(
    adminPrivateKey,
    creationLedgerEntryHash,
  );
  const requesterPublicKey = ecies.getPublicKey(
    ecies.core.generatePrivateKey(),
  );

  return {
    vault,
    internals,
    treeSeed: new Uint8Array(treeSeed),
    encryptionKey: new Uint8Array(encryptionKey),
    recipe,
    accessSeal: new Uint8Array(accessSeal),
    adminSignatures: [
      { signerPublicKey: adminPublicKey, signature: adminSignature },
    ] as IAdminSignature[],
    requesterPublicKey,
  };
}

describe('Vault', () => {
  // Feature: digital-burn-bag, Property 14: Vault state machine transitions
  // Validates: Requirements 11.1, 11.2, 11.3, 11.5, 11.6
  it('Property 14: state transitions follow Sealed→Accessed→Destroyed graph', async () => {
    const ctx = await createTestVault();

    // Initially Sealed
    expect(ctx.vault.state).toBe(VaultState.Sealed);

    // Read → transitions to Accessed
    const result = await ctx.vault.read(
      ctx.requesterPublicKey,
      ctx.adminSignatures,
    );
    expect(ctx.vault.state).toBe(VaultState.Accessed);
    expect(result.encryptionKey).toBeInstanceOf(Uint8Array);

    // Second read → stays Accessed
    const result2 = await ctx.vault.read(
      ctx.requesterPublicKey,
      ctx.adminSignatures,
    );
    expect(ctx.vault.state).toBe(VaultState.Accessed);
    expect(result2.encryptionKey.length).toBe(ctx.encryptionKey.length);

    // Mark destroyed
    ctx.vault.markDestroyed();
    expect(ctx.vault.state).toBe(VaultState.Destroyed);

    // All operations rejected
    await expect(
      ctx.vault.read(ctx.requesterPublicKey, ctx.adminSignatures),
    ).rejects.toThrow(VaultDestroyedError);
  });

  // Feature: digital-burn-bag, Property 6: Destroyed vault rejects all operations
  // Validates: Requirements 4.5, 5.6, 11.4
  it('Property 6: destroyed vault rejects read', async () => {
    const ctx = await createTestVault();
    ctx.vault.markDestroyed();

    await expect(
      ctx.vault.read(ctx.requesterPublicKey, ctx.adminSignatures),
    ).rejects.toThrow(VaultDestroyedError);
    expect(ctx.vault.state).toBe(VaultState.Destroyed);
  });

  // Feature: digital-burn-bag, Property 18 (vault-level): Custodian refusal preserves state
  // Validates: Requirements 14.4
  it('Property 18: custodian refusal preserves vault state and seal', async () => {
    const ctx = await createTestVault({ custodianRefuses: true });
    const originalSeal = new Uint8Array(ctx.internals.accessSeal);

    await expect(
      ctx.vault.read(ctx.requesterPublicKey, ctx.adminSignatures),
    ).rejects.toThrow(CustodialKeyReleaseError);

    // State unchanged
    expect(ctx.vault.state).toBe(VaultState.Sealed);
    // Seal unchanged
    for (let i = 0; i < originalSeal.length; i++) {
      expect(ctx.internals.accessSeal[i]).toBe(originalSeal[i]);
    }
  });

  // Feature: digital-burn-bag, Property 1 (partial): Vault payload round-trip
  // Validates: Requirements 1.4, 4.1, 4.4
  it('Property 1: read returns original encryption key and recipe', async () => {
    const ctx = await createTestVault();
    const result = await ctx.vault.read(
      ctx.requesterPublicKey,
      ctx.adminSignatures,
    );

    // Encryption key matches
    expect(result.encryptionKey.length).toBe(ctx.encryptionKey.length);
    for (let i = 0; i < ctx.encryptionKey.length; i++) {
      expect(result.encryptionKey[i]).toBe(ctx.encryptionKey[i]);
    }

    // Recipe matches
    expect(result.recipe.totalBlockCount).toBe(ctx.recipe.totalBlockCount);
    expect(result.recipe.blockIds.length).toBe(ctx.recipe.blockIds.length);
    for (let b = 0; b < ctx.recipe.blockIds.length; b++) {
      for (let i = 0; i < ctx.recipe.blockIds[b].length; i++) {
        expect(result.recipe.blockIds[b][i]).toBe(ctx.recipe.blockIds[b][i]);
      }
    }
  });

  // Feature: digital-burn-bag, Property 4 (vault-level): Seal mutation on read
  // Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
  it('Property 4: reading mutates seal from pristine to accessed', async () => {
    const ctx = await createTestVault();

    // Before read: seal is pristine
    expect(
      AccessSeal.verifyPristine(ctx.treeSeed, ctx.internals.accessSeal),
    ).toBe(true);

    await ctx.vault.read(ctx.requesterPublicKey, ctx.adminSignatures);

    // After read: seal is accessed, not pristine
    expect(
      AccessSeal.verifyPristine(ctx.treeSeed, ctx.internals.accessSeal),
    ).toBe(false);
    expect(
      AccessSeal.verifyAccessed(ctx.treeSeed, ctx.internals.accessSeal),
    ).toBe(true);

    // Second read: seal stays accessed
    await ctx.vault.read(ctx.requesterPublicKey, ctx.adminSignatures);
    expect(
      AccessSeal.verifyAccessed(ctx.treeSeed, ctx.internals.accessSeal),
    ).toBe(true);
  });

  // Feature: digital-burn-bag, Property 5: Failed decryption preserves seal
  // Validates: Requirements 4.3
  it('Property 5: failed read with wrong custodian key preserves pristine seal', async () => {
    // Create a vault where the custodian returns garbage instead of the real tree seed
    const ctx = await createTestVault();
    const originalSeal = new Uint8Array(ctx.internals.accessSeal);

    // Verify seal is pristine before attempt
    expect(
      AccessSeal.verifyPristine(ctx.treeSeed, ctx.internals.accessSeal),
    ).toBe(true);

    // Monkey-patch the custodian to return a wrong seed (simulates wrong key)
    const origCustodian = ctx.vault['custodian'];
    (ctx.vault as unknown as { custodian: typeof origCustodian }).custodian = {
      ...origCustodian,
      async requestKeyRelease() {
        // Return a random seed that won't decrypt the payload
        const wrongSeed = new Uint8Array(32);
        crypto.getRandomValues(wrongSeed);
        return wrongSeed;
      },
    };

    // Read should fail with DecryptionError
    await expect(
      ctx.vault.read(ctx.requesterPublicKey, ctx.adminSignatures),
    ).rejects.toThrow();

    // State must still be Sealed
    expect(ctx.vault.state).toBe(VaultState.Sealed);

    // Seal must be unchanged (still pristine)
    for (let i = 0; i < originalSeal.length; i++) {
      expect(ctx.internals.accessSeal[i]).toBe(originalSeal[i]);
    }
    expect(
      AccessSeal.verifyPristine(ctx.treeSeed, ctx.internals.accessSeal),
    ).toBe(true);
  });

  // Feature: digital-burn-bag, Property 24: State machine concurrency safety
  // Validates: Requirements 20.1, 20.2, 20.4
  it('Property 24: concurrent reads both succeed and vault transitions to Accessed exactly once', async () => {
    const ctx = await createTestVault();
    let ledgerReadCount = 0;

    // Patch ledger to count read entries
    const origLedger = ctx.vault['ledgerGateway'];
    (
      ctx.vault as unknown as { ledgerGateway: typeof origLedger }
    ).ledgerGateway = {
      ...origLedger,
      async recordRead(hash: Uint8Array) {
        ledgerReadCount++;
        return origLedger.recordRead(hash);
      },
    };

    // Fire two concurrent reads
    const [result1, result2] = await Promise.all([
      ctx.vault.read(ctx.requesterPublicKey, ctx.adminSignatures),
      ctx.vault.read(ctx.requesterPublicKey, ctx.adminSignatures),
    ]);

    // Both should return valid results
    expect(result1.encryptionKey.length).toBe(ctx.encryptionKey.length);
    expect(result2.encryptionKey.length).toBe(ctx.encryptionKey.length);

    // Both should have recorded ledger entries
    expect(ledgerReadCount).toBe(2);

    // Vault should be in Accessed state (not Sealed, not Destroyed)
    expect(ctx.vault.state).toBe(VaultState.Accessed);
  });
});
