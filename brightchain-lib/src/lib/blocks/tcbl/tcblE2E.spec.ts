/**
 * @fileoverview End-to-End round-trip tests for TCBL archives.
 *
 * Tests cover:
 * - 13.1: Multi-entry build → store → retrieve → read → extract → verify
 * - 13.2: Bzip2 compressed TCBL round-trip (Req 7.7)
 * - 13.3: EncryptedBlock wrapper pattern (Req 7.5, 7.6, 7.8)
 * - 13.4: Manifest serialization round-trip property (Req 3.3)
 */

import {
  CHECKSUM,
  ECIES,
  EmailString,
  Member,
  MemberType,
  PlatformID,
} from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import { EncryptedBlockMetadata } from '../../encryptedBlockMetadata';
import { BlockDataType } from '../../enumerations/blockDataType';
import { BlockSize } from '../../enumerations/blockSize';
import { BlockType } from '../../enumerations/blockType';
import { ITcblEntryInput } from '../../interfaces/tcbl/tcblEntryInput';
import { ITcblManifest } from '../../interfaces/tcbl/tcblManifest';
import { ServiceProvider } from '../../services/service.provider';
import { ServiceLocator } from '../../services/serviceLocator';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { initializeTestServices } from '../../test/service.initializer.helper';
import { Checksum } from '../../types/checksum';
import { EncryptedBlock } from '../encrypted';
import { EncryptedBlockFactory } from '../encryptedBlockFactory';
import { TcblManifestSerializer } from './manifestSerializer';
import { TarballConstituentBlockListBlock } from './tcbl';
import { TcblBuilder } from './tcblBuilder';
import { TcblReader } from './tcblReader';

// Mock CBLBase to avoid signature validation issues in tests
jest.mock('../cblBase', () => {
  const originalModule = jest.requireActual('../cblBase');
  originalModule.CBLBase.prototype.validateSignature = jest
    .fn()
    .mockReturnValue(true);
  return originalModule;
});

// Mock @digitaldefiance/bzip2-wasm since it uses ESM/import.meta which Jest cannot handle
jest.mock('@digitaldefiance/bzip2-wasm', () => {
  return {
    __esModule: true,
    default: class MockBZip2 {
      async init() {
        /* no-op */
      }
      compress(data: Uint8Array): Uint8Array {
        const result = new Uint8Array(data.length + 1);
        result[0] = 0xff; // marker
        result.set(data, 1);
        return result;
      }
      decompress(data: Uint8Array, _length: number): Uint8Array {
        return data.subarray(1);
      }
    },
  };
});

jest.setTimeout(30000);

/**
 * Wrapper class for EncryptedBlock to match factory signature.
 * Needed because EncryptedBlockFactory requires registered constructors.
 */
class TestEncryptedBlock extends EncryptedBlock<Uint8Array> {
  constructor(
    type: BlockType,
    dataType: BlockDataType,
    data: Uint8Array,
    checksum: Checksum,
    metadata: EncryptedBlockMetadata<Uint8Array>,
    recipientWithKey: Member<Uint8Array>,
    canRead: boolean,
    canPersist: boolean,
  ) {
    super(
      type,
      dataType,
      data,
      checksum,
      metadata,
      recipientWithKey,
      canRead,
      canPersist,
    );
  }
}

