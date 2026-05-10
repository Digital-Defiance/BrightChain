import {
  AESGCMService,
  ECIESService,
  Pbkdf2Service,
} from '@digitaldefiance/ecies-lib';
import { AccessSeal } from '../crypto/access-seal';
import { DestructionEngine } from '../crypto/destruction-engine';
import { MerkleCommitmentTree } from '../crypto/merkle-commitment-tree';
import { ProofVerifier } from '../crypto/proof-verifier';
import { Vault } from '../crypto/vault';
import { VaultState } from '../enumerations/vault-state';
import { VaultDestroyedError } from '../errors';
import type { IAdminSignature, IRecipe, IVaultInternals } from '../interfaces';
import { RecipeSerializer } from '../serialization/recipe-serializer';

const ecies = new ECIESService();
const aesGcm = new AESGCMService();
const pbkdf2 = new Pbkdf2Service();

async function createVaultForDestruction() {
  const treeSeed = new Uint8Array(32);
  crypto.getRandomValues(treeSeed);

  const salt = new Uint8Array(32);
  crypto.getRandomValues(salt);
  const pbkdf2Result = await pbkdf2.deriveKeyFromPasswordAsync(treeSeed, salt);
  const derivedKey = pbkdf2Result.hash;

  const recipe: IRecipe = {
    blockIds: [new Uint8Array(16).fill(0xbb)],
    totalBlockCount: 1,
  };
  const serializedRecipe = RecipeSerializer.serialize(recipe);

  const encryptionKey = new Uint8Array(32);
  crypto.getRandomValues(encryptionKey);
  const payload = new Uint8Array(
    4 + encryptionKey.length + serializedRecipe.length,
  );
  new DataView(payload.buffer).setUint32(0, encryptionKey.length, false);
  payload.set(encryptionKey, 4);
  payload.set(serializedRecipe, 4 + encryptionKey.length);

  const encrypted = await aesGcm.encrypt(payload, derivedKey, true);

  const treeDepth = 8; // minimum for speed
  const tree = MerkleCommitmentTree.build(treeSeed, treeDepth);
  const accessSeal = AccessSeal.derive(treeSeed, AccessSeal.PRISTINE_DOMAIN);

  const custodianPrivateKey = ecies.core.generatePrivateKey();
  const custodianPublicKey = ecies.getPublicKey(custodianPrivateKey);
  const encryptedTreeSeed = await ecies.encryptBasic(
    custodianPublicKey,
    treeSeed,
  );

  const creatorPrivateKey = ecies.core.generatePrivateKey();
  const creatorPublicKey = ecies.getPublicKey(creatorPrivateKey);

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
    merkleRoot: tree.root,
    treeDepth,
    accessSeal: new Uint8Array(accessSeal),
    state: VaultState.Sealed,
  };

  const ledgerEntries: Uint8Array[] = [];
  const ledgerGateway = {
    async recordRead() {
      return new Uint8Array(64);
    },
    async recordCreation() {
      return new Uint8Array(64);
    },
    async recordDestruction() {
      const hash = new Uint8Array(64);
      crypto.getRandomValues(hash);
      ledgerEntries.push(hash);
      return hash;
    },
    async validateLedgerReference() {
      return true;
    },
  };

  const custodian: import('../interfaces').ICustodian = {
    async encryptTreeSeed(seed: Uint8Array) {
      return {
        encryptedTreeSeed: seed,
        custodialPublicKey: custodianPublicKey,
      };
    },
    async requestKeyRelease(_hash: Uint8Array, encSeed: Uint8Array) {
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
    tree,
    creatorPrivateKey,
    creatorPublicKey,
    accessSeal: new Uint8Array(accessSeal),
    treeDepth,
    ledgerGateway,
    ledgerEntries,
    adminSignatures: [
      { signerPublicKey: adminPublicKey, signature: adminSignature },
    ] as IAdminSignature[],
    requesterPublicKey,
  };
}

