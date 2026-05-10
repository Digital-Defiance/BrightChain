import { ECIESService } from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import { AccessSeal } from '../crypto/access-seal';
import { MerkleCommitmentTree } from '../crypto/merkle-commitment-tree';
import { ProofVerifier } from '../crypto/proof-verifier';
import type { IDestructionProof, IVerificationBundle } from '../interfaces';
import { arbProofFieldMutation, arbTreeSeed } from './arbitraries';

const ecies = new ECIESService();

/** Helper: create a valid proof + bundle pair for testing */
function createValidProofAndBundle() {
  const creatorPrivateKey = ecies.core.generatePrivateKey();
  const creatorPublicKey = ecies.getPublicKey(creatorPrivateKey);

  const treeSeed = new Uint8Array(32);
  crypto.getRandomValues(treeSeed);
  const treeDepth = 8;
  const merkleRoot = MerkleCommitmentTree.computeRoot(treeSeed, treeDepth);
  const accessSeal = AccessSeal.derive(treeSeed, AccessSeal.PRISTINE_DOMAIN);

  const nonce = new Uint8Array(32);
  crypto.getRandomValues(nonce);
  const timestamp = Date.now();

  const message = new Uint8Array(32 + 32 + 8);
  message.set(treeSeed, 0);
  message.set(nonce, 32);
  const tsView = new DataView(message.buffer, 64, 8);
  tsView.setUint32(0, Math.floor(timestamp / 0x100000000), false);
  tsView.setUint32(4, timestamp >>> 0, false);

  const signature = ecies.signMessage(creatorPrivateKey, message);

  const proof: IDestructionProof = {
    treeSeed: new Uint8Array(treeSeed),
    nonce,
    timestamp,
    signature,
    creatorPublicKey,
  };

  const bundle: IVerificationBundle = {
    version: 1,
    merkleRoot,
    accessSeal,
    creatorPublicKey,
    bloomWitness: new Uint8Array(0),
    treeDepth,
  };

  return { proof, bundle };
}

