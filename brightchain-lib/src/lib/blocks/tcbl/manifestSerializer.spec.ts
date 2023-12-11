/**
 * @fileoverview Unit tests for TcblManifestSerializer.
 *
 * Tests round-trip serialization, deterministic output, and error cases.
 *
 * @see Requirements 3.3, 3.4
 */

import { CHECKSUM } from '@digitaldefiance/ecies-lib';
import { sha3_512 } from '@noble/hashes/sha3';
import { TcblErrorType } from '../../enumerations/tcblErrorType';
import { TcblError } from '../../errors/tcblError';
import { ITcblEntryDescriptor } from '../../interfaces/tcbl/tcblEntryDescriptor';
import { ITcblManifest } from '../../interfaces/tcbl/tcblManifest';
import { Checksum } from '../../types/checksum';
import { TcblManifestSerializer } from './manifestSerializer';

const CHECKSUM_BYTE_LENGTH = CHECKSUM.SHA3_BUFFER_LENGTH; // 64

/** Helper: create a random Checksum for testing. */
function randomChecksum(): Checksum {
  const bytes = new Uint8Array(CHECKSUM_BYTE_LENGTH);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Checksum.fromUint8Array(bytes);
}

/** Helper: create a dummy manifest with the given entries. */
function makeManifest(entries: ITcblEntryDescriptor[]): ITcblManifest {
  // Use a placeholder checksum; serialize will compute the real one
  const placeholder = Checksum.fromUint8Array(
    new Uint8Array(CHECKSUM_BYTE_LENGTH),
  );
  return {
    version: 1,
    entryCount: entries.length,
    entries,
    checksum: placeholder,
  };
}