describe('DestructionEngine & ProofVerifier', () => {
  // Feature: digital-burn-bag, Property 7: Destruction proof verification round-trip
  // Validates: Requirements 5.1, 5.3, 5.5, 6.1, 6.2, 6.3
  it('Property 7: destroy produces a valid proof that verifies against the bundle', async () => {
    const ctx = await createVaultForDestruction();

    const engine = new DestructionEngine(
      ecies,
      ctx.ledgerGateway as unknown as import('../ledger-gateway').LedgerGateway,
    );

    const proof = await engine.destroy(
      ctx.vault,
      ctx.creatorPrivateKey,
      ctx.requesterPublicKey,
      ctx.adminSignatures,
    );

    // Vault is now destroyed
    expect(ctx.vault.state).toBe(VaultState.Destroyed);

    // Proof has expected fields
    expect(proof.treeSeed).toBeInstanceOf(Uint8Array);
    expect(proof.treeSeed.length).toBe(32);
    expect(proof.nonce.length).toBe(32);
    expect(proof.signature).toBeInstanceOf(Uint8Array);
    expect(proof.creatorPublicKey.length).toBe(33);

    // Build verification bundle
    const bundle = {
      version: 1,
      merkleRoot: ctx.tree.root,
      accessSeal: ctx.accessSeal,
      creatorPublicKey: ctx.creatorPublicKey,
      bloomWitness: new Uint8Array(0),
      treeDepth: ctx.treeDepth,
    };

    // Verify proof
    const verifier = new ProofVerifier(ecies);
    const result = verifier.verify(proof, bundle);

    expect(result.valid).toBe(true);
    expect(result.signatureValid).toBe(true);
    expect(result.chainValid).toBe(true);
    expect(result.timestampValid).toBe(true);
    expect(result.sealStatus).toBe('pristine');
  });

  // Feature: digital-burn-bag, Property 8: Corrupted proof fails verification
  // Validates: Requirements 6.4, 6.5
  it('Property 8: modifying any proof field causes verification failure', async () => {
    const ctx = await createVaultForDestruction();

    const engine = new DestructionEngine(
      ecies,
      ctx.ledgerGateway as unknown as import('../ledger-gateway').LedgerGateway,
    );

    const proof = await engine.destroy(
      ctx.vault,
      ctx.creatorPrivateKey,
      ctx.requesterPublicKey,
      ctx.adminSignatures,
    );

    const bundle = {
      version: 1,
      merkleRoot: ctx.tree.root,
      accessSeal: ctx.accessSeal,
      creatorPublicKey: ctx.creatorPublicKey,
      bloomWitness: new Uint8Array(0),
      treeDepth: ctx.treeDepth,
    };

    const verifier = new ProofVerifier(ecies);

    // Corrupt treeSeed
    const corruptedSeed = { ...proof, treeSeed: new Uint8Array(32) };
    const r1 = verifier.verify(corruptedSeed, bundle);
    expect(r1.valid).toBe(false);

    // Corrupt nonce
    const corruptedNonce = {
      ...proof,
      nonce: new Uint8Array(32).fill(0xff),
    };
    const r2 = verifier.verify(corruptedNonce, bundle);
    expect(r2.valid).toBe(false);

    // Corrupt signature
    const corruptedSig = {
      ...proof,
      signature: new Uint8Array(proof.signature.length).fill(0x00),
    };
    const r3 = verifier.verify(corruptedSig, bundle);
    expect(r3.valid).toBe(false);
    expect(r3.signatureValid).toBe(false);
  });

  // Destroyed vault rejects destroy
  it('destroy on already-destroyed vault throws VaultDestroyedError', async () => {
    const ctx = await createVaultForDestruction();
    ctx.vault.markDestroyed();

    const engine = new DestructionEngine(
      ecies,
      ctx.ledgerGateway as unknown as import('../ledger-gateway').LedgerGateway,
    );

    await expect(
      engine.destroy(
        ctx.vault,
        ctx.creatorPrivateKey,
        ctx.requesterPublicKey,
        ctx.adminSignatures,
      ),
    ).rejects.toThrow(VaultDestroyedError);
  });
});
