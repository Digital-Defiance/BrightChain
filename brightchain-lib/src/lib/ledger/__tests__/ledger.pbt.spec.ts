/**
 * Property-based tests for the Ledger class.
 *
 * Feature: block-chain-ledger, Property 3: Signature Validity
 *
 * For any entry produced by Ledger.append(), verifying the signature against
 * signerPublicKey and entryHash returns true. Since we use mock signers (not
 * real SECP256k1 keys), we verify that:
 *   - The entry's signature matches signer.sign(entryHash.toUint8Array())
 *   - The entry's signerPublicKey matches the signer's publicKey
 *   - The entry's entryHash equals serializer.computeEntryHash(entry fields)
 *
 * **Validates: Requirements 1.4, 3.2**
 */
import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';

import { BlockSize } from '../../enumerations/blockSize';
import { ILedgerSigner } from '../../interfaces/ledger/ledgerSigner';
import { ChecksumService } from '../../services/checksum.service';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { Ledger } from '../ledger';
import { LedgerEntrySerializer } from '../ledgerEntrySerializer';

jest.setTimeout(120_000);

// ---------------------------------------------------------------------------
// Shared services
// ---------------------------------------------------------------------------

const checksumService = new ChecksumService();
const serializer = new LedgerEntrySerializer(checksumService);

// ---------------------------------------------------------------------------
// Custom Generators
// ---------------------------------------------------------------------------

/**
 * Generate an array of 1..maxCount random Uint8Array payloads,
 * each up to maxSize bytes.
 */
function arbPayloads(
  maxCount: number,
  maxSize: number,
): fc.Arbitrary<Uint8Array[]> {
  return fc.array(
    fc
      .array(fc.integer({ min: 0, max: 255 }), {
        minLength: 1,
        maxLength: maxSize,
      })
      .map((arr) => new Uint8Array(arr)),
    { minLength: 1, maxLength: maxCount },
  );
}

/**
 * Create a deterministic mock signer from a seed byte array.
 * The signer produces signatures by XOR-ing the input data hash with the
 * seed, ensuring different signers produce different signatures and the
 * same signer produces the same signature for the same input.
 */
function createMockSigner(seedBytes: Uint8Array): ILedgerSigner {
  // Build a 33-byte compressed public key from the seed
  const publicKey = new Uint8Array(33);
  publicKey[0] = 0x02; // compressed key prefix
  for (let i = 0; i < Math.min(seedBytes.length, 32); i++) {
    publicKey[i + 1] = seedBytes[i];
  }

  return {
    publicKey,
    sign(data: Uint8Array): SignatureUint8Array {
      // Deterministic 64-byte signature: XOR each byte of data (cycled)
      // with the seed (cycled), producing a repeatable result for the
      // same (seed, data) pair.
      const sig = new Uint8Array(64);
      for (let i = 0; i < 64; i++) {
        const dataByte = data.length > 0 ? data[i % data.length] : 0;
        const seedByte =
          seedBytes.length > 0 ? seedBytes[i % seedBytes.length] : 0;
        sig[i] = dataByte ^ seedByte;
      }
      return sig as SignatureUint8Array;
    },
  };
}

/** Generate a random seed for a mock signer (4–32 bytes). */
function arbSignerSeed(): fc.Arbitrary<Uint8Array> {
  return fc
    .array(fc.integer({ min: 0, max: 255 }), {
      minLength: 4,
      maxLength: 32,
    })
    .map((arr) => new Uint8Array(arr));
}

// ---------------------------------------------------------------------------
// Property 3 Tests
// ---------------------------------------------------------------------------

