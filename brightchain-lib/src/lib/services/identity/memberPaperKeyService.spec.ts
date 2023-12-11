/**
 * Unit tests for MemberPaperKeyService.
 *
 * Validates Requirements 1.5, 1.6, 1.7
 */

import { PaperKeyPurpose } from '../../enumerations/paperKeyPurpose';
import {
  MemberPaperKeyService,
  PaperKeyAlreadyUsedError,
  PaperKeyNotFoundError,
  PaperKeyRevokedError,
} from './memberPaperKeyService';

describe('MemberPaperKeyService', () => {
  let service: MemberPaperKeyService;
  const memberId = 'member-001';

  beforeEach(() => {
    service = new MemberPaperKeyService();
  });

  describe('addPaperKey', () => {
    it('should create paper key metadata with correct purpose', () => {
      const metadata = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);

      expect(metadata.id).toBeDefined();
      expect(metadata.purpose).toBe(PaperKeyPurpose.BACKUP);
      expect(metadata.createdAt).toBeInstanceOf(Date);
      expect(metadata.usedAt).toBeUndefined();
      expect(metadata.revokedAt).toBeUndefined();
      expect(metadata.deviceId).toBeUndefined();
    });

    it('should support all paper key purposes', () => {
      const backup = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      const provisioning = service.addPaperKey(
        memberId,
        PaperKeyPurpose.DEVICE_PROVISIONING,
      );
      const recovery = service.addPaperKey(memberId, PaperKeyPurpose.RECOVERY);

      expect(backup.purpose).toBe(PaperKeyPurpose.BACKUP);
      expect(provisioning.purpose).toBe(PaperKeyPurpose.DEVICE_PROVISIONING);
      expect(recovery.purpose).toBe(PaperKeyPurpose.RECOVERY);
    });

    it('should generate unique IDs for each paper key', () => {
      const pk1 = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      const pk2 = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);

      expect(pk1.id).not.toBe(pk2.id);
    });

    it('should record a "created" audit entry', () => {
      const metadata = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      const auditLog = service.getAuditLog(memberId);

      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].action).toBe('created');
      expect(auditLog[0].paperKeyId).toBe(metadata.id);
      expect(auditLog[0].memberId).toBe(memberId);
    });

    it('should allow multiple paper keys per member', () => {
      service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.addPaperKey(memberId, PaperKeyPurpose.RECOVERY);

      expect(service.getPaperKeys(memberId)).toHaveLength(2);
    });
  });

  describe('markPaperKeyUsed', () => {
    it('should set usedAt timestamp', () => {
      const metadata = service.addPaperKey(
        memberId,
        PaperKeyPurpose.DEVICE_PROVISIONING,
      );
      const before = new Date();

      service.markPaperKeyUsed(memberId, metadata.id);

      const updated = service.getPaperKey(memberId, metadata.id);
      expect(updated.usedAt).toBeInstanceOf(Date);
      expect(updated.usedAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });

    it('should associate a device ID when provided', () => {
      const metadata = service.addPaperKey(
        memberId,
        PaperKeyPurpose.DEVICE_PROVISIONING,
      );
      const deviceId = 'device-abc';

      service.markPaperKeyUsed(memberId, metadata.id, deviceId);

      const updated = service.getPaperKey(memberId, metadata.id);
      expect(updated.deviceId).toBe(deviceId);
    });

    it('should record a "used" audit entry', () => {
      const metadata = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.markPaperKeyUsed(memberId, metadata.id);

      const auditLog = service.getAuditLog(memberId);
      const usedEntry = auditLog.find((e) => e.action === 'used');

      expect(usedEntry).toBeDefined();
      expect(usedEntry!.paperKeyId).toBe(metadata.id);
    });

    it('should record device ID in audit entry when provided', () => {
      const metadata = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.markPaperKeyUsed(memberId, metadata.id, 'device-xyz');

      const auditLog = service.getAuditLog(memberId);
      const usedEntry = auditLog.find((e) => e.action === 'used');

      expect(usedEntry!.deviceId).toBe('device-xyz');
    });

    it('should throw PaperKeyNotFoundError for unknown paper key', () => {
      expect(() => service.markPaperKeyUsed(memberId, 'nonexistent')).toThrow(
        PaperKeyNotFoundError,
      );
    });

    it('should throw PaperKeyNotFoundError for unknown member', () => {
      expect(() =>
        service.markPaperKeyUsed('unknown-member', 'nonexistent'),
      ).toThrow(PaperKeyNotFoundError);
    });

    it('should throw PaperKeyRevokedError for revoked paper key', () => {
      const metadata = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.revokePaperKey(memberId, metadata.id, 'Compromised');

      expect(() => service.markPaperKeyUsed(memberId, metadata.id)).toThrow(
        PaperKeyRevokedError,
      );
    });

    it('should throw PaperKeyAlreadyUsedError when used twice', () => {
      const metadata = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.markPaperKeyUsed(memberId, metadata.id);

      expect(() => service.markPaperKeyUsed(memberId, metadata.id)).toThrow(
        PaperKeyAlreadyUsedError,
      );
    });
  });

  describe('revokePaperKey', () => {
    it('should set revokedAt timestamp', () => {
      const metadata = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      const before = new Date();

      service.revokePaperKey(memberId, metadata.id, 'Compromised');

      const updated = service.getPaperKey(memberId, metadata.id);
      expect(updated.revokedAt).toBeInstanceOf(Date);
      expect(updated.revokedAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });

    it('should record a "revoked" audit entry with reason', () => {
      const metadata = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.revokePaperKey(memberId, metadata.id, 'Lost physical copy');

      const auditLog = service.getAuditLog(memberId);
      const revokedEntry = auditLog.find((e) => e.action === 'revoked');

      expect(revokedEntry).toBeDefined();
      expect(revokedEntry!.reason).toBe('Lost physical copy');
      expect(revokedEntry!.paperKeyId).toBe(metadata.id);
    });

    it('should allow revocation without a reason', () => {
      const metadata = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.revokePaperKey(memberId, metadata.id);

      const updated = service.getPaperKey(memberId, metadata.id);
      expect(updated.revokedAt).toBeInstanceOf(Date);
    });

    it('should throw PaperKeyNotFoundError for unknown paper key', () => {
      expect(() => service.revokePaperKey(memberId, 'nonexistent')).toThrow(
        PaperKeyNotFoundError,
      );
    });

    it('should throw PaperKeyRevokedError when revoking twice', () => {
      const metadata = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.revokePaperKey(memberId, metadata.id);

      expect(() => service.revokePaperKey(memberId, metadata.id)).toThrow(
        PaperKeyRevokedError,
      );
    });

    it('should allow revoking a used paper key', () => {
      const metadata = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.markPaperKeyUsed(memberId, metadata.id);
      service.revokePaperKey(memberId, metadata.id, 'No longer needed');

      const updated = service.getPaperKey(memberId, metadata.id);
      expect(updated.usedAt).toBeDefined();
      expect(updated.revokedAt).toBeDefined();
    });
  });

  describe('getPaperKeys', () => {
    it('should return empty array for unknown member', () => {
      expect(service.getPaperKeys('unknown')).toEqual([]);
    });

    it('should return all paper keys for a member', () => {
      service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.addPaperKey(memberId, PaperKeyPurpose.RECOVERY);

      const keys = service.getPaperKeys(memberId);
      expect(keys).toHaveLength(2);
    });

    it('should return a copy that cannot mutate internal state', () => {
      service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      const keys = service.getPaperKeys(memberId);

      // Mutating the returned array should not affect the service
      (keys as IPaperKeyMetadataArray).length = 0;
      expect(service.getPaperKeys(memberId)).toHaveLength(1);
    });
  });

  describe('getActivePaperKeys', () => {
    it('should exclude revoked paper keys', () => {
      const pk1 = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.addPaperKey(memberId, PaperKeyPurpose.RECOVERY);
      service.revokePaperKey(memberId, pk1.id);

      const active = service.getActivePaperKeys(memberId);
      expect(active).toHaveLength(1);
      expect(active[0].purpose).toBe(PaperKeyPurpose.RECOVERY);
    });

    it('should include used but non-revoked paper keys', () => {
      const pk = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.markPaperKeyUsed(memberId, pk.id);

      const active = service.getActivePaperKeys(memberId);
      expect(active).toHaveLength(1);
    });
  });

  describe('isRevoked / isUsed', () => {
    it('should return false for fresh paper key', () => {
      const pk = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);

      expect(service.isRevoked(memberId, pk.id)).toBe(false);
      expect(service.isUsed(memberId, pk.id)).toBe(false);
    });

    it('should return true after marking as used', () => {
      const pk = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.markPaperKeyUsed(memberId, pk.id);

      expect(service.isUsed(memberId, pk.id)).toBe(true);
    });

    it('should return true after revoking', () => {
      const pk = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.revokePaperKey(memberId, pk.id);

      expect(service.isRevoked(memberId, pk.id)).toBe(true);
    });
  });

  describe('getAuditLog', () => {
    it('should return empty array for unknown member', () => {
      expect(service.getAuditLog('unknown')).toEqual([]);
    });

    it('should track full lifecycle in order', () => {
      const pk = service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.markPaperKeyUsed(memberId, pk.id, 'device-1');
      service.revokePaperKey(memberId, pk.id, 'Done');

      const log = service.getAuditLog(memberId);
      expect(log).toHaveLength(3);
      expect(log[0].action).toBe('created');
      expect(log[1].action).toBe('used');
      expect(log[1].deviceId).toBe('device-1');
      expect(log[2].action).toBe('revoked');
      expect(log[2].reason).toBe('Done');
    });

    it('should return a copy that cannot mutate internal state', () => {
      service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      const log = service.getAuditLog(memberId);

      (log as IPaperKeyAuditEntryArray).length = 0;
      expect(service.getAuditLog(memberId)).toHaveLength(1);
    });
  });

  describe('clearMemberData', () => {
    it('should remove all paper keys and audit entries for a member', () => {
      service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.addPaperKey(memberId, PaperKeyPurpose.RECOVERY);

      service.clearMemberData(memberId);

      expect(service.getPaperKeys(memberId)).toEqual([]);
      expect(service.getAuditLog(memberId)).toEqual([]);
    });

    it('should not affect other members', () => {
      const otherMember = 'member-002';
      service.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      service.addPaperKey(otherMember, PaperKeyPurpose.RECOVERY);

      service.clearMemberData(memberId);

      expect(service.getPaperKeys(memberId)).toEqual([]);
      expect(service.getPaperKeys(otherMember)).toHaveLength(1);
    });
  });

  describe('custom idFactory', () => {
    it('should use the provided ID factory', () => {
      let counter = 0;
      const customService = new MemberPaperKeyService<string>(
        () => `custom-${++counter}`,
      );

      const pk1 = customService.addPaperKey(memberId, PaperKeyPurpose.BACKUP);
      const pk2 = customService.addPaperKey(memberId, PaperKeyPurpose.RECOVERY);

      expect(pk1.id).toBe('custom-1');
      expect(pk2.id).toBe('custom-2');
    });
  });

  describe('member isolation', () => {
    it('should keep paper keys separate between members', () => {
      const member1 = 'member-A';
      const member2 = 'member-B';

      service.addPaperKey(member1, PaperKeyPurpose.BACKUP);
      service.addPaperKey(member1, PaperKeyPurpose.RECOVERY);
      service.addPaperKey(member2, PaperKeyPurpose.BACKUP);

      expect(service.getPaperKeys(member1)).toHaveLength(2);
      expect(service.getPaperKeys(member2)).toHaveLength(1);
    });

    it('should not allow cross-member paper key access', () => {
      const member1 = 'member-A';
      const member2 = 'member-B';

      const pk = service.addPaperKey(member1, PaperKeyPurpose.BACKUP);

      expect(() => service.markPaperKeyUsed(member2, pk.id)).toThrow(
        PaperKeyNotFoundError,
      );
    });
  });
});

// Type aliases to allow mutation of readonly arrays in tests
type IPaperKeyMetadataArray = { length: number };
type IPaperKeyAuditEntryArray = { length: number };
