/**
 * End-to-end vault lifecycle integration tests.
 *
 * These tests use REAL cryptographic implementations — no mocks for
 * ECIESService, AESGCMService, Pbkdf2Service, MerkleCommitmentTree,
 * AccessSeal, DestructionEngine, ProofVerifier, or LedgerVerifier.
 *
 * The only thin wrappers are the ledger (in-memory append-only log that
 * still uses real payloads) and the custodian (which uses real ECIES
 * encrypt/decrypt). These are not mocks — they are minimal in-memory
 * implementations of the same contracts.
 *
 * Each test walks the full lifecycle and checks counters, seal state,
 * and proof validity at every step.
 */
import type { Ledger } from '@brightchain/brightchain-lib';
import {
  AESGCMService,
  ECIESService,
  Pbkdf2Service,
} from '@digitaldefiance/ecies-lib';
import { AccessSeal } from '../crypto/access-seal';
import { BloomWitness } from '../crypto/bloom-witness';
import { DestructionEngine } from '../crypto/destruction-engine';
import { MemoryEraser } from '../crypto/memory-eraser';
import { MerkleCommitmentTree } from '../crypto/merkle-commitment-tree';
import { ProofVerifier } from '../crypto/proof-verifier';
import { Vault } from '../crypto/vault';
import { VaultLedgerEntryType } from '../enumerations/vault-ledger-entry-type';
import { VaultState } from '../enumerations/vault-state';
import { VaultDestroyedError } from '../errors';
import type {
  IAdminSignature,
  ICustodian,
  IRecipe,
  IVaultInternals,
  IVerificationBundle,
} from '../interfaces';
import { LedgerVerifier } from '../ledger/ledger-verifier';
import { RecipeSerializer } from '../serialization/recipe-serializer';

// ── Real services ───────────────────────────────────────────────────
const ecies = new ECIESService();
const aesGcm = new AESGCMService();
const pbkdf2 = new Pbkdf2Service();

// ── In-memory ledger (real payloads, real append-only semantics) ─────

interface LedgerEntry {
  payload: Uint8Array;
  entryHash: Uint8Array;
  sequenceNumber: number;
}

function createLiveLedger() {
  const entries: LedgerEntry[] = [];
  let seq = 0;

  function append(payload: Uint8Array): Uint8Array {
    const hash = new Uint8Array(64);
    crypto.getRandomValues(hash);
    entries.push({
      payload: new Uint8Array(payload),
      entryHash: hash,
      sequenceNumber: seq++,
    });
    return hash;
  }

  function buildPayload(
    type: VaultLedgerEntryType,
    refHash: Uint8Array,
  ): Uint8Array {
    const typeBytes = new TextEncoder().encode(type);
    const buf = new Uint8Array(typeBytes.length + refHash.length);
    buf.set(typeBytes, 0);
    buf.set(refHash, typeBytes.length);
    return buf;
  }

  function countByType(
    type: VaultLedgerEntryType,
    refHash: Uint8Array,
  ): number {
    const typeStr = type;
    const decoder = new TextDecoder();
    let count = 0;
    for (const e of entries) {
      const payloadStr = decoder.decode(e.payload.subarray(0, typeStr.length));
      if (payloadStr !== typeStr) continue;
      const hash = e.payload.subarray(typeStr.length);
      if (hash.length !== refHash.length) continue;
      let match = true;
      for (let i = 0; i < hash.length; i++) {
        if (hash[i] !== refHash[i]) {
          match = false;
          break;
        }
      }
      if (match) count++;
    }
    return count;
  }

  return {
    entries,
    append,
    buildPayload,
    countByType,
    get length() {
      return entries.length;
    },
    // LedgerGateway-compatible interface
    gateway: {
      async recordCreation(
        merkleRoot: Uint8Array,
        _creatorPublicKey: Uint8Array,
      ): Promise<Uint8Array> {
        const payload = buildPayload(
          VaultLedgerEntryType.vault_created,
          merkleRoot,
        );
        return append(payload);
      },
      async recordRead(creationHash: Uint8Array): Promise<Uint8Array> {
        const payload = buildPayload(
          VaultLedgerEntryType.vault_read_requested,
          creationHash,
        );
        return append(payload);
      },
      async recordDestruction(creationHash: Uint8Array): Promise<Uint8Array> {
        const payload = buildPayload(
          VaultLedgerEntryType.vault_destroyed,
          creationHash,
        );
        return append(payload);
      },
      async validateLedgerReference(): Promise<boolean> {
        return true;
      },
    },
    // LedgerVerifier-compatible interface
    verifierLedger: {
      get length() {
        return entries.length;
      },
      async getEntry(seqNum: number) {
        const e = entries[seqNum];
        return {
          payload: e.payload,
          entryHash: { toUint8Array: () => e.entryHash },
          sequenceNumber: e.sequenceNumber,
        };
      },
    },
  };
}

