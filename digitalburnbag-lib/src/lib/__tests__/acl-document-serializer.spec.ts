import { CrcService } from '@digitaldefiance/ecies-lib';
import { DeserializationError } from '../errors';
import type { IACLDocumentBase } from '../interfaces/bases/acl-document';
import type { IACLEntryBase } from '../interfaces/bases/acl-entry';
import { ACLDocumentSerializer } from '../serialization/acl-document-serializer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid ACL entry for testing. */
function makeEntry(
  overrides: Partial<IACLEntryBase<string>> = {},
): IACLEntryBase<string> {
  return {
    principalType: 'user',
    principalId: 'user123',
    permissionLevel: 'editor',
    canReshare: false,
    blockDownload: false,
    ...overrides,
  };
}

/** Build a minimal valid IACLDocumentBase<string> for testing. */
function makeACL(
  overrides: Partial<IACLDocumentBase<string>> = {},
): IACLDocumentBase<string> {
  return {
    id: 'acl-001',
    entries: [makeEntry()],
    createdAt: '2024-06-15T10:30:00.000Z',
    updatedAt: '2024-06-15T12:00:00.000Z',
    updatedBy: 'admin001',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ACLDocumentSerializer', () => {
  describe('serialize / deserialize round-trip', () => {
    it('round-trips a minimal ACL document (one entry, no optional fields)', () => {
      const acl = makeACL();
      const binary = ACLDocumentSerializer.serialize(acl);
      const result = ACLDocumentSerializer.deserialize(binary);

      expect(result.id).toBe(acl.id);
      expect(result.createdAt).toBe(acl.createdAt);
      expect(result.updatedAt).toBe(acl.updatedAt);
      expect(result.updatedBy).toBe(acl.updatedBy);
      expect(result.entries).toHaveLength(1);

      const entry = result.entries[0];
      expect(entry.principalType).toBe('user');
      expect(entry.principalId).toBe('user123');
      expect(entry.permissionLevel).toBe('editor');
      expect(entry.canReshare).toBe(false);
      expect(entry.blockDownload).toBe(false);
      expect(entry.customPermissionSetId).toBeUndefined();
      expect(entry.ipRange).toBeUndefined();
      expect(entry.timeWindowStart).toBeUndefined();
      expect(entry.timeWindowEnd).toBeUndefined();
      expect(entry.timeWindowTimezone).toBeUndefined();
      expect(entry.expiresAt).toBeUndefined();
    });

    it('round-trips with empty entries array', () => {
      const acl = makeACL({ entries: [] });
      const binary = ACLDocumentSerializer.serialize(acl);
      const result = ACLDocumentSerializer.deserialize(binary);
      expect(result.entries).toEqual([]);
    });

    it('round-trips with all optional entry fields present', () => {
      const acl = makeACL({
        entries: [
          makeEntry({
            customPermissionSetId: 'pset-42',
            ipRange: '192.168.1.0/24',
            timeWindowStart: '09:00',
            timeWindowEnd: '17:00',
            timeWindowTimezone: 'America/New_York',
            expiresAt: '2025-12-31T23:59:59.000Z',
          }),
        ],
      });
      const binary = ACLDocumentSerializer.serialize(acl);
      const result = ACLDocumentSerializer.deserialize(binary);

      const entry = result.entries[0];
      expect(entry.customPermissionSetId).toBe('pset-42');
      expect(entry.ipRange).toBe('192.168.1.0/24');
      expect(entry.timeWindowStart).toBe('09:00');
      expect(entry.timeWindowEnd).toBe('17:00');
      expect(entry.timeWindowTimezone).toBe('America/New_York');
      expect(entry.expiresAt).toBe('2025-12-31T23:59:59.000Z');
    });

    it('round-trips all three principal types', () => {
      const types: IACLEntryBase<string>['principalType'][] = [
        'user',
        'group',
        'share_link',
      ];
      for (const pt of types) {
        const acl = makeACL({
          entries: [makeEntry({ principalType: pt, principalId: `${pt}-id` })],
        });
        const binary = ACLDocumentSerializer.serialize(acl);
        const result = ACLDocumentSerializer.deserialize(binary);
        expect(result.entries[0].principalType).toBe(pt);
        expect(result.entries[0].principalId).toBe(`${pt}-id`);
      }
    });

    it('round-trips boolean flag combinations', () => {
      const combos = [
        { canReshare: true, blockDownload: true },
        { canReshare: false, blockDownload: false },
        { canReshare: true, blockDownload: false },
        { canReshare: false, blockDownload: true },
      ];
      for (const flags of combos) {
        const acl = makeACL({ entries: [makeEntry(flags)] });
        const binary = ACLDocumentSerializer.serialize(acl);
        const result = ACLDocumentSerializer.deserialize(binary);
        expect(result.entries[0].canReshare).toBe(flags.canReshare);
        expect(result.entries[0].blockDownload).toBe(flags.blockDownload);
      }
    });

    it('round-trips multiple entries', () => {
      const acl = makeACL({
        entries: [
          makeEntry({
            principalType: 'user',
            principalId: 'u1',
            permissionLevel: 'viewer',
          }),
          makeEntry({
            principalType: 'group',
            principalId: 'g1',
            permissionLevel: 'editor',
            canReshare: true,
            ipRange: '10.0.0.0/8',
          }),
          makeEntry({
            principalType: 'share_link',
            principalId: 'sl1',
            permissionLevel: 'viewer',
            blockDownload: true,
            expiresAt: '2025-06-01T00:00:00.000Z',
          }),
        ],
      });
      const binary = ACLDocumentSerializer.serialize(acl);
      const result = ACLDocumentSerializer.deserialize(binary);

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].principalType).toBe('user');
      expect(result.entries[1].principalType).toBe('group');
      expect(result.entries[1].ipRange).toBe('10.0.0.0/8');
      expect(result.entries[2].principalType).toBe('share_link');
      expect(result.entries[2].blockDownload).toBe(true);
      expect(result.entries[2].expiresAt).toBe('2025-06-01T00:00:00.000Z');
    });

    it('round-trips with unicode strings', () => {
      const acl = makeACL({
        id: 'acl-日本語',
        updatedBy: 'ユーザー',
        entries: [
          makeEntry({
            principalId: 'пользователь',
            permissionLevel: 'éditeur',
            ipRange: '10.0.0.0/8',
          }),
        ],
      });
      const binary = ACLDocumentSerializer.serialize(acl);
      const result = ACLDocumentSerializer.deserialize(binary);
      expect(result.id).toBe('acl-日本語');
      expect(result.updatedBy).toBe('ユーザー');
      expect(result.entries[0].principalId).toBe('пользователь');
      expect(result.entries[0].permissionLevel).toBe('éditeur');
    });

    it('round-trips with partial optional fields (only some set)', () => {
      const acl = makeACL({
        entries: [
          makeEntry({
            ipRange: '172.16.0.0/12',
            expiresAt: '2025-03-15T00:00:00.000Z',
            // no customPermissionSetId, no time window
          }),
        ],
      });
      const binary = ACLDocumentSerializer.serialize(acl);
      const result = ACLDocumentSerializer.deserialize(binary);

      const entry = result.entries[0];
      expect(entry.ipRange).toBe('172.16.0.0/12');
      expect(entry.expiresAt).toBe('2025-03-15T00:00:00.000Z');
      expect(entry.customPermissionSetId).toBeUndefined();
      expect(entry.timeWindowStart).toBeUndefined();
      expect(entry.timeWindowEnd).toBeUndefined();
      expect(entry.timeWindowTimezone).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws on data too short', () => {
      expect(() =>
        ACLDocumentSerializer.deserialize(new Uint8Array(5)),
      ).toThrow(DeserializationError);
    });

    it('throws on CRC mismatch', () => {
      const acl = makeACL();
      const binary = ACLDocumentSerializer.serialize(acl);
      // Flip a byte in the middle of the payload
      binary[10] ^= 0xff;
      expect(() => ACLDocumentSerializer.deserialize(binary)).toThrow(
        /CRC-16 mismatch/,
      );
    });

    it('throws on bad version byte (via CRC mismatch since CRC checked first)', () => {
      const acl = makeACL();
      const binary = ACLDocumentSerializer.serialize(acl);
      binary[0] = 0xff;
      expect(() => ACLDocumentSerializer.deserialize(binary)).toThrow(
        DeserializationError,
      );
    });

    it('throws on truncated data', () => {
      const acl = makeACL();
      const binary = ACLDocumentSerializer.serialize(acl);
      const truncated = binary.subarray(0, 20);
      expect(() => ACLDocumentSerializer.deserialize(truncated)).toThrow(
        DeserializationError,
      );
    });

    it('throws on invalid principal type byte', () => {
      const acl = makeACL();
      const binary = ACLDocumentSerializer.serialize(acl);

      // Find the principal type byte: after version(1) + id(4+len) + createdAt(8) + updatedAt(8) + updatedBy(4+len) + entryCount(2)
      // id = 'acl-001' (7 bytes), updatedBy = 'admin001' (8 bytes)
      // offset = 1 + 4+7 + 8 + 8 + 4+8 + 2 = 42
      const ptOffset = 42;

      // We need to fix the CRC after modifying the byte
      // Set an invalid principal type
      binary[ptOffset] = 0xff;

      // Recompute CRC
      const crc = new CrcService();
      const crcBytes = crc.crc16(binary.subarray(0, binary.length - 2));
      binary[binary.length - 2] = crcBytes[0];
      binary[binary.length - 1] = crcBytes[1];

      expect(() => ACLDocumentSerializer.deserialize(binary)).toThrow(
        /Invalid principal type/,
      );
    });
  });

  describe('determinism', () => {
    it('produces identical bytes for the same input', () => {
      const acl = makeACL({
        entries: [
          makeEntry({
            ipRange: '10.0.0.0/8',
            expiresAt: '2025-06-01T00:00:00.000Z',
          }),
        ],
      });
      const a = ACLDocumentSerializer.serialize(acl);
      const b = ACLDocumentSerializer.serialize(acl);
      expect(a).toEqual(b);
    });
  });

  describe('version byte', () => {
    it('first byte is 0x01', () => {
      const acl = makeACL();
      const binary = ACLDocumentSerializer.serialize(acl);
      expect(binary[0]).toBe(0x01);
    });
  });
});
