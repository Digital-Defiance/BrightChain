/**
 * Property-based tests for Ledger Merkle integration.
 *
 * Property 10 from the design document: Chain Validator Merkle Root Verification.
 * Uses fast-check with minimum 100 iterations.
 *
 * @see Design: Merkle Tree Commitment Layer — Correctness Properties
 */

import * as fc from 'fast-check';
import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../../enumerations/blockSize';
import { ILedgerSigner } from '../../interfaces/ledger/ledgerSigner';
import { ChecksumService } from '../../services/checksum.service';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { IncrementalMerkleTree } from '../incrementalMerkleTree';
import { Ledger } from '../ledger';
import { LedgerEntrySerializer } from '../ledgerEntrySerializer';

// ── Helpers ─────────────────────────────────────────────────────────

const mockSigner: ILedgerSigner = {
  publicKey: new Uint8Array(33).fill(0x02),
  sign: (_data: Uint8Array) =>
    new Uint8Array(64).fill(0xaa) as SignatureUint8Array,
};

function createLedger() {
  const store = new MemoryBlockStore(BlockSize.Small);
  const serializer = new LedgerEntrySerializer(new ChecksumService());
  const ledger = new Ledger(store, BlockSize.Small, serializer, 'pbt-merkle');
  return { store, serializer, ledger };
}

// ── Property Tests ───────────────────────────────────────────────────

describe('Ledger Merkle PBT', () => {
  /**
   * Feature: block-chain-ledger-merkle-upgrade, Property 10: Chain Validator Merkle Root Verification
   *
   * For any list of N entries (1-10) appended to a ledger, the Merkle root
   * computed from the entry hashes via IncrementalMerkleTree.fromLeaves()
   * matches the ledger's stored merkleRoot.
   *
   * This validates that the incremental Merkle tree maintained by the Ledger
   * produces the same root as batch construction from entry hashes.
   *
   * **Validates: Requirements 11.1**
   */
  it('Property 10: Chain Validator Merkle Root Verification', async () => {
    const cs = new ChecksumService();

    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uint8Array({ minLength: 1, maxLength: 100 }), {
          minLength: 1,
          maxLength: 10,
        }),
        async (payloads) => {
          // Create a fresh ledger for each test run
          const { ledger } = createLedger();

          // Collect entry hashes as we append
          const entryHashes = [];

          for (const payload of payloads) {
            await ledger.append(payload, mockSigner);
            // Read back the entry to get its entryHash
            const entry = await ledger.getEntry(entryHashes.length);
            entryHashes.push(entry.entryHash);
          }

          // Verify ledger has the expected length
          expect(ledger.length).toBe(payloads.length);
          expect(ledger.merkleRoot).not.toBeNull();

          // Reconstruct Merkle root from entry hashes via batch construction
          const batchTree = IncrementalMerkleTree.fromLeaves(entryHashes, cs);
          const batchRoot = batchTree.root;

          // The ledger's stored merkleRoot must match the batch-constructed root
          expect(ledger.merkleRoot!.equals(batchRoot)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