// ── In-memory custodian (real ECIES encrypt/decrypt) ────────────────

function createLiveCustodian(ledger: ReturnType<typeof createLiveLedger>) {
  const custodianPrivateKey = ecies.core.generatePrivateKey();
  const custodianPublicKey = ecies.getPublicKey(custodianPrivateKey);

  const custodian: ICustodian = {
    async encryptTreeSeed(treeSeed: Uint8Array) {
      const encrypted = await ecies.encryptBasic(custodianPublicKey, treeSeed);
      return {
        encryptedTreeSeed: encrypted,
        custodialPublicKey: custodianPublicKey,
      };
    },
    async requestKeyRelease(
      creationHash: Uint8Array,
      encryptedTreeSeed: Uint8Array,
      _requesterPublicKey: Uint8Array,
      _adminSignatures?: IAdminSignature[],
    ) {
      // Record key release on ledger (real behavior)
      ledger.append(
        ledger.buildPayload(VaultLedgerEntryType.key_released, creationHash),
      );
      // Real ECIES decryption
      return ecies.decryptBasicWithHeader(
        custodianPrivateKey,
        encryptedTreeSeed,
      );
    },
    async hasKeyReleaseRecord(creationHash: Uint8Array) {
      return (
        ledger.countByType(VaultLedgerEntryType.key_released, creationHash) > 0
      );
    },
  };

  return { custodian, custodianPublicKey, custodianPrivateKey };
}

// ── Full vault creation (mirrors VaultFactory but inline for transparency) ──