// Feature: block-chain-ledger, Property 3: Signature Validity
describe('Feature: block-chain-ledger, Property 3: Signature Validity', () => {
  /**
   * **Validates: Requirements 1.4, 3.2**
   *
   * For any sequence of random payloads appended to a Ledger using a mock
   * signer, each resulting entry's:
   *   1. signature === signer.sign(entryHash.toUint8Array())
   *   2. signerPublicKey === signer.publicKey
   *   3. entryHash === serializer.computeEntryHash(entry fields)
   */
  it('every appended entry has a valid signature matching signer.sign(entryHash)', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSignerSeed(),
        arbPayloads(5, 64),
        async (seed, payloads) => {
          const store = new MemoryBlockStore(BlockSize.Small);
          const ledger = new Ledger(
            store,
            BlockSize.Small,
            serializer,
            'pbt-sig-validity',
          );
          const signer = createMockSigner(seed);

          for (let i = 0; i < payloads.length; i++) {
            await ledger.append(payloads[i], signer);

            const entry = await ledger.getEntry(i);

            // 1. signerPublicKey must match the signer's publicKey
            expect(entry.signerPublicKey).toEqual(signer.publicKey);

            // 2. entryHash must be consistent with the serializer
            const recomputedHash = serializer.computeEntryHash({
              sequenceNumber: entry.sequenceNumber,
              timestamp: entry.timestamp,
              previousEntryHash: entry.previousEntryHash,
              signerPublicKey: entry.signerPublicKey,
              payload: entry.payload,
            });
            expect(entry.entryHash.equals(recomputedHash)).toBe(true);

            // 3. signature must equal signer.sign(entryHash bytes)
            const expectedSignature = signer.sign(
              entry.entryHash.toUint8Array(),
            );
            expect(entry.signature).toEqual(expectedSignature);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4 Tests
// ---------------------------------------------------------------------------

// Feature: block-chain-ledger, Property 4: Chain Link Integrity
describe('Feature: block-chain-ledger, Property 4: Chain Link Integrity', () => {
  /**
   * **Validates: Requirements 1.2, 4.1, 4.2, 4.5, 4.6, 5.1**
   *
   * For any sequence of 1–8 random payloads appended to a Ledger:
   *   1. entry[0].previousEntryHash === null
   *   2. entry[0].sequenceNumber === 0
   *   3. For i > 0: entry[i].previousEntryHash equals entry[i-1].entryHash
   *   4. For all i: entry[i].sequenceNumber === i
   *   5. Sequence numbers are contiguous 0..N-1
   */
  it('chain links are correctly formed: previousEntryHash chains and contiguous sequenceNumbers', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSignerSeed(),
        arbPayloads(8, 64),
        async (seed, payloads) => {
          const store = new MemoryBlockStore(BlockSize.Small);
          const ledger = new Ledger(
            store,
            BlockSize.Small,
            serializer,
            'pbt-chain-link',
          );
          const signer = createMockSigner(seed);

          // Append all payloads
          for (const payload of payloads) {
            await ledger.append(payload, signer);
          }

          // Retrieve all entries
          const entries = await ledger.getEntries(0, payloads.length - 1);

          // 1. Genesis entry has null previousEntryHash
          expect(entries[0].previousEntryHash).toBeNull();

          // 2. Genesis entry has sequenceNumber 0
          expect(entries[0].sequenceNumber).toBe(0);

          // 3 & 4. Walk the chain verifying links and sequence numbers
          for (let i = 0; i < entries.length; i++) {
            // sequenceNumber === i
            expect(entries[i].sequenceNumber).toBe(i);

            if (i > 0) {
              // previousEntryHash links to prior entry's entryHash
              expect(entries[i].previousEntryHash).not.toBeNull();
              expect(
                entries[i].previousEntryHash!.equals(entries[i - 1].entryHash),
              ).toBe(true);
            }
          }

          // 5. Verify contiguous 0..N-1
          const sequenceNumbers = entries.map((e) => e.sequenceNumber);
          const expected = Array.from({ length: payloads.length }, (_, i) => i);
          expect(sequenceNumbers).toEqual(expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5 Tests
// ---------------------------------------------------------------------------

// Feature: block-chain-ledger, Property 5: Append-Then-Read Round-Trip
describe('Feature: block-chain-ledger, Property 5: Append-Then-Read Round-Trip', () => {
  /**
   * **Validates: Requirements 5.3, 5.4, 6.1, 6.2, 6.6**
   *
   * For any sequence of 1–8 random payloads appended to a Ledger:
   *   1. getEntry(i).payload equals the i-th appended payload
   *   2. getEntries(0, N-1) returns entries in order with matching payloads
   *   3. getLatestEntry() returns the entry with the highest sequenceNumber (N-1)
   */
  it('appended payloads are retrievable via getEntry, getEntries, and getLatestEntry', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSignerSeed(),
        arbPayloads(8, 64),
        async (seed, payloads) => {
          const store = new MemoryBlockStore(BlockSize.Small);
          const ledger = new Ledger(
            store,
            BlockSize.Small,
            serializer,
            'pbt-append-read',
          );
          const signer = createMockSigner(seed);

          // Append all payloads
          for (const payload of payloads) {
            await ledger.append(payload, signer);
          }

          const N = payloads.length;

          // 1. getEntry(i).payload equals the i-th appended payload
          for (let i = 0; i < N; i++) {
            const entry = await ledger.getEntry(i);
            expect(entry.payload).toEqual(payloads[i]);
          }

          // 2. getEntries(0, N-1) returns entries in order with matching payloads
          const entries = await ledger.getEntries(0, N - 1);
          expect(entries).toHaveLength(N);
          for (let i = 0; i < N; i++) {
            expect(entries[i].payload).toEqual(payloads[i]);
            expect(entries[i].sequenceNumber).toBe(i);
          }

          // 3. getLatestEntry() returns the entry with the highest sequenceNumber
          const latest = await ledger.getLatestEntry();
          expect(latest).not.toBeNull();
          expect(latest!.sequenceNumber).toBe(N - 1);
          expect(latest!.payload).toEqual(payloads[N - 1]);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6 Tests
// ---------------------------------------------------------------------------

// Feature: block-chain-ledger, Property 6: Append Grows Ledger
describe('Feature: block-chain-ledger, Property 6: Append Grows Ledger', () => {
  /**
   * **Validates: Requirements 5.6, 6.4, 6.5**
   *
   * For any sequence of 1–8 random payloads appended to a Ledger,
   * after each append:
   *   1. ledger.length === previous length + 1
   *   2. ledger.head equals the returned Checksum
   *   3. The returned Checksum exists in the BlockStore (store.has(checksum) === true)
   */
  it('each append increments length, updates head to returned checksum, and checksum exists in store', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSignerSeed(),
        arbPayloads(8, 64),
        async (seed, payloads) => {
          const store = new MemoryBlockStore(BlockSize.Small);
          const ledger = new Ledger(
            store,
            BlockSize.Small,
            serializer,
            'pbt-append-grows',
          );
          const signer = createMockSigner(seed);

          for (let i = 0; i < payloads.length; i++) {
            const prevLength = ledger.length;

            const checksum = await ledger.append(payloads[i], signer);

            // 1. After append, length === previous length + 1
            expect(ledger.length).toBe(prevLength + 1);

            // 2. After append, head equals the returned Checksum
            expect(ledger.head).not.toBeNull();
            expect(ledger.head!.equals(checksum)).toBe(true);

            // 3. The returned Checksum exists in the BlockStore
            const exists = await store.has(checksum);
            expect(exists).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8 Tests
// ---------------------------------------------------------------------------

// Feature: block-chain-ledger, Property 8: Persistence Round-Trip
describe('Feature: block-chain-ledger, Property 8: Persistence Round-Trip', () => {
  /**
   * **Validates: Requirements 7.2, 7.4, 7.5**
   *
   * For any sequence of 1–5 random payloads appended to a Ledger:
   *   1. Ledger.load() from the same store and ledgerId produces a ledger
   *      with the same length
   *   2. The loaded ledger has the same head checksum
   *   3. All entries are retrievable by sequenceNumber with identical
   *      payload, sequenceNumber, previousEntryHash, entryHash, signature,
   *      and signerPublicKey
   */
  it('loaded ledger has same length, head, and identical entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSignerSeed(),
        arbPayloads(5, 64),
        async (seed, payloads) => {
          const store = new MemoryBlockStore(BlockSize.Small);
          const ledgerId = 'pbt-persistence-rt';
          const ledger = new Ledger(
            store,
            BlockSize.Small,
            serializer,
            ledgerId,
          );
          const signer = createMockSigner(seed);

          // Append all payloads
          for (const payload of payloads) {
            await ledger.append(payload, signer);
          }

          // Load a fresh ledger from the same store and ledgerId
          const loaded = await Ledger.load(
            store,
            BlockSize.Small,
            serializer,
            ledgerId,
          );

          // 1. Same length
          expect(loaded.length).toBe(ledger.length);

          // 2. Same head checksum
          expect(loaded.head).not.toBeNull();
          expect(loaded.head!.equals(ledger.head!)).toBe(true);

          // 3. All entries retrievable with identical fields
          for (let i = 0; i < payloads.length; i++) {
            const original = await ledger.getEntry(i);
            const restored = await loaded.getEntry(i);

            expect(restored.sequenceNumber).toBe(original.sequenceNumber);
            expect(restored.payload).toEqual(original.payload);
            expect(restored.signature).toEqual(original.signature);
            expect(restored.signerPublicKey).toEqual(original.signerPublicKey);
            expect(restored.entryHash.equals(original.entryHash)).toBe(true);

            if (original.previousEntryHash === null) {
              expect(restored.previousEntryHash).toBeNull();
            } else {
              expect(restored.previousEntryHash).not.toBeNull();
              expect(
                restored.previousEntryHash!.equals(original.previousEntryHash),
              ).toBe(true);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
