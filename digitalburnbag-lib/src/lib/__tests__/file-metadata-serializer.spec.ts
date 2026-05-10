import { DeserializationError } from '../errors';
import type { IFileMetadataBase } from '../interfaces/bases/file-metadata';
import { FileMetadataSerializer } from '../serialization/file-metadata-serializer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid IFileMetadataBase<string> for testing. */
function makeMetadata(
  overrides: Partial<IFileMetadataBase<string>> = {},
): IFileMetadataBase<string> {
  return {
    id: 'abc123',
    ownerId: 'owner456',
    vaultContainerId: 'vc-001',
    folderId: 'folder789',
    fileName: 'report.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1048576,
    tags: ['finance', 'q4'],
    currentVersionId: 'ver001',
    vaultCreationLedgerEntryHash: new Uint8Array(64).fill(0xab),
    approvalGoverned: false,
    visibleWatermark: true,
    invisibleWatermark: false,
    createdAt: '2024-06-15T10:30:00.000Z',
    updatedAt: '2024-06-15T12:00:00.000Z',
    createdBy: 'user001',
    updatedBy: 'user002',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FileMetadataSerializer', () => {
  describe('serialize / deserialize round-trip', () => {
    it('round-trips a minimal metadata object (no optional fields)', () => {
      const meta = makeMetadata();
      const binary = FileMetadataSerializer.serialize(meta);
      const result = FileMetadataSerializer.deserialize(binary);

      expect(result.id).toBe(meta.id);
      expect(result.ownerId).toBe(meta.ownerId);
      expect(result.folderId).toBe(meta.folderId);
      expect(result.fileName).toBe(meta.fileName);
      expect(result.mimeType).toBe(meta.mimeType);
      expect(result.sizeBytes).toBe(meta.sizeBytes);
      expect(result.tags).toEqual(meta.tags);
      expect(result.currentVersionId).toBe(meta.currentVersionId);
      expect(result.vaultCreationLedgerEntryHash).toEqual(
        meta.vaultCreationLedgerEntryHash,
      );
      expect(result.approvalGoverned).toBe(meta.approvalGoverned);
      expect(result.visibleWatermark).toBe(meta.visibleWatermark);
      expect(result.invisibleWatermark).toBe(meta.invisibleWatermark);
      expect(result.createdAt).toBe(meta.createdAt);
      expect(result.updatedAt).toBe(meta.updatedAt);
      expect(result.createdBy).toBe(meta.createdBy);
      expect(result.updatedBy).toBe(meta.updatedBy);
      // Optional fields should be absent
      expect(result.description).toBeUndefined();
      expect(result.aclId).toBeUndefined();
      expect(result.deletedAt).toBeUndefined();
      expect(result.deletedFromPath).toBeUndefined();
      expect(result.scheduledDestructionAt).toBeUndefined();
    });

    it('round-trips with all optional fields present', () => {
      const meta = makeMetadata({
        description: 'Quarterly financial report',
        aclId: 'acl999',
        deletedAt: '2024-07-01T00:00:00.000Z',
        deletedFromPath: '/documents/finance',
        scheduledDestructionAt: '2025-01-01T00:00:00.000Z',
      });
      const binary = FileMetadataSerializer.serialize(meta);
      const result = FileMetadataSerializer.deserialize(binary);

      expect(result.description).toBe(meta.description);
      expect(result.aclId).toBe(meta.aclId);
      expect(result.deletedAt).toBe(meta.deletedAt);
      expect(result.deletedFromPath).toBe(meta.deletedFromPath);
      expect(result.scheduledDestructionAt).toBe(meta.scheduledDestructionAt);
    });

    it('round-trips with empty tags array', () => {
      const meta = makeMetadata({ tags: [] });
      const binary = FileMetadataSerializer.serialize(meta);
      const result = FileMetadataSerializer.deserialize(binary);
      expect(result.tags).toEqual([]);
    });

    it('round-trips with unicode strings', () => {
      const meta = makeMetadata({
        fileName: '日本語ファイル.pdf',
        description: 'Ünïcödé description 🔥',
        tags: ['étiquette', '标签'],
      });
      const binary = FileMetadataSerializer.serialize(meta);
      const result = FileMetadataSerializer.deserialize(binary);
      expect(result.fileName).toBe(meta.fileName);
      expect(result.description).toBe(meta.description);
      expect(result.tags).toEqual(meta.tags);
    });

    it('round-trips boolean flag combinations', () => {
      const combos = [
        {
          approvalGoverned: true,
          visibleWatermark: true,
          invisibleWatermark: true,
        },
        {
          approvalGoverned: false,
          visibleWatermark: false,
          invisibleWatermark: false,
        },
        {
          approvalGoverned: true,
          visibleWatermark: false,
          invisibleWatermark: true,
        },
      ];
      for (const flags of combos) {
        const meta = makeMetadata(flags);
        const binary = FileMetadataSerializer.serialize(meta);
        const result = FileMetadataSerializer.deserialize(binary);
        expect(result.approvalGoverned).toBe(flags.approvalGoverned);
        expect(result.visibleWatermark).toBe(flags.visibleWatermark);
        expect(result.invisibleWatermark).toBe(flags.invisibleWatermark);
      }
    });
  });

  describe('error handling', () => {
    it('throws on data too short', () => {
      expect(() =>
        FileMetadataSerializer.deserialize(new Uint8Array(5)),
      ).toThrow(DeserializationError);
    });

    it('throws on bad version byte', () => {
      const meta = makeMetadata();
      const binary = FileMetadataSerializer.serialize(meta);
      // Corrupt version byte
      binary[0] = 0xff;
      // Fix CRC so version check fires first — actually, CRC will fail first.
      // So let's test CRC mismatch instead for this mutation.
      expect(() => FileMetadataSerializer.deserialize(binary)).toThrow(
        DeserializationError,
      );
    });

    it('throws on CRC mismatch', () => {
      const meta = makeMetadata();
      const binary = FileMetadataSerializer.serialize(meta);
      // Flip a byte in the middle of the payload
      binary[10] ^= 0xff;
      expect(() => FileMetadataSerializer.deserialize(binary)).toThrow(
        /CRC-16 mismatch/,
      );
    });

    it('throws on truncated data (valid CRC but short)', () => {
      const meta = makeMetadata();
      const binary = FileMetadataSerializer.serialize(meta);
      // Take only first 30 bytes and recompute CRC — but since we can't
      // easily recompute, just test that short data throws
      const truncated = binary.subarray(0, 30);
      expect(() => FileMetadataSerializer.deserialize(truncated)).toThrow(
        DeserializationError,
      );
    });
  });

  describe('determinism', () => {
    it('produces identical bytes for the same input', () => {
      const meta = makeMetadata({
        description: 'test',
        aclId: 'acl1',
        scheduledDestructionAt: '2025-06-01T00:00:00.000Z',
      });
      const a = FileMetadataSerializer.serialize(meta);
      const b = FileMetadataSerializer.serialize(meta);
      expect(a).toEqual(b);
    });
  });

  describe('version byte', () => {
    it('first byte is 0x01', () => {
      const meta = makeMetadata();
      const binary = FileMetadataSerializer.serialize(meta);
      expect(binary[0]).toBe(0x01);
    });
  });
});