describe('Adversarial Tests', () => {
  // Feature: digital-burn-bag, Property 23: Destruction proof replay rejection
  // Validates: Requirements 19.1, 19.2, 19.3
  it('Property 23: replayed proof with future timestamp is rejected', () => {
    const { proof, bundle } = createValidProofAndBundle();
    const verifier = new ProofVerifier(ecies);

    // Valid proof passes
    const validResult = verifier.verify(proof, bundle);
    expect(validResult.valid).toBe(true);

    // Replay with far-future timestamp fails
    const replayedProof: IDestructionProof = {
      ...proof,
      timestamp: Date.now() + 600_000, // 10 minutes in the future
    };
    const replayResult = verifier.verify(replayedProof, bundle);
    // Signature won't match because timestamp changed
    expect(replayResult.valid).toBe(false);
  });

  it('Property 23: proof with different nonce but same seed fails signature', () => {
    const { proof, bundle } = createValidProofAndBundle();
    const verifier = new ProofVerifier(ecies);

    const differentNonce = new Uint8Array(32);
    crypto.getRandomValues(differentNonce);
    const replayedProof: IDestructionProof = {
      ...proof,
      nonce: differentNonce,
    };
    const result = verifier.verify(replayedProof, bundle);
    expect(result.valid).toBe(false);
    expect(result.signatureValid).toBe(false);
  });

  // Feature: digital-burn-bag, Property 27: Destruction proof field-level tamper evidence
  // Validates: Requirements 23.1, 23.2, 23.3, 23.4, 23.5
  it('Property 27: mutating any single proof field causes verification failure', () => {
    fc.assert(
      fc.property(arbProofFieldMutation, (field) => {
        const { proof, bundle } = createValidProofAndBundle();
        const verifier = new ProofVerifier(ecies);

        // Verify original is valid
        const original = verifier.verify(proof, bundle);
        expect(original.valid).toBe(true);

        // Mutate the specified field
        const tampered = { ...proof };
        switch (field) {
          case 'treeSeed':
            tampered.treeSeed = new Uint8Array(32);
            crypto.getRandomValues(tampered.treeSeed);
            break;
          case 'nonce':
            tampered.nonce = new Uint8Array(32);
            crypto.getRandomValues(tampered.nonce);
            break;
          case 'timestamp':
            tampered.timestamp = proof.timestamp + 1;
            break;
          case 'signature':
            tampered.signature = new Uint8Array(proof.signature.length);
            crypto.getRandomValues(tampered.signature);
            break;
        }

        const result = verifier.verify(tampered, bundle);
        expect(result.valid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: digital-burn-bag, Property 28: Commitment scheme brute-force resistance
  // Validates: Requirements 24.1, 24.2, 24.3, 24.4
  it('Property 28: random seeds never produce the same Merkle root', () => {
    fc.assert(
      fc.property(arbTreeSeed, arbTreeSeed, (seedA, seedB) => {
        // Skip if seeds happen to be identical
        let same = true;
        for (let i = 0; i < 32; i++) {
          if (seedA[i] !== seedB[i]) {
            same = false;
            break;
          }
        }
        if (same) return; // trivially true

        const rootA = MerkleCommitmentTree.computeRoot(seedA, 8);
        const rootB = MerkleCommitmentTree.computeRoot(seedB, 8);

        // Roots must differ
        let differ = false;
        for (let i = 0; i < rootA.length; i++) {
          if (rootA[i] !== rootB[i]) {
            differ = true;
            break;
          }
        }
        expect(differ).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: digital-burn-bag, Property 25: Ledger chain integrity under tampering
  // Validates: Requirements 21.1, 21.2, 21.3, 21.4, 21.5
  it('Property 25: modifying a ledger entry payload is detectable via hash mismatch', () => {
    fc.assert(
      fc.property(arbTreeSeed, (seed) => {
        // Simulate a mini ledger: 3 entries, each hashing the previous
        const entries: Array<{ payload: Uint8Array; hash: Uint8Array }> = [];

        // Entry 0: vault_created
        const payload0 = new Uint8Array([
          ...new TextEncoder().encode('vault_created'),
          ...seed,
        ]);
        const hash0 = MerkleCommitmentTree.computeRoot(payload0, 8);
        entries.push({ payload: payload0, hash: hash0 });

        // Entry 1: vault_read_requested, chained to entry 0
        const payload1 = new Uint8Array([
          ...new TextEncoder().encode('vault_read_requested'),
          ...hash0,
        ]);
        const hash1 = MerkleCommitmentTree.computeRoot(payload1, 8);
        entries.push({ payload: payload1, hash: hash1 });

        // Entry 2: vault_destroyed, chained to entry 0
        const payload2 = new Uint8Array([
          ...new TextEncoder().encode('vault_destroyed'),
          ...hash0,
        ]);
        const hash2 = MerkleCommitmentTree.computeRoot(payload2, 8);
        entries.push({ payload: payload2, hash: hash2 });

        // Verify chain is valid: recomputing each hash matches
        for (const entry of entries) {
          const recomputed = MerkleCommitmentTree.computeRoot(entry.payload, 8);
          let match = true;
          for (let i = 0; i < recomputed.length; i++) {
            if (recomputed[i] !== entry.hash[i]) {
              match = false;
              break;
            }
          }
          expect(match).toBe(true);
        }

        // Tamper with entry 1's payload (flip a byte)
        const tamperedPayload = new Uint8Array(entries[1].payload);
        tamperedPayload[0] ^= 0xff;
        const tamperedHash = MerkleCommitmentTree.computeRoot(
          tamperedPayload,
          8,
        );

        // Tampered hash must NOT match original
        let hashMatch = true;
        for (let i = 0; i < tamperedHash.length; i++) {
          if (tamperedHash[i] !== entries[1].hash[i]) {
            hashMatch = false;
            break;
          }
        }
        expect(hashMatch).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
