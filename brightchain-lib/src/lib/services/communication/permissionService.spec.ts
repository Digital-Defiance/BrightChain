import {
  DEFAULT_ROLE_PERMISSIONS,
  DefaultRole,
  Permission,
} from '../../enumerations/communication';
import { PermissionService } from './permissionService';

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    service = new PermissionService();
  });

  describe('assignRole / getMemberRole', () => {
    it('should return null for a member with no role', () => {
      expect(service.getMemberRole('member1', 'ctx1')).toBeNull();
    });

    it('should assign and retrieve a role', () => {
      service.assignRole('member1', 'ctx1', DefaultRole.MEMBER);
      expect(service.getMemberRole('member1', 'ctx1')).toBe(DefaultRole.MEMBER);
    });

    it('should scope roles per context', () => {
      service.assignRole('member1', 'ctx1', DefaultRole.ADMIN);
      service.assignRole('member1', 'ctx2', DefaultRole.MEMBER);
      expect(service.getMemberRole('member1', 'ctx1')).toBe(DefaultRole.ADMIN);
      expect(service.getMemberRole('member1', 'ctx2')).toBe(DefaultRole.MEMBER);
    });

    it('should overwrite an existing role', () => {
      service.assignRole('member1', 'ctx1', DefaultRole.MEMBER);
      service.assignRole('member1', 'ctx1', DefaultRole.MODERATOR);
      expect(service.getMemberRole('member1', 'ctx1')).toBe(
        DefaultRole.MODERATOR,
      );
    });
  });

  describe('hasPermission', () => {
    it('should return false when member has no role', () => {
      expect(
        service.hasPermission('member1', 'ctx1', Permission.SEND_MESSAGES),
      ).toBe(false);
    });

    it('should return true for permissions included in the role', () => {
      service.assignRole('member1', 'ctx1', DefaultRole.MEMBER);
      for (const perm of DEFAULT_ROLE_PERMISSIONS[DefaultRole.MEMBER]) {
        expect(service.hasPermission('member1', 'ctx1', perm)).toBe(true);
      }
    });

    it('should return false for permissions not included in the role', () => {
      service.assignRole('member1', 'ctx1', DefaultRole.MEMBER);
      expect(
        service.hasPermission('member1', 'ctx1', Permission.DELETE_ANY_MESSAGE),
      ).toBe(false);
    });

    it('should grant all permissions to OWNER', () => {
      service.assignRole('member1', 'ctx1', DefaultRole.OWNER);
      for (const perm of Object.values(Permission)) {
        expect(service.hasPermission('member1', 'ctx1', perm)).toBe(true);
      }
    });
  });

  describe('muteMember / isMuted', () => {
    it('should return false when member is not muted', () => {
      expect(service.isMuted('member1', 'ctx1')).toBe(false);
    });

    it('should return true when member is muted and mute has not expired', () => {
      service.muteMember('member1', 'ctx1', 60_000);
      expect(service.isMuted('member1', 'ctx1')).toBe(true);
    });

    it('should auto-clear expired mutes and return false', () => {
      // Mute for 0ms — already expired
      service.muteMember('member1', 'ctx1', 0);
      expect(service.isMuted('member1', 'ctx1')).toBe(false);
    });

    it('should scope mutes per context', () => {
      service.muteMember('member1', 'ctx1', 60_000);
      expect(service.isMuted('member1', 'ctx1')).toBe(true);
      expect(service.isMuted('member1', 'ctx2')).toBe(false);
    });

    it('should auto-clear mute after expiration using fake timers', () => {
      jest.useFakeTimers();
      try {
        service.muteMember('member1', 'ctx1', 5_000);
        expect(service.isMuted('member1', 'ctx1')).toBe(true);

        jest.advanceTimersByTime(5_000);
        expect(service.isMuted('member1', 'ctx1')).toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
