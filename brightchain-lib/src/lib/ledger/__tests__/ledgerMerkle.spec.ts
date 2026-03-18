/**
 * Integration unit tests for Ledger Merkle API.
 *
 * Tests the Merkle tree integration within the Ledger class, including
 * merkleRoot, getInclusionProof, getConsistencyProof, verifyInclusionProof,
 * verifyConsistencyProof, metadata round-trip, and governance interactions.
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 12.1, 12.2, 12.3,
 *      13.1–13.6, 18.1, 18.2, 18.3, 19.1, 19.2, 19.3
 */

import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../../enumerations/blockSize';
import { GovernanceActionType } from '../../interfaces/ledger/governanceAction';
import { ILedgerSigner } from '../../interfaces/ledger/ledgerSigner';
import { QuorumType } from '../../interfaces/ledger/quorumPolicy';
import { SignerRole } from '../../interfaces/ledger/signerRole';
import { SignerStatus } from '../../interfaces/ledger/signerStatus';
import { ChecksumService } from '../../services/checksum.service';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { GovernancePayloadSerializer } from '../governancePayloadSerializer';
import { Ledger } from '../ledger';
import { LedgerEntrySerializer } from '../ledgerEntrySerializer';

// ── Helpers ─────────────────────────────────────────────────────────

const mockSigner: ILedgerSigner = {
  publicKey: new Uint8Array(33).fill(0x02),
  sign: (_data: Uint8Array) =>
    new Uint8Array(64).fill(0xaa) as SignatureUint8Array,
};

function makeSigner(seed: number): ILedgerSigner {
  const pk = new Uint8Array(33);
  pk[0] = 0x02;
  pk[1] = seed;
  return {
    publicKey: pk,
    sign: (_data: Uint8Array) =>
      new Uint8Array(64).fill(seed) as SignatureUint8Array,
  };
}

function createLedger() {
  const store = new MemoryBlockStore(BlockSize.Small);
  const serializer = new LedgerEntrySerializer(new ChecksumService());
  const ledger = new Ledger(store, BlockSize.Small, serializer, 'merkle-test');
  return { store, serializer, ledger };
}