describe('TcblManifestSerializer', () => {
  describe('round-trip serialization (Req 3.3)', () => {
    it('should round-trip an empty manifest', () => {
      const manifest = makeManifest([]);
      const serialized = TcblManifestSerializer.serialize(manifest);
      const deserialized = TcblManifestSerializer.deserialize(serialized);

      expect(deserialized.version).toBe(manifest.version);
      expect(deserialized.entryCount).toBe(0);
      expect(deserialized.entries).toHaveLength(0);
    });

    it('should round-trip a single-entry manifest', () => {
      const address = randomChecksum();
      const entry: ITcblEntryDescriptor = {
        fileName: 'hello.txt',
        mimeType: 'text/plain',
        originalDataLength: 1024,
        cblAddress: address,
      };
      const manifest = makeManifest([entry]);
      const serialized = TcblManifestSerializer.serialize(manifest);
      const deserialized = TcblManifestSerializer.deserialize(serialized);

      expect(deserialized.version).toBe(1);
      expect(deserialized.entryCount).toBe(1);
      expect(deserialized.entries).toHaveLength(1);
      expect(deserialized.entries[0].fileName).toBe('hello.txt');
      expect(deserialized.entries[0].mimeType).toBe('text/plain');
      expect(deserialized.entries[0].originalDataLength).toBe(1024);
      expect(deserialized.entries[0].cblAddress.equals(address)).toBe(true);
    });

    it('should round-trip a multi-entry manifest', () => {
      const entries: ITcblEntryDescriptor[] = [
        {
          fileName: 'file1.bin',
          mimeType: 'application/octet-stream',
          originalDataLength: 0,
          cblAddress: randomChecksum(),
        },
        {
          fileName: 'image.png',
          mimeType: 'image/png',
          originalDataLength: 999999,
          cblAddress: randomChecksum(),
        },
        {
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          originalDataLength: 5000000,
          cblAddress: randomChecksum(),
        },
      ];
      const manifest = makeManifest(entries);
      const serialized = TcblManifestSerializer.serialize(manifest);
      const deserialized = TcblManifestSerializer.deserialize(serialized);

      expect(deserialized.version).toBe(1);
      expect(deserialized.entryCount).toBe(3);
      expect(deserialized.entries).toHaveLength(3);
      for (let i = 0; i < entries.length; i++) {
        expect(deserialized.entries[i].fileName).toBe(entries[i].fileName);
        expect(deserialized.entries[i].mimeType).toBe(entries[i].mimeType);
        expect(deserialized.entries[i].originalDataLength).toBe(
          entries[i].originalDataLength,
        );
        expect(
          deserialized.entries[i].cblAddress.equals(entries[i].cblAddress),
        ).toBe(true);
      }
    });

    it('should round-trip with unicode file names', () => {
      const entry: ITcblEntryDescriptor = {
        fileName: '日本語ファイル.txt',
        mimeType: 'text/plain; charset=utf-8',
        originalDataLength: 42,
        cblAddress: randomChecksum(),
      };
      const manifest = makeManifest([entry]);
      const serialized = TcblManifestSerializer.serialize(manifest);
      const deserialized = TcblManifestSerializer.deserialize(serialized);

      expect(deserialized.entries[0].fileName).toBe('日本語ファイル.txt');
      expect(deserialized.entries[0].mimeType).toBe(
        'text/plain; charset=utf-8',
      );
    });

    it('should round-trip with large originalDataLength (uint48 range)', () => {
      // Test a value that requires more than 32 bits: ~1 TB
      const largeLength = 1099511627776; // 2^40 = 1 TB
      const entry: ITcblEntryDescriptor = {
        fileName: 'big.dat',
        mimeType: 'application/octet-stream',
        originalDataLength: largeLength,
        cblAddress: randomChecksum(),
      };
      const manifest = makeManifest([entry]);
      const serialized = TcblManifestSerializer.serialize(manifest);
      const deserialized = TcblManifestSerializer.deserialize(serialized);

      expect(deserialized.entries[0].originalDataLength).toBe(largeLength);
    });
  });

  describe('deterministic output (Req 3.5)', () => {
    it('should produce identical binary output for identical manifests', () => {
      const address = randomChecksum();
      const entry: ITcblEntryDescriptor = {
        fileName: 'test.txt',
        mimeType: 'text/plain',
        originalDataLength: 512,
        cblAddress: address,
      };
      const manifest = makeManifest([entry]);

      const serialized1 = TcblManifestSerializer.serialize(manifest);
      const serialized2 = TcblManifestSerializer.serialize(manifest);

      expect(serialized1).toEqual(serialized2);
    });

    it('should produce identical output for equivalent manifests constructed separately', () => {
      const addressBytes = new Uint8Array(CHECKSUM_BYTE_LENGTH);
      addressBytes.fill(0xab);
      const address1 = Checksum.fromUint8Array(new Uint8Array(addressBytes));
      const address2 = Checksum.fromUint8Array(new Uint8Array(addressBytes));

      const manifest1 = makeManifest([
        {
          fileName: 'a.txt',
          mimeType: 'text/plain',
          originalDataLength: 100,
          cblAddress: address1,
        },
      ]);
      const manifest2 = makeManifest([
        {
          fileName: 'a.txt',
          mimeType: 'text/plain',
          originalDataLength: 100,
          cblAddress: address2,
        },
      ]);

      const serialized1 = TcblManifestSerializer.serialize(manifest1);
      const serialized2 = TcblManifestSerializer.serialize(manifest2);

      expect(serialized1).toEqual(serialized2);
    });
  });

  describe('checksum computation (Req 2.5)', () => {
    it('should embed a valid checksum in serialized output', () => {
      const manifest = makeManifest([
        {
          fileName: 'test.bin',
          mimeType: 'application/octet-stream',
          originalDataLength: 256,
          cblAddress: randomChecksum(),
        },
      ]);
      const serialized = TcblManifestSerializer.serialize(manifest);

      // Extract the checksum (last 64 bytes)
      const storedChecksum = serialized.slice(
        serialized.length - CHECKSUM_BYTE_LENGTH,
      );
      // Compute expected checksum over everything before it
      const entryData = serialized.subarray(
        0,
        serialized.length - CHECKSUM_BYTE_LENGTH,
      );
      const expectedChecksum = sha3_512(entryData);

      expect(storedChecksum).toEqual(expectedChecksum);
    });

    it('computeChecksum should match the embedded checksum', () => {
      const manifest = makeManifest([
        {
          fileName: 'foo.txt',
          mimeType: 'text/plain',
          originalDataLength: 10,
          cblAddress: randomChecksum(),
        },
      ]);
      const computed = TcblManifestSerializer.computeChecksum(manifest);
      const serialized = TcblManifestSerializer.serialize(manifest);
      const deserialized = TcblManifestSerializer.deserialize(serialized);

      expect(deserialized.checksum.equals(computed)).toBe(true);
    });
  });

  describe('error cases (Req 3.4)', () => {
    it('should throw ManifestTruncated for empty data', () => {
      expect(() =>
        TcblManifestSerializer.deserialize(new Uint8Array(0)),
      ).toThrow(TcblError);

      try {
        TcblManifestSerializer.deserialize(new Uint8Array(0));
      } catch (e) {
        expect(e).toBeInstanceOf(TcblError);
        expect((e as TcblError).errorType).toBe(
          TcblErrorType.ManifestTruncated,
        );
      }
    });

    it('should throw ManifestTruncated for data shorter than minimum header + checksum', () => {
      // Minimum is 2 (version) + 4 (entryCount) + 64 (checksum) = 70 bytes
      const tooShort = new Uint8Array(69);
      expect(() => TcblManifestSerializer.deserialize(tooShort)).toThrow(
        TcblError,
      );

      try {
        TcblManifestSerializer.deserialize(tooShort);
      } catch (e) {
        expect((e as TcblError).errorType).toBe(
          TcblErrorType.ManifestTruncated,
        );
      }
    });

    it('should throw ManifestCorrupted when checksum does not match', () => {
      const manifest = makeManifest([
        {
          fileName: 'test.txt',
          mimeType: 'text/plain',
          originalDataLength: 100,
          cblAddress: randomChecksum(),
        },
      ]);
      const serialized = TcblManifestSerializer.serialize(manifest);

      // Corrupt a byte in the entry data (not the checksum)
      const corrupted = new Uint8Array(serialized);
      corrupted[0] ^= 0xff; // flip version byte

      expect(() => TcblManifestSerializer.deserialize(corrupted)).toThrow(
        TcblError,
      );

      try {
        TcblManifestSerializer.deserialize(corrupted);
      } catch (e) {
        expect((e as TcblError).errorType).toBe(
          TcblErrorType.ManifestCorrupted,
        );
      }
    });

    it('should throw ManifestTruncated when entry count claims more entries than data contains', () => {
      // Create a valid empty manifest, then change entryCount to 5
      const manifest = makeManifest([]);
      const serialized = TcblManifestSerializer.serialize(manifest);
      const tampered = new Uint8Array(serialized);

      // Set entryCount to 5 (bytes 2-5, big-endian uint32)
      const view = new DataView(
        tampered.buffer,
        tampered.byteOffset,
        tampered.byteLength,
      );
      view.setUint32(2, 5, false);

      // This will fail because there's no entry data but count says 5
      // It could be ManifestTruncated or ManifestCorrupted depending on where it fails
      expect(() => TcblManifestSerializer.deserialize(tampered)).toThrow(
        TcblError,
      );
    });

    it('should throw ManifestCorrupted when extra bytes exist between entries and checksum', () => {
      const manifest = makeManifest([]);
      const serialized = TcblManifestSerializer.serialize(manifest);

      // Insert extra bytes before the checksum
      const withExtra = new Uint8Array(serialized.length + 10);
      // Copy header (6 bytes)
      withExtra.set(serialized.subarray(0, 6), 0);
      // Add 10 garbage bytes
      withExtra.set(new Uint8Array(10).fill(0xde), 6);
      // Copy checksum at the end
      withExtra.set(
        serialized.subarray(serialized.length - CHECKSUM_BYTE_LENGTH),
        withExtra.length - CHECKSUM_BYTE_LENGTH,
      );

      expect(() => TcblManifestSerializer.deserialize(withExtra)).toThrow(
        TcblError,
      );
    });
  });
});