describe('TCBL End-to-End Round-Trip Tests', () => {
  let creator: Member<Uint8Array>;
  const entryBlockSize = BlockSize.Small;
  const whiteningBlockSize = BlockSize.Medium;

  beforeAll(() => {
    initializeTestServices();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
    creator = Member.newMember(
      ServiceProvider.getInstance().eciesService,
      MemberType.User,
      'test-e2e',
      new EmailString('e2e@test.com'),
    ).member;

    // Register TestEncryptedBlock for the encrypted TCBL block type
    EncryptedBlockFactory.registerBlockType(
      BlockType.EncryptedTarballConstituentBlockListBlock,
      TestEncryptedBlock as unknown as new <TID extends PlatformID>(
        type: BlockType,
        dataType: BlockDataType,
        data: Uint8Array,
        checksum: Checksum,
        metadata: EncryptedBlockMetadata<TID>,
        recipientWithKey: Member<TID>,
        canRead: boolean,
        canPersist: boolean,
      ) => EncryptedBlock,
    );
  });

  // ─── 13.1: Multi-entry round-trip with varied data ───────────────────

  describe('13.1: build TCBL with multiple entries → store → retrieve → read → extract → verify', () => {
    it('should round-trip 5 entries with varied sizes and MIME types', async () => {
      const entryStore = new MemoryBlockStore(entryBlockSize);
      const whiteningStore = new MemoryBlockStore(whiteningBlockSize);
      const builder = new TcblBuilder(creator, entryBlockSize, entryStore);

      const inputs: ITcblEntryInput[] = [
        {
          fileName: 'document.txt',
          mimeType: 'text/plain',
          data: new TextEncoder().encode('Hello, World!'),
        },
        {
          fileName: 'image.png',
          mimeType: 'image/png',
          data: new Uint8Array([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
          ]),
        },
        {
          fileName: 'empty-ish.bin',
          mimeType: 'application/octet-stream',
          data: new Uint8Array([0x00]),
        },
        {
          fileName: 'data/nested/config.json',
          mimeType: 'application/json',
          data: new TextEncoder().encode('{"key":"value","num":42}'),
        },
        {
          fileName: 'large.dat',
          mimeType: 'application/octet-stream',
          data: new Uint8Array(256).map((_, i) => i % 256),
        },
      ];

      for (const input of inputs) {
        await builder.addEntry(input);
      }
      const tcbl = await builder.build();

      // Store via whitening
      const whiteningResult = await whiteningStore.storeCBLWithWhitening(
        tcbl.data,
      );

      // Retrieve
      const retrieved = await whiteningStore.retrieveCBL(
        whiteningResult.blockId1,
        whiteningResult.blockId2,
      );

      // Reconstruct and read
      const reconstructed = new TarballConstituentBlockListBlock(
        retrieved,
        creator,
        entryBlockSize,
      );
      const reader = new TcblReader(reconstructed, entryStore);
      await reader.open();

      // Verify all entries
      const entries = reader.listEntries();
      expect(entries).toHaveLength(inputs.length);

      for (let i = 0; i < inputs.length; i++) {
        expect(entries[i].fileName).toBe(inputs[i].fileName);
        expect(entries[i].mimeType).toBe(inputs[i].mimeType);
        expect(entries[i].originalDataLength).toBe(inputs[i].data.length);

        const extracted = await reader.getEntryByIndex(i);
        expect(Array.from(extracted)).toEqual(Array.from(inputs[i].data));

        const extractedByName = await reader.getEntryByName(inputs[i].fileName);
        expect(Array.from(extractedByName)).toEqual(Array.from(inputs[i].data));
      }
    });
  });

  // ─── 13.2: Bzip2 compressed round-trip ────────────────────────────────

  describe('13.2: build TCBL with bzip2 compression → store → retrieve → decompress → verify (Req 7.7)', () => {
    it('should round-trip a compressed multi-entry TCBL', async () => {
      const entryStore = new MemoryBlockStore(entryBlockSize);
      const whiteningStore = new MemoryBlockStore(whiteningBlockSize);
      const builder = new TcblBuilder(
        creator,
        entryBlockSize,
        entryStore,
        undefined,
        { compress: true },
      );

      const inputs: ITcblEntryInput[] = [
        {
          fileName: 'alpha.txt',
          mimeType: 'text/plain',
          data: new TextEncoder().encode('Alpha content'),
        },
        {
          fileName: 'beta.bin',
          mimeType: 'application/octet-stream',
          data: new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]),
        },
        {
          fileName: 'gamma.json',
          mimeType: 'application/json',
          data: new TextEncoder().encode('{"gamma":true}'),
        },
      ];

      for (const input of inputs) {
        await builder.addEntry(input);
      }
      const tcbl = await builder.build();
      expect(tcbl.isCompressed).toBe(true);

      // Store via whitening
      const whiteningResult = await whiteningStore.storeCBLWithWhitening(
        tcbl.data,
      );

      // Retrieve
      const retrieved = await whiteningStore.retrieveCBL(
        whiteningResult.blockId1,
        whiteningResult.blockId2,
      );

      // Reconstruct and read (reader handles decompression)
      const reconstructed = new TarballConstituentBlockListBlock(
        retrieved,
        creator,
        entryBlockSize,
      );
      const reader = new TcblReader(reconstructed, entryStore);
      await reader.open();

      // Verify all entries survived compression round-trip
      const entries = reader.listEntries();
      expect(entries).toHaveLength(inputs.length);

      for (let i = 0; i < inputs.length; i++) {
        expect(entries[i].fileName).toBe(inputs[i].fileName);
        expect(entries[i].mimeType).toBe(inputs[i].mimeType);
        expect(entries[i].originalDataLength).toBe(inputs[i].data.length);

        const extracted = await reader.getEntryByIndex(i);
        expect(Array.from(extracted)).toEqual(Array.from(inputs[i].data));
      }
    });
  });

  // ─── 13.3: EncryptedBlock wrapper pattern ─────────────────────────────

  describe('13.3: wrap TCBL in EncryptedBlock → store → retrieve → decrypt → read (Req 7.5, 7.6, 7.8)', () => {
    it('should wrap a TCBL in EncryptedBlock and recover the inner TCBL after decryption', async () => {
      const entryStore = new MemoryBlockStore(entryBlockSize);
      const builder = new TcblBuilder(creator, entryBlockSize, entryStore);

      const inputs: ITcblEntryInput[] = [
        {
          fileName: 'secret.txt',
          mimeType: 'text/plain',
          data: new TextEncoder().encode('Top secret content'),
        },
        {
          fileName: 'classified.bin',
          mimeType: 'application/octet-stream',
          data: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
        },
      ];

      for (const input of inputs) {
        await builder.addEntry(input);
      }
      const tcbl = await builder.build();

      // The TCBL's raw data is what gets encrypted.
      // In the real flow: caller wraps the completed TCBL in an EncryptedBlock
      // using EncryptedBlockFactory with BlockType.EncryptedTarballConstituentBlockListBlock.
      const tcblData = tcbl.data;
      const idProvider = ServiceProvider.getInstance().idProvider;
      const headerSize =
        1 + idProvider.byteLength + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;

      // The encrypted block size must be large enough to hold the TCBL data + encryption overhead
      const encryptedBlockSize = BlockSize.Medium;
      const payloadCapacity = (encryptedBlockSize as number) - headerSize;

      // Ensure the TCBL data fits within the encrypted block's payload capacity
      const dataToEncrypt = tcblData.subarray(
        0,
        Math.min(tcblData.length, payloadCapacity),
      );

      const checksumService = ServiceProvider.getInstance().checksumService;
      const checksum = checksumService.calculateChecksum(dataToEncrypt);

      // Create the encrypted block via EncryptedBlockFactory
      // This simulates the caller wrapping the TCBL in an EncryptedBlock
      const encryptedBlock = await EncryptedBlockFactory.createBlock(
        BlockType.EncryptedTarballConstituentBlockListBlock,
        BlockDataType.RawData,
        encryptedBlockSize,
        dataToEncrypt,
        checksum,
        creator,
      );

      // Verify the encrypted block has the correct type
      expect(encryptedBlock.blockType).toBe(
        BlockType.EncryptedTarballConstituentBlockListBlock,
      );
      expect(encryptedBlock.blockSize).toBe(encryptedBlockSize);

      // Store the encrypted block data in a store sized for the encrypted block
      const encryptedStore = new MemoryBlockStore(BlockSize.Large);
      const storeResult = await encryptedStore.storeCBLWithWhitening(
        encryptedBlock.data,
      );

      // Retrieve the encrypted block data
      const retrievedData = await encryptedStore.retrieveCBL(
        storeResult.blockId1,
        storeResult.blockId2,
      );

      // Verify retrieved data matches original encrypted data
      expect(Array.from(retrievedData)).toEqual(
        Array.from(encryptedBlock.data),
      );

      // Simulate decryption: in the real flow, EncryptedBlock.decrypt() returns
      // the inner plaintext. Here we extract the TCBL data that was placed
      // inside the encrypted block by the factory.
      // The factory places the data at offset: 1 (encType) + idLen + ephemeralKey + iv + authTag
      const eciesDataOffset = 1 + idProvider.byteLength;
      const dataOffset =
        eciesDataOffset +
        ECIES.PUBLIC_KEY_LENGTH +
        ECIES.IV_SIZE +
        ECIES.AUTH_TAG_SIZE;
      const innerTcblData = retrievedData.subarray(
        dataOffset,
        dataOffset + dataToEncrypt.length,
      );

      // The inner data should be the original TCBL data
      expect(Array.from(innerTcblData)).toEqual(Array.from(dataToEncrypt));

      // Reconstruct the TCBL from the decrypted inner data
      // Pad to block size as the TCBL constructor expects block-sized data
      const paddedTcblData = new Uint8Array(entryBlockSize as number);
      paddedTcblData.set(innerTcblData);
      const reconstructed = new TarballConstituentBlockListBlock(
        paddedTcblData,
        creator,
        entryBlockSize,
      );

      // Read the TCBL and verify entries match originals
      const reader = new TcblReader(reconstructed, entryStore);
      await reader.open();

      const entries = reader.listEntries();
      expect(entries).toHaveLength(inputs.length);

      for (let i = 0; i < inputs.length; i++) {
        expect(entries[i].fileName).toBe(inputs[i].fileName);
        expect(entries[i].mimeType).toBe(inputs[i].mimeType);
        expect(entries[i].originalDataLength).toBe(inputs[i].data.length);

        const extracted = await reader.getEntryByIndex(i);
        expect(Array.from(extracted)).toEqual(Array.from(inputs[i].data));
      }
    });

    it('should support compress-then-encrypt order (Req 7.6)', async () => {
      const entryStore = new MemoryBlockStore(entryBlockSize);
      const builder = new TcblBuilder(
        creator,
        entryBlockSize,
        entryStore,
        undefined,
        { compress: true },
      );

      const originalData = new TextEncoder().encode('Compress then encrypt me');
      await builder.addEntry({
        fileName: 'compressed-encrypted.txt',
        mimeType: 'text/plain',
        data: originalData,
      });
      const tcbl = await builder.build();
      expect(tcbl.isCompressed).toBe(true);

      // Wrap in EncryptedBlock (compress-then-encrypt order per Req 7.6)
      const tcblData = tcbl.data;
      const idProvider = ServiceProvider.getInstance().idProvider;
      const headerSize =
        1 + idProvider.byteLength + ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      const encryptedBlockSize = BlockSize.Medium;
      const payloadCapacity = (encryptedBlockSize as number) - headerSize;
      const dataToEncrypt = tcblData.subarray(
        0,
        Math.min(tcblData.length, payloadCapacity),
      );

      const checksumService = ServiceProvider.getInstance().checksumService;
      const checksum = checksumService.calculateChecksum(dataToEncrypt);

      const encryptedBlock = await EncryptedBlockFactory.createBlock(
        BlockType.EncryptedTarballConstituentBlockListBlock,
        BlockDataType.RawData,
        encryptedBlockSize,
        dataToEncrypt,
        checksum,
        creator,
      );

      expect(encryptedBlock.blockType).toBe(
        BlockType.EncryptedTarballConstituentBlockListBlock,
      );

      // Simulate decryption: extract inner TCBL data
      const eciesDataOffset = 1 + idProvider.byteLength;
      const dataOffset =
        eciesDataOffset +
        ECIES.PUBLIC_KEY_LENGTH +
        ECIES.IV_SIZE +
        ECIES.AUTH_TAG_SIZE;
      const innerTcblData = encryptedBlock.data.subarray(
        dataOffset,
        dataOffset + dataToEncrypt.length,
      );

      // Reconstruct the compressed TCBL
      const paddedTcblData = new Uint8Array(entryBlockSize as number);
      paddedTcblData.set(innerTcblData);
      const reconstructed = new TarballConstituentBlockListBlock(
        paddedTcblData,
        creator,
        entryBlockSize,
      );

      // Reader handles decompression
      const reader = new TcblReader(reconstructed, entryStore);
      await reader.open();

      const entries = reader.listEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].fileName).toBe('compressed-encrypted.txt');

      const extracted = await reader.getEntryByIndex(0);
      expect(Array.from(extracted)).toEqual(Array.from(originalData));
    });
  });

  // ─── 13.4: Manifest serialization round-trip property (Req 3.3) ──────

  describe('13.4: manifest serialization round-trip property (Req 3.3)', () => {
    /**
     * **Validates: Requirements 3.3**
     *
     * Property: For all valid TCBL manifest objects, serializing then
     * deserializing produces an equivalent manifest object.
     */
    it('round-trip property: serialize → deserialize preserves all fields', () => {
      // Arbitrary for valid file names (no path traversal, max 255 chars)
      const fileNameArb: fc.Arbitrary<string> = fc
        .string({ minLength: 1, maxLength: 50 })
        .filter(
          (s: string) =>
            !s.includes('/') &&
            !s.includes('\\') &&
            !s.includes('\0') &&
            !s.includes('..'),
        );

      // Arbitrary for valid MIME types (max 127 chars)
      const mimeTypeArb = fc.oneof(
        fc.constant('text/plain'),
        fc.constant('application/json'),
        fc.constant('application/octet-stream'),
        fc.constant('image/png'),
        fc.constant('text/html'),
        fc.constant('application/xml'),
      );

      // Arbitrary for checksum bytes (64 bytes for SHA3-512)
      const checksumArb = fc
        .uint8Array({
          minLength: CHECKSUM.SHA3_BUFFER_LENGTH,
          maxLength: CHECKSUM.SHA3_BUFFER_LENGTH,
        })
        .map((bytes) => Checksum.fromUint8Array(bytes));

      // Arbitrary for a single entry descriptor
      const entryArb = fc.record({
        fileName: fileNameArb,
        mimeType: mimeTypeArb,
        originalDataLength: fc.integer({ min: 0, max: 2 ** 32 - 1 }),
        cblAddress: checksumArb,
      });

      // Arbitrary for a manifest with 0–10 entries
      const manifestArb = fc
        .array(entryArb, { minLength: 0, maxLength: 10 })
        .map((entries) => ({
          version: 1,
          entryCount: entries.length,
          entries,
          checksum: Checksum.fromUint8Array(
            new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH),
          ),
        }));

      fc.assert(
        fc.property(manifestArb, (manifest: ITcblManifest) => {
          // Serialize
          const serialized = TcblManifestSerializer.serialize(manifest);

          // Deserialize
          const deserialized = TcblManifestSerializer.deserialize(serialized);

          // Verify all fields match
          expect(deserialized.version).toBe(manifest.version);
          expect(deserialized.entryCount).toBe(manifest.entryCount);
          expect(deserialized.entries).toHaveLength(manifest.entries.length);

          for (let i = 0; i < manifest.entries.length; i++) {
            expect(deserialized.entries[i].fileName).toBe(
              manifest.entries[i].fileName,
            );
            expect(deserialized.entries[i].mimeType).toBe(
              manifest.entries[i].mimeType,
            );
            expect(deserialized.entries[i].originalDataLength).toBe(
              manifest.entries[i].originalDataLength,
            );
            expect(
              deserialized.entries[i].cblAddress.equals(
                manifest.entries[i].cblAddress,
              ),
            ).toBe(true);
          }
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 3.3**
     *
     * Property: Serializing the same manifest twice produces identical output
     * (determinism).
     */
    it('determinism property: serialize twice → identical output', () => {
      const checksumArb = fc
        .uint8Array({
          minLength: CHECKSUM.SHA3_BUFFER_LENGTH,
          maxLength: CHECKSUM.SHA3_BUFFER_LENGTH,
        })
        .map((bytes) => Checksum.fromUint8Array(bytes));

      const entryArb = fc.record({
        fileName: fc
          .string({ minLength: 1, maxLength: 30 })
          .filter(
            (s: string) =>
              !s.includes('\0') &&
              !s.includes('/') &&
              !s.includes('\\') &&
              !s.includes('..'),
          ),
        mimeType: fc.oneof(
          fc.constant('text/plain'),
          fc.constant('application/json'),
          fc.constant('image/png'),
        ),
        originalDataLength: fc.integer({ min: 0, max: 1_000_000 }),
        cblAddress: checksumArb,
      });

      const manifestArb = fc
        .array(entryArb, { minLength: 0, maxLength: 8 })
        .map((entries) => ({
          version: 1,
          entryCount: entries.length,
          entries,
          checksum: Checksum.fromUint8Array(
            new Uint8Array(CHECKSUM.SHA3_BUFFER_LENGTH),
          ),
        }));

      fc.assert(
        fc.property(manifestArb, (manifest: ITcblManifest) => {
          const serialized1 = TcblManifestSerializer.serialize(manifest);
          const serialized2 = TcblManifestSerializer.serialize(manifest);

          expect(serialized1.length).toBe(serialized2.length);
          expect(Array.from(serialized1)).toEqual(Array.from(serialized2));
        }),
        { numRuns: 100 },
      );
    });
  });
});