async function createGovernanceLedger() {
  const store = new MemoryBlockStore(BlockSize.Small);
  const serializer = new LedgerEntrySerializer(new ChecksumService());
  const govSerializer = new GovernancePayloadSerializer();
  const adminSigner = makeSigner(1);

  const genesisPayload = govSerializer.serializeGenesis({
    quorumPolicy: { type: QuorumType.Threshold, threshold: 1 },
    signers: [
      {
        publicKey: adminSigner.publicKey,
        role: SignerRole.Admin,
        status: SignerStatus.Active,
        metadata: new Map<string, string>(),
      },
    ],
  });

  const ledger = new Ledger(
    store,
    BlockSize.Small,
    serializer,
    'gov-merkle-test',
    govSerializer,
  );
  await ledger.append(genesisPayload, adminSigner);

  return { store, serializer, govSerializer, ledger, adminSigner };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('Ledger Merkle Integration', () => {
  // ── merkleRoot on empty ledger ──────────────────────────────────

  describe('merkleRoot', () => {
    it('should be null on an empty ledger', () => {
      const { ledger } = createLedger();
      expect(ledger.merkleRoot).toBeNull();
    });

    it('should update after each append', async () => {
      const { ledger } = createLedger();

      await ledger.append(new Uint8Array([0x01]), mockSigner);
      const root1 = ledger.merkleRoot;
      expect(root1).not.toBeNull();

      await ledger.append(new Uint8Array([0x02]), mockSigner);
      const root2 = ledger.merkleRoot;
      expect(root2).not.toBeNull();
      expect(root2!.equals(root1!)).toBe(false);

      await ledger.append(new Uint8Array([0x03]), mockSigner);
      const root3 = ledger.merkleRoot;
      expect(root3).not.toBeNull();
      expect(root3!.equals(root2!)).toBe(false);
      expect(root3!.equals(root1!)).toBe(false);
    });
  });

  // ── Inclusion proof ─────────────────────────────────────────────

  describe('getInclusionProof + verifyInclusionProof', () => {
    it('should return a valid proof verifiable via Ledger.verifyInclusionProof', async () => {
      const { ledger } = createLedger();

      for (let i = 0; i < 5; i++) {
        await ledger.append(new Uint8Array([i]), mockSigner);
      }

      const root = ledger.merkleRoot!;

      for (let i = 0; i < 5; i++) {
        const proof = ledger.getInclusionProof(i);
        expect(proof.leafIndex).toBe(i);
        expect(proof.treeSize).toBe(5);

        const result = Ledger.verifyInclusionProof(proof, root);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      }
    });

    it('should reject proof against a wrong root', async () => {
      const { ledger } = createLedger();

      await ledger.append(new Uint8Array([0x01]), mockSigner);
      await ledger.append(new Uint8Array([0x02]), mockSigner);

      const proof = ledger.getInclusionProof(0);
      const checksumService = new ChecksumService();
      const wrongRoot = checksumService.calculateChecksum(
        new Uint8Array([0xff, 0xfe]),
      );

      const result = Ledger.verifyInclusionProof(proof, wrongRoot);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ── Consistency proof ───────────────────────────────────────────

  describe('getConsistencyProof + verifyConsistencyProof', () => {
    it('should return a valid proof verifiable via Ledger.verifyConsistencyProof', async () => {
      const { ledger } = createLedger();

      // Append 3 entries, capture root at length 2
      await ledger.append(new Uint8Array([0x10]), mockSigner);
      await ledger.append(new Uint8Array([0x20]), mockSigner);
      const earlierRoot = ledger.merkleRoot!;
      const earlierLength = ledger.length;

      await ledger.append(new Uint8Array([0x30]), mockSigner);
      const laterRoot = ledger.merkleRoot!;
      const laterLength = ledger.length;

      const proof = ledger.getConsistencyProof(earlierLength);

      const result = Ledger.verifyConsistencyProof(
        proof,
        earlierRoot,
        laterRoot,
        earlierLength,
        laterLength,
      );
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject consistency proof with tampered later root', async () => {
      const { ledger } = createLedger();

      await ledger.append(new Uint8Array([0x10]), mockSigner);
      await ledger.append(new Uint8Array([0x20]), mockSigner);
      const earlierRoot = ledger.merkleRoot!;
      const earlierLength = ledger.length;

      await ledger.append(new Uint8Array([0x30]), mockSigner);
      const laterLength = ledger.length;

      const proof = ledger.getConsistencyProof(earlierLength);

      const checksumService = new ChecksumService();
      const tamperedRoot = checksumService.calculateChecksum(
        new Uint8Array([0xba, 0xad]),
      );

      const result = Ledger.verifyConsistencyProof(
        proof,
        earlierRoot,
        tamperedRoot,
        earlierLength,
        laterLength,
      );
      expect(result.isValid).toBe(false);
    });
  });

  // ── Selective disclosure ────────────────────────────────────────

  describe('selective disclosure', () => {
    it('multiple independent proofs verify against the same root', async () => {
      const { ledger } = createLedger();

      for (let i = 0; i < 8; i++) {
        await ledger.append(new Uint8Array([i + 1]), mockSigner);
      }

      const root = ledger.merkleRoot!;

      // Request proofs for entries 1, 4, 7 (selective subset)
      const indices = [1, 4, 7];
      for (const idx of indices) {
        const proof = ledger.getInclusionProof(idx);
        const result = Ledger.verifyInclusionProof(proof, root);
        expect(result.isValid).toBe(true);
      }
    });
  });

  // ── Merkle proofs across governance entry appends ───────────────

  describe('Merkle proofs across governance entry appends', () => {
    it('proofs for pre-governance entries remain valid after governance append', async () => {
      const { ledger, adminSigner } = await createGovernanceLedger();

      // Append a regular data entry (entry index 1, since genesis is 0)
      const writerSigner = makeSigner(2);
      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.AddSigner,
            publicKey: writerSigner.publicKey,
            role: SignerRole.Writer,
          },
        ],
        adminSigner,
      );

      // Append data entry as writer
      await ledger.append(new Uint8Array([0xaa, 0xbb]), writerSigner);

      // Capture root and proof for entry 2 (the data entry)
      const rootBefore = ledger.merkleRoot!;
      const proofBefore = ledger.getInclusionProof(2);
      const resultBefore = Ledger.verifyInclusionProof(proofBefore, rootBefore);
      expect(resultBefore.isValid).toBe(true);

      // Append another governance entry
      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.AddSigner,
            publicKey: makeSigner(3).publicKey,
            role: SignerRole.Reader,
          },
        ],
        adminSigner,
      );

      // Now get a new proof for entry 2 against the updated root
      const rootAfter = ledger.merkleRoot!;
      expect(rootAfter.equals(rootBefore)).toBe(false);

      const proofAfter = ledger.getInclusionProof(2);
      const resultAfter = Ledger.verifyInclusionProof(proofAfter, rootAfter);
      expect(resultAfter.isValid).toBe(true);

      // The leaf hash should be the same (same entry)
      expect(proofAfter.leafHash.equals(proofBefore.leafHash)).toBe(true);
    });
  });

  // ── Metadata round-trip ──────────────────────────────────────────

  describe('metadata round-trip', () => {
    it('save, load, verify Merkle root matches', async () => {
      const { store, serializer, ledger } = createLedger();

      for (let i = 0; i < 4; i++) {
        await ledger.append(new Uint8Array([i + 10]), mockSigner);
      }

      const originalRoot = ledger.merkleRoot!;
      const originalLength = ledger.length;

      // Load from the same store
      const loaded = await Ledger.load(
        store,
        BlockSize.Small,
        serializer,
        'merkle-test',
      );

      expect(loaded.length).toBe(originalLength);
      expect(loaded.merkleRoot).not.toBeNull();
      expect(loaded.merkleRoot!.equals(originalRoot)).toBe(true);
    });

    it('loaded ledger can continue appending with correct Merkle root', async () => {
      const { store, serializer, ledger } = createLedger();

      await ledger.append(new Uint8Array([0x01]), mockSigner);
      await ledger.append(new Uint8Array([0x02]), mockSigner);

      const loaded = await Ledger.load(
        store,
        BlockSize.Small,
        serializer,
        'merkle-test',
      );

      // Append to loaded ledger
      await loaded.append(new Uint8Array([0x03]), mockSigner);
      expect(loaded.length).toBe(3);
      expect(loaded.merkleRoot).not.toBeNull();

      // The root should differ from the original 2-entry root
      const root2 = ledger.merkleRoot!;
      const root3 = loaded.merkleRoot!;
      expect(root3.equals(root2)).toBe(false);
    });
  });

  // ── Frontier restoration fallback on mismatch ──────────────────

  describe('frontier restoration fallback', () => {
    it('frontier-restored ledger has correct root and can accept new appends', async () => {
      const { store, serializer, ledger } = createLedger();

      for (let i = 0; i < 3; i++) {
        await ledger.append(new Uint8Array([i + 1]), mockSigner);
      }

      const originalRoot = ledger.merkleRoot!;

      // Load from store — restores via frontier (fast path)
      const loaded = await Ledger.load(
        store,
        BlockSize.Small,
        serializer,
        'merkle-test',
      );

      expect(loaded.merkleRoot).not.toBeNull();
      expect(loaded.merkleRoot!.equals(originalRoot)).toBe(true);

      // Frontier-restored tree can accept new appends and root updates
      await loaded.append(new Uint8Array([0x04]), mockSigner);
      expect(loaded.length).toBe(4);
      expect(loaded.merkleRoot).not.toBeNull();
      expect(loaded.merkleRoot!.equals(originalRoot)).toBe(false);
    });
  });

  // ── Governance metadata round-trip ─────────────────────────────

  describe('governance ledger metadata round-trip', () => {
    it('load preserves Merkle root for governance-enabled ledger', async () => {
      const { store, serializer, govSerializer, ledger, adminSigner } =
        await createGovernanceLedger();

      // Add a writer via governance
      const writerSigner = makeSigner(2);
      await ledger.appendGovernance(
        [
          {
            type: GovernanceActionType.AddSigner,
            publicKey: writerSigner.publicKey,
            role: SignerRole.Writer,
          },
        ],
        adminSigner,
      );

      // Append data entry
      await ledger.append(new Uint8Array([0xdd]), writerSigner);

      const originalRoot = ledger.merkleRoot!;

      // Load from store
      const loaded = await Ledger.load(
        store,
        BlockSize.Small,
        serializer,
        'gov-merkle-test',
        govSerializer,
      );

      expect(loaded.length).toBe(3);
      expect(loaded.merkleRoot).not.toBeNull();
      expect(loaded.merkleRoot!.equals(originalRoot)).toBe(true);

      // Loaded governance ledger can continue appending
      await loaded.append(new Uint8Array([0xee]), writerSigner);
      expect(loaded.length).toBe(4);
      expect(loaded.merkleRoot).not.toBeNull();
      expect(loaded.merkleRoot!.equals(originalRoot)).toBe(false);
    });
  });
});
