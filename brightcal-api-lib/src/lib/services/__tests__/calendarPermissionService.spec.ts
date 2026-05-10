/**
 * CalendarPermissionService — unit tests.
 *
 * Tests share/revoke operations, public link generation, permission queries,
 * and default permission management using in-memory BrightDb.
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.9
 */

import { CalendarPermissionLevel } from '@brightchain/brightcal-lib';
import {
  initializeBrightChain,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
  validBlockSizes,
} from '@brightchain/brightchain-lib';
import { BrightDb, InMemoryHeadRegistry } from '@brightchain/db';
import { createCalendarCollectionModel } from '../../models/calendarCollection.model.ts';
import { createCalendarShareModel } from '../../models/calendarShare.model.ts';
import { CalendarEngineService } from '../calendarEngineService.ts';
import { CalendarPermissionService } from '../calendarPermissionService.ts';
import { EncryptionService } from '../encryptionService.ts';

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(() => {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
});

function makeDb(name = 'testdb'): BrightDb {
  const store = new MemoryBlockStore(validBlockSizes);
  const registry = InMemoryHeadRegistry.createIsolated();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new BrightDb(store as any, { name, headRegistry: registry });
}

function createServices() {
  const db = makeDb();
  const calendarModel = createCalendarCollectionModel(db);
  const shareModel = createCalendarShareModel(db);
  const encryption = new EncryptionService();
  const engine = new CalendarEngineService(
    calendarModel,
    shareModel,
    encryption,
  );
  const permissions = new CalendarPermissionService(calendarModel, shareModel);
  return { engine, permissions, calendarModel, shareModel, db };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CalendarPermissionService', () => {
  describe('shareCalendar', () => {
    it('should share a calendar with a user', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Work', '#FF5733', '');

      const share = await permissions.shareCalendar(
        cal.id,
        'owner-1',
        'user-2',
        CalendarPermissionLevel.Viewer,
      );

      expect(share.calendarId).toBe(cal.id);
      expect(share.grantedToUserId).toBe('user-2');
      expect(share.permission).toBe(CalendarPermissionLevel.Viewer);
      expect(share.id).toBeDefined();
      expect(share.dateCreated).toBeInstanceOf(Date);
    });

    it('should throw FORBIDDEN if not the owner', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Work', '#FF5733', '');

      await expect(
        permissions.shareCalendar(
          cal.id,
          'not-owner',
          'user-2',
          CalendarPermissionLevel.Viewer,
        ),
      ).rejects.toThrow('FORBIDDEN');
    });

    it('should throw NOT_FOUND for non-existent calendar', async () => {
      const { permissions } = createServices();

      await expect(
        permissions.shareCalendar(
          'nonexistent',
          'owner-1',
          'user-2',
          CalendarPermissionLevel.Viewer,
        ),
      ).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('shareCalendarWithGroup', () => {
    it('should share a calendar with a group', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Team', '#4285F4', '');

      const share = await permissions.shareCalendarWithGroup(
        cal.id,
        'owner-1',
        'group-1',
        CalendarPermissionLevel.Editor,
      );

      expect(share.calendarId).toBe(cal.id);
      expect(share.grantedToGroupId).toBe('group-1');
      expect(share.permission).toBe(CalendarPermissionLevel.Editor);
    });

    it('should throw FORBIDDEN if not the owner', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Team', '#4285F4', '');

      await expect(
        permissions.shareCalendarWithGroup(
          cal.id,
          'not-owner',
          'group-1',
          CalendarPermissionLevel.Editor,
        ),
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('revokeShare', () => {
    it('should revoke a specific share', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Work', '#FF5733', '');
      const share = await permissions.shareCalendar(
        cal.id,
        'owner-1',
        'user-2',
        CalendarPermissionLevel.Viewer,
      );

      const result = await permissions.revokeShare(cal.id, 'owner-1', share.id);
      expect(result).toBe(true);

      // Permission should be gone
      const perm = await permissions.getPermissionForUser(cal.id, 'user-2');
      expect(perm).toBeNull();
    });

    it('should return false for non-existent share', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Work', '#FF5733', '');

      const result = await permissions.revokeShare(
        cal.id,
        'owner-1',
        'nonexistent',
      );
      expect(result).toBe(false);
    });

    it('should throw FORBIDDEN if not the owner', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Work', '#FF5733', '');
      const share = await permissions.shareCalendar(
        cal.id,
        'owner-1',
        'user-2',
        CalendarPermissionLevel.Viewer,
      );

      await expect(
        permissions.revokeShare(cal.id, 'not-owner', share.id),
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('revokeUserAccess', () => {
    it('should revoke all shares for a user on a calendar', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Work', '#FF5733', '');
      await permissions.shareCalendar(
        cal.id,
        'owner-1',
        'user-2',
        CalendarPermissionLevel.Viewer,
      );
      await permissions.shareCalendar(
        cal.id,
        'owner-1',
        'user-2',
        CalendarPermissionLevel.Editor,
      );

      const result = await permissions.revokeUserAccess(
        cal.id,
        'owner-1',
        'user-2',
      );
      expect(result).toBe(true);

      const perm = await permissions.getPermissionForUser(cal.id, 'user-2');
      expect(perm).toBeNull();
    });

    it('should return false if user has no shares', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Work', '#FF5733', '');

      const result = await permissions.revokeUserAccess(
        cal.id,
        'owner-1',
        'user-2',
      );
      expect(result).toBe(false);
    });

    it('should throw FORBIDDEN if not the owner', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Work', '#FF5733', '');

      await expect(
        permissions.revokeUserAccess(cal.id, 'not-owner', 'user-2'),
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('generatePublicLink', () => {
    it('should generate a public link with viewer permission', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar(
        'owner-1',
        'Public',
        '#4285F4',
        '',
      );

      const share = await permissions.generatePublicLink(
        cal.id,
        'owner-1',
        CalendarPermissionLevel.Viewer,
      );

      expect(share.publicLink).toBeDefined();
      expect(share.publicLink).toMatch(
        /^https:\/\/cal\.brightchain\.org\/public\//,
      );
      expect(share.permission).toBe(CalendarPermissionLevel.Viewer);
      expect(share.calendarId).toBe(cal.id);
    });

    it('should generate a public link with freebusy permission', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar(
        'owner-1',
        'Public',
        '#4285F4',
        '',
      );

      const share = await permissions.generatePublicLink(
        cal.id,
        'owner-1',
        CalendarPermissionLevel.FreeBusyOnly,
      );

      expect(share.permission).toBe(CalendarPermissionLevel.FreeBusyOnly);
      expect(share.publicLink).toBeDefined();
    });

    it('should reject editor/owner permission for public links', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar(
        'owner-1',
        'Public',
        '#4285F4',
        '',
      );

      await expect(
        permissions.generatePublicLink(
          cal.id,
          'owner-1',
          CalendarPermissionLevel.Editor,
        ),
      ).rejects.toThrow('INVALID_PERMISSION');

      await expect(
        permissions.generatePublicLink(
          cal.id,
          'owner-1',
          CalendarPermissionLevel.Owner,
        ),
      ).rejects.toThrow('INVALID_PERMISSION');
    });

    it('should replace existing public link', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar(
        'owner-1',
        'Public',
        '#4285F4',
        '',
      );

      const first = await permissions.generatePublicLink(
        cal.id,
        'owner-1',
        CalendarPermissionLevel.Viewer,
      );
      const second = await permissions.generatePublicLink(
        cal.id,
        'owner-1',
        CalendarPermissionLevel.FreeBusyOnly,
      );

      expect(second.publicLink).not.toBe(first.publicLink);

      // Only one public link share should exist
      const shares = await permissions.getSharesForCalendar(cal.id, 'owner-1');
      const publicShares = shares.filter((s) => s.publicLink);
      expect(publicShares).toHaveLength(1);
      expect(publicShares[0].publicLink).toBe(second.publicLink);
    });

    it('should throw FORBIDDEN if not the owner', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar(
        'owner-1',
        'Public',
        '#4285F4',
        '',
      );

      await expect(
        permissions.generatePublicLink(
          cal.id,
          'not-owner',
          CalendarPermissionLevel.Viewer,
        ),
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('revokePublicLink', () => {
    it('should revoke the public link', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar(
        'owner-1',
        'Public',
        '#4285F4',
        '',
      );
      await permissions.generatePublicLink(
        cal.id,
        'owner-1',
        CalendarPermissionLevel.Viewer,
      );

      const result = await permissions.revokePublicLink(cal.id, 'owner-1');
      expect(result).toBe(true);

      // No public link shares should remain
      const shares = await permissions.getSharesForCalendar(cal.id, 'owner-1');
      const publicShares = shares.filter((s) => s.publicLink);
      expect(publicShares).toHaveLength(0);
    });

    it('should return false if no public link exists', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Work', '#FF5733', '');

      const result = await permissions.revokePublicLink(cal.id, 'owner-1');
      expect(result).toBe(false);
    });

    it('should not affect user shares when revoking public link', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Work', '#FF5733', '');
      await permissions.shareCalendar(
        cal.id,
        'owner-1',
        'user-2',
        CalendarPermissionLevel.Viewer,
      );
      await permissions.generatePublicLink(
        cal.id,
        'owner-1',
        CalendarPermissionLevel.Viewer,
      );

      await permissions.revokePublicLink(cal.id, 'owner-1');

      // User share should still exist
      const perm = await permissions.getPermissionForUser(cal.id, 'user-2');
      expect(perm).toBe(CalendarPermissionLevel.Viewer);
    });
  });

  describe('getPermissionForUser', () => {
    it('should return Owner for the calendar owner', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Mine', '#111111', '');

      const perm = await permissions.getPermissionForUser(cal.id, 'owner-1');
      expect(perm).toBe(CalendarPermissionLevel.Owner);
    });

    it('should return the share permission for a shared user', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar(
        'owner-1',
        'Shared',
        '#222222',
        '',
      );
      await permissions.shareCalendar(
        cal.id,
        'owner-1',
        'user-2',
        CalendarPermissionLevel.Editor,
      );

      const perm = await permissions.getPermissionForUser(cal.id, 'user-2');
      expect(perm).toBe(CalendarPermissionLevel.Editor);
    });

    it('should return null for a user without access', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar(
        'owner-1',
        'Private',
        '#333333',
        '',
      );

      const perm = await permissions.getPermissionForUser(cal.id, 'stranger');
      expect(perm).toBeNull();
    });

    it('should return null for a non-existent calendar', async () => {
      const { permissions } = createServices();

      const perm = await permissions.getPermissionForUser(
        'nonexistent',
        'user-1',
      );
      expect(perm).toBeNull();
    });
  });

  describe('getSharesForCalendar', () => {
    it('should return all shares for a calendar', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Team', '#4285F4', '');
      await permissions.shareCalendar(
        cal.id,
        'owner-1',
        'user-2',
        CalendarPermissionLevel.Viewer,
      );
      await permissions.shareCalendar(
        cal.id,
        'owner-1',
        'user-3',
        CalendarPermissionLevel.Editor,
      );

      const shares = await permissions.getSharesForCalendar(cal.id, 'owner-1');
      expect(shares).toHaveLength(2);
    });

    it('should throw FORBIDDEN if not the owner', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Team', '#4285F4', '');

      await expect(
        permissions.getSharesForCalendar(cal.id, 'not-owner'),
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('setDefaultPermission', () => {
    it('should update the default permission on the calendar', async () => {
      const { engine, permissions, calendarModel } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Work', '#FF5733', '');

      await permissions.setDefaultPermission(
        cal.id,
        'owner-1',
        CalendarPermissionLevel.FreeBusyOnly,
      );

      const updated = await calendarModel.findById(cal.id);
      expect(updated).not.toBeNull();
      expect(updated!.defaultPermission).toBe(
        CalendarPermissionLevel.FreeBusyOnly,
      );
    });

    it('should throw FORBIDDEN if not the owner', async () => {
      const { engine, permissions } = createServices();
      const cal = await engine.createCalendar('owner-1', 'Work', '#FF5733', '');

      await expect(
        permissions.setDefaultPermission(
          cal.id,
          'not-owner',
          CalendarPermissionLevel.Viewer,
        ),
      ).rejects.toThrow('FORBIDDEN');
    });

    it('should throw NOT_FOUND for non-existent calendar', async () => {
      const { permissions } = createServices();

      await expect(
        permissions.setDefaultPermission(
          'nonexistent',
          'owner-1',
          CalendarPermissionLevel.Viewer,
        ),
      ).rejects.toThrow('NOT_FOUND');
    });
  });
});