async function createFullVault(ledger: ReturnType<typeof createLiveLedger>) {
  const { custodian, custodianPublicKey } = createLiveCustodian(ledger);

  // 1. Random tree seed
  const treeSeed = new Uint8Array(32);
  crypto.getRandomValues(treeSeed);

  // 2. Build Merkle commitment tree (real)
  const treeDepth = 8;
  const tree = MerkleCommitmentTree.build(treeSeed, treeDepth);

  // 3. Derive pristine access seal (real HMAC-SHA3-512)
  const pristineSeal = AccessSeal.derive(treeSeed, AccessSeal.PRISTINE_DOMAIN);

  // 4. Derive AES key via PBKDF2 (real)
  const salt = new Uint8Array(32);
  crypto.getRandomValues(salt);
  const { hash: derivedKey } = await pbkdf2.deriveKeyFromPasswordAsync(
    treeSeed,
    salt,
  );

  // 5. Build payload
  const encryptionKey = new Uint8Array(32);
  crypto.getRandomValues(encryptionKey);
  const recipe: IRecipe = {
    blockIds: [new Uint8Array(32).fill(0xaa), new Uint8Array(32).fill(0xbb)],
    totalBlockCount: 2,
  };
  const serializedRecipe = RecipeSerializer.serialize(recipe);
  const payload = new Uint8Array(
    4 + encryptionKey.length + serializedRecipe.length,
  );
  new DataView(payload.buffer).setUint32(0, encryptionKey.length, false);
  payload.set(encryptionKey, 4);
  payload.set(serializedRecipe, 4 + encryptionKey.length);

  // 6. Encrypt payload (real AES-256-GCM)
  const encrypted = await aesGcm.encrypt(payload, derivedKey, true);

  // 7. Encrypt tree seed under custodian (real ECIES)
  const { encryptedTreeSeed } = await custodian.encryptTreeSeed(treeSeed);

  // 8. Record creation on ledger
  const creationHash = await ledger.gateway.recordCreation(
    tree.root,
    ecies.getPublicKey(ecies.core.generatePrivateKey()),
  );

  // 9. Build Bloom witness (real)
  const bloomWitness = BloomWitness.create(tree.allNodes(), 0.001);

  // 10. Assemble vault internals
  const internals: IVaultInternals = {
    encryptedPayload: encrypted.encrypted,
    iv: encrypted.iv,
    authTag: encrypted.tag!,
    pbkdf2Salt: salt,
    encryptedTreeSeed,
    custodialPublicKey: custodianPublicKey,
    creationLedgerEntryHash: creationHash,
    merkleRoot: tree.root,
    treeDepth,
    accessSeal: new Uint8Array(pristineSeal),
    state: VaultState.Sealed,
  };

  // Creator key pair
  const creatorPrivateKey = ecies.core.generatePrivateKey();
  const creatorPublicKey = ecies.getPublicKey(creatorPrivateKey);

  // Admin key pair for quorum signatures
  const adminPrivateKey = ecies.core.generatePrivateKey();
  const adminPublicKey = ecies.getPublicKey(adminPrivateKey);
  const adminSignature = ecies.signMessage(adminPrivateKey, creationHash);

  const vault = new Vault(
    internals,
    ledger.gateway as unknown as import('../ledger/ledger-gateway').LedgerGateway,
    custodian,
    aesGcm,
    pbkdf2,
  );

  const verificationBundle: IVerificationBundle = {
    version: 1,
    merkleRoot: tree.root,
    accessSeal: new Uint8Array(pristineSeal),
    creatorPublicKey,
    bloomWitness: bloomWitness.serialize(),
    treeDepth,
  };

  // Erase working copies of sensitive material (real MemoryEraser)
  MemoryEraser.wipe(derivedKey);

  return {
    vault,
    internals,
    treeSeed: new Uint8Array(treeSeed),
    encryptionKey: new Uint8Array(encryptionKey),
    recipe,
    tree,
    creatorPrivateKey,
    creatorPublicKey,
    creationHash,
    verificationBundle,
    custodian,
    adminSignatures: [
      { signerPublicKey: adminPublicKey, signature: adminSignature },
    ] as IAdminSignature[],
    requesterPublicKey: ecies.getPublicKey(ecies.core.generatePrivateKey()),
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('Vault Lifecycle Integration (live crypto, no mocks)', () => {
  it('full lifecycle: create → verify pristine → read → verify accessed → destroy → verify proof', async () => {
    const ledger = createLiveLedger();
    const ctx = await createFullVault(ledger);

    // ── Step 1: After creation ──────────────────────────────────
    expect(ctx.vault.state).toBe(VaultState.Sealed);
    expect(ledger.length).toBe(1); // vault_created
    expect(
      ledger.countByType(VaultLedgerEntryType.vault_created, ctx.creationHash),
    ).toBe(0); // creation payload uses merkleRoot, not creationHash
    // Seal is pristine
    expect(
      AccessSeal.verifyPristine(ctx.treeSeed, ctx.internals.accessSeal),
    ).toBe(true);
    expect(
      AccessSeal.verifyAccessed(ctx.treeSeed, ctx.internals.accessSeal),
    ).toBe(false);

    // Non-access verification passes
    const verifier = new LedgerVerifier(
      ledger.verifierLedger as unknown as Ledger,
    );
    const nonAccess1 = await verifier.verifyNonAccess(
      ctx.creationHash,
      ctx.internals.accessSeal,
      ctx.treeSeed,
    );
    expect(nonAccess1.nonAccessConfirmed).toBe(true);
    expect(nonAccess1.sealStatus).toBe('pristine');
    expect(nonAccess1.ledgerReadCount).toBe(0);
    expect(nonAccess1.ledgerKeyReleaseCount).toBe(0);
    expect(nonAccess1.consistent).toBe(true);

    // Bloom witness contains all tree nodes
    const bloom = BloomWitness.deserialize(ctx.verificationBundle.bloomWitness);
    for (const node of ctx.tree.allNodes()) {
      expect(bloom.query(node)).toBe(true);
    }

    // ── Step 2: Read the vault ──────────────────────────────────
    const entriesBefore = ledger.length;
    const readResult = await ctx.vault.read(
      ctx.requesterPublicKey,
      ctx.adminSignatures,
    );

    // Payload round-trip: encryption key matches
    expect(readResult.encryptionKey.length).toBe(ctx.encryptionKey.length);
    for (let i = 0; i < ctx.encryptionKey.length; i++) {
      expect(readResult.encryptionKey[i]).toBe(ctx.encryptionKey[i]);
    }
    // Recipe round-trip
    expect(readResult.recipe.totalBlockCount).toBe(ctx.recipe.totalBlockCount);
    expect(readResult.recipe.blockIds.length).toBe(ctx.recipe.blockIds.length);

    // State transitioned
    expect(ctx.vault.state).toBe(VaultState.Accessed);

    // Seal mutated to accessed
    expect(
      AccessSeal.verifyPristine(ctx.treeSeed, ctx.internals.accessSeal),
    ).toBe(false);
    expect(
      AccessSeal.verifyAccessed(ctx.treeSeed, ctx.internals.accessSeal),
    ).toBe(true);

    // Ledger has new entries: vault_read_requested + key_released
    expect(ledger.length).toBe(entriesBefore + 2);

    // Non-access verification now FAILS (vault was read)
    const nonAccess2 = await verifier.verifyNonAccess(
      ctx.creationHash,
      ctx.internals.accessSeal,
      ctx.treeSeed,
    );
    expect(nonAccess2.nonAccessConfirmed).toBe(false);
    expect(nonAccess2.sealStatus).toBe('accessed');
    expect(nonAccess2.ledgerReadCount).toBeGreaterThanOrEqual(1);
    expect(nonAccess2.consistent).toBe(true); // accessed seal + ledger reads = consistent

    // ── Step 3: Second read (seal stays accessed) ───────────────
    const entriesBefore2 = ledger.length;
    await ctx.vault.read(ctx.requesterPublicKey, ctx.adminSignatures);
    expect(ctx.vault.state).toBe(VaultState.Accessed);
    expect(
      AccessSeal.verifyAccessed(ctx.treeSeed, ctx.internals.accessSeal),
    ).toBe(true);
    // More ledger entries added
    expect(ledger.length).toBeGreaterThan(entriesBefore2);

    // ── Step 4: Destroy the vault ───────────────────────────────
    const engine = new DestructionEngine(
      ecies,
      ledger.gateway as unknown as import('../ledger/ledger-gateway').LedgerGateway,
    );
    const proof = await engine.destroy(
      ctx.vault,
      ctx.creatorPrivateKey,
      ctx.requesterPublicKey,
      ctx.adminSignatures,
    );

    // Vault is destroyed
    expect(ctx.vault.state).toBe(VaultState.Destroyed);

    // Proof has valid structure
    expect(proof.treeSeed.length).toBe(32);
    expect(proof.nonce.length).toBe(32);
    expect(proof.signature).toBeInstanceOf(Uint8Array);
    expect(proof.creatorPublicKey.length).toBe(33);

    // ── Step 5: Verify destruction proof ────────────────────────
    const proofVerifier = new ProofVerifier(ecies);
    // Bundle uses the ACCESSED seal (vault was read before destruction)
    const bundleForVerification: IVerificationBundle = {
      ...ctx.verificationBundle,
      accessSeal: new Uint8Array(ctx.internals.accessSeal),
    };
    const proofResult = proofVerifier.verify(proof, bundleForVerification);

    expect(proofResult.valid).toBe(true);
    expect(proofResult.signatureValid).toBe(true);
    expect(proofResult.chainValid).toBe(true);
    expect(proofResult.timestampValid).toBe(true);
    expect(proofResult.sealStatus).toBe('accessed'); // was read before destruction

    // ── Step 6: All operations rejected after destruction ───────
    await expect(
      ctx.vault.read(ctx.requesterPublicKey, ctx.adminSignatures),
    ).rejects.toThrow(VaultDestroyedError);
  });

  it('create → destroy without reading → proof shows pristine seal', async () => {
    const ledger = createLiveLedger();
    const ctx = await createFullVault(ledger);

    // Verify pristine before destruction
    expect(ctx.vault.state).toBe(VaultState.Sealed);
    expect(
      AccessSeal.verifyPristine(ctx.treeSeed, ctx.internals.accessSeal),
    ).toBe(true);

    // Non-access confirmed
    const verifier = new LedgerVerifier(
      ledger.verifierLedger as unknown as Ledger,
    );
    const nonAccess = await verifier.verifyNonAccess(
      ctx.creationHash,
      ctx.internals.accessSeal,
      ctx.treeSeed,
    );
    expect(nonAccess.nonAccessConfirmed).toBe(true);

    // Destroy without ever reading
    const engine = new DestructionEngine(
      ecies,
      ledger.gateway as unknown as import('../ledger/ledger-gateway').LedgerGateway,
    );
    const proof = await engine.destroy(
      ctx.vault,
      ctx.creatorPrivateKey,
      ctx.requesterPublicKey,
      ctx.adminSignatures,
    );

    // Verify proof — seal status should be PRISTINE (never read)
    const proofVerifier = new ProofVerifier(ecies);
    const result = proofVerifier.verify(proof, ctx.verificationBundle);

    expect(result.valid).toBe(true);
    expect(result.sealStatus).toBe('pristine');
    expect(result.signatureValid).toBe(true);
    expect(result.chainValid).toBe(true);
  });

  it('snapshot-restore attack: revert seal after read → ledger detects inconsistency', async () => {
    const ledger = createLiveLedger();
    const ctx = await createFullVault(ledger);

    // Save pristine seal
    const pristineSealCopy = new Uint8Array(ctx.internals.accessSeal);

    // Read the vault (seal mutates, ledger records read + key_released)
    await ctx.vault.read(ctx.requesterPublicKey, ctx.adminSignatures);
    expect(
      AccessSeal.verifyAccessed(ctx.treeSeed, ctx.internals.accessSeal),
    ).toBe(true);

    // ATTACK: Restore the seal to pristine (simulating byte-level restore)
    ctx.internals.accessSeal.set(pristineSealCopy);
    expect(
      AccessSeal.verifyPristine(ctx.treeSeed, ctx.internals.accessSeal),
    ).toBe(true);

    // Ledger still has the read entries — can't be erased
    const verifier = new LedgerVerifier(
      ledger.verifierLedger as unknown as Ledger,
    );
    const result = await verifier.verifyNonAccess(
      ctx.creationHash,
      ctx.internals.accessSeal,
      ctx.treeSeed,
    );

    // DETECTED: seal says pristine but ledger says read happened
    expect(result.nonAccessConfirmed).toBe(false);
    expect(result.sealStatus).toBe('pristine');
    expect(result.consistent).toBe(false);
    expect(result.ledgerReadCount).toBeGreaterThanOrEqual(1);
    expect(result.error).toBeDefined();
  });

  it('destruction proof for vault A fails against vault B bundle (replay rejection)', async () => {
    const ledger = createLiveLedger();
    const ctxA = await createFullVault(ledger);
    const ctxB = await createFullVault(ledger);

    // Destroy vault A
    const engine = new DestructionEngine(
      ecies,
      ledger.gateway as unknown as import('../ledger/ledger-gateway').LedgerGateway,
    );
    const proofA = await engine.destroy(
      ctxA.vault,
      ctxA.creatorPrivateKey,
      ctxA.requesterPublicKey,
      ctxA.adminSignatures,
    );

    // Verify proof A against vault A's bundle → should pass
    const proofVerifier = new ProofVerifier(ecies);
    const validResult = proofVerifier.verify(proofA, ctxA.verificationBundle);
    expect(validResult.valid).toBe(true);

    // Verify proof A against vault B's bundle → should FAIL (replay)
    const replayResult = proofVerifier.verify(proofA, ctxB.verificationBundle);
    expect(replayResult.valid).toBe(false);
    expect(replayResult.chainValid).toBe(false); // Merkle root mismatch
  });

  it('tampered proof fields are individually detected', async () => {
    const ledger = createLiveLedger();
    const ctx = await createFullVault(ledger);

    const engine = new DestructionEngine(
      ecies,
      ledger.gateway as unknown as import('../ledger/ledger-gateway').LedgerGateway,
    );
    const proof = await engine.destroy(
      ctx.vault,
      ctx.creatorPrivateKey,
      ctx.requesterPublicKey,
      ctx.adminSignatures,
    );

    const proofVerifier = new ProofVerifier(ecies);

    // Valid proof passes
    const valid = proofVerifier.verify(proof, ctx.verificationBundle);
    expect(valid.valid).toBe(true);

    // Tamper: tree seed
    const tamperedSeed = { ...proof, treeSeed: new Uint8Array(32).fill(0xff) };
    const r1 = proofVerifier.verify(tamperedSeed, ctx.verificationBundle);
    expect(r1.valid).toBe(false);
    expect(r1.chainValid).toBe(false);

    // Tamper: nonce (changes signed message → signature fails)
    const tamperedNonce = { ...proof, nonce: new Uint8Array(32).fill(0xee) };
    const r2 = proofVerifier.verify(tamperedNonce, ctx.verificationBundle);
    expect(r2.valid).toBe(false);
    expect(r2.signatureValid).toBe(false);

    // Tamper: signature
    const tamperedSig = {
      ...proof,
      signature: new Uint8Array(proof.signature.length).fill(0x00),
    };
    const r3 = proofVerifier.verify(tamperedSig, ctx.verificationBundle);
    expect(r3.valid).toBe(false);
    expect(r3.signatureValid).toBe(false);

    // Tamper: timestamp (far future)
    const tamperedTs = { ...proof, timestamp: Date.now() + 999_999_999 };
    const r4 = proofVerifier.verify(tamperedTs, ctx.verificationBundle);
    expect(r4.valid).toBe(false);
    expect(r4.timestampValid).toBe(false);

    // Tamper: creator public key in bundle
    const wrongKey = ecies.getPublicKey(ecies.core.generatePrivateKey());
    const tamperedBundle = {
      ...ctx.verificationBundle,
      creatorPublicKey: wrongKey,
    };
    const r5 = proofVerifier.verify(proof, tamperedBundle);
    expect(r5.valid).toBe(false);
    expect(r5.signatureValid).toBe(false);
  });

  it('Merkle proof selective disclosure works for any leaf', async () => {
    const ledger = createLiveLedger();
    const ctx = await createFullVault(ledger);

    // Verify proofs for first, last, and a middle leaf
    const indices = [
      0,
      Math.floor(2 ** ctx.tree.depth / 2),
      2 ** ctx.tree.depth - 1,
    ];
    for (const idx of indices) {
      const proof = MerkleCommitmentTree.generateProof(ctx.tree, idx);
      expect(MerkleCommitmentTree.verifyProof(proof, ctx.tree.root)).toBe(true);

      // Tamper with a sibling → verification fails
      const tampered = {
        ...proof,
        siblings: proof.siblings.map((s, i) =>
          i === 0 ? new Uint8Array(s.length).fill(0xdd) : s,
        ),
      };
      expect(MerkleCommitmentTree.verifyProof(tampered, ctx.tree.root)).toBe(
        false,
      );
    }
  });

  it('memory erasure zeros sensitive buffers', () => {
    const buf = new Uint8Array(64);
    crypto.getRandomValues(buf);
    // Confirm it's not all zeros
    expect(buf.some((b) => b !== 0)).toBe(true);

    MemoryEraser.wipe(buf);

    // Every byte should be zero
    for (let i = 0; i < buf.length; i++) {
      expect(buf[i]).toBe(0);
    }
  });

  it('seal forgery: random seed does not match stored seal', async () => {
    const ledger = createLiveLedger();
    const ctx = await createFullVault(ledger);

    // Try 10 random seeds — none should match the pristine seal
    for (let attempt = 0; attempt < 10; attempt++) {
      const fakeSeed = new Uint8Array(32);
      crypto.getRandomValues(fakeSeed);
      expect(
        AccessSeal.verifyPristine(fakeSeed, ctx.internals.accessSeal),
      ).toBe(false);
      expect(
        AccessSeal.verifyAccessed(fakeSeed, ctx.internals.accessSeal),
      ).toBe(false);
    }
  });

  it('ledger entry counts are correct through full lifecycle', async () => {
    const ledger = createLiveLedger();
    const ctx = await createFullVault(ledger);

    // After creation: 1 entry (vault_created)
    expect(ledger.length).toBe(1);

    // Read #1: +2 entries (vault_read_requested + key_released)
    await ctx.vault.read(ctx.requesterPublicKey, ctx.adminSignatures);
    expect(ledger.length).toBe(3);

    // Read #2: +2 more entries
    await ctx.vault.read(ctx.requesterPublicKey, ctx.adminSignatures);
    expect(ledger.length).toBe(5);

    // Destroy: +1 entry (vault_destroyed) + 1 (key_released for destruction)
    const engine = new DestructionEngine(
      ecies,
      ledger.gateway as unknown as import('../ledger/ledger-gateway').LedgerGateway,
    );
    const entriesBefore = ledger.length;
    await engine.destroy(
      ctx.vault,
      ctx.creatorPrivateKey,
      ctx.requesterPublicKey,
      ctx.adminSignatures,
    );
    // At least vault_destroyed + key_released
    expect(ledger.length).toBeGreaterThanOrEqual(entriesBefore + 2);

    // Vault is destroyed — no more operations possible
    expect(ctx.vault.state).toBe(VaultState.Destroyed);
  });
});
