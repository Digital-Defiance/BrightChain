/**
 * CalendarEngineService — unit tests.
 *
 * Tests calendar CRUD with permission checks, default calendar creation,
 * and ICS feed subscription management using in-memory BrightDb.
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
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

function createService() {
  const db = makeDb();
  const calendarModel = createCalendarCollectionModel(db);
  const shareModel = createCalendarShareModel(db);
  const encryption = new EncryptionService();
  const service = new CalendarEngineService(
    calendarModel,
    shareModel,
    encryption,
  );
  return { service, calendarModel, shareModel, db };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CalendarEngineService', () => {
  describe('createCalendar', () => {
    it('should create a calendar with the given properties', async () => {
      const { service } = createService();
      const cal = await service.createCalendar(
        'user-1',
        'Work',
        '#FF5733',
        'Work events',
      );

      expect(cal.ownerId).toBe('user-1');
      expect(cal.displayName).toBe('Work');
      expect(cal.color).toBe('#FF5733');
      expect(cal.description).toBe('Work events');
      expect(cal.isDefault).toBe(false);
      expect(cal.isSubscription).toBe(false);
      expect(cal.id).toBeDefined();
      expect(cal.dateCreated).toBeInstanceOf(Date);
      expect(cal.dateModified).toBeInstanceOf(Date);
    });

    it('should persist the calendar in the database', async () => {
      const { service, calendarModel } = createService();
      const cal = await service.createCalendar(
        'user-1',
        'Personal',
        '#4285F4',
        '',
      );

      const found = await calendarModel.findById(cal.id);
      expect(found).not.toBeNull();
      expect(found!.displayName).toBe('Personal');
    });
  });

  describe('listCalendarsForUser', () => {
    it('should return owned calendars with Owner permission', async () => {
      const { service } = createService();
      await service.createCalendar('user-1', 'Cal A', '#111111', '');
      await service.createCalendar('user-1', 'Cal B', '#222222', '');
      await service.createCalendar('user-2', 'Cal C', '#333333', '');

      const list = await service.listCalendarsForUser('user-1');
      expect(list).toHaveLength(2);
      expect(
        list.every((c) => c.permission === CalendarPermissionLevel.Owner),
      ).toBe(true);
    });

    it('should include shared calendars with their permission level', async () => {
      const { service, shareModel } = createService();
      const ownedCal = await service.createCalendar(
        'user-1',
        'Mine',
        '#111111',
        '',
      );
      const sharedCal = await service.createCalendar(
        'user-2',
        'Theirs',
        '#222222',
        '',
      );

      // Create a share granting user-1 viewer access to user-2's calendar
      await shareModel.insertOne({
        id: 'share-1',
        calendarId: sharedCal.id,
        grantedToUserId: 'user-1',
        permission: CalendarPermissionLevel.Viewer,
        dateCreated: new Date(),
      });

      const list = await service.listCalendarsForUser('user-1');
      expect(list).toHaveLength(2);

      const owned = list.find((c) => c.id === ownedCal.id);
      const shared = list.find((c) => c.id === sharedCal.id);
      expect(owned!.permission).toBe(CalendarPermissionLevel.Owner);
      expect(shared!.permission).toBe(CalendarPermissionLevel.Viewer);
    });

    it('should not duplicate a calendar if user owns it and has a share', async () => {
      const { service, shareModel } = createService();
      const cal = await service.createCalendar('user-1', 'Mine', '#111111', '');

      // Redundant share for the owner
      await shareModel.insertOne({
        id: 'share-dup',
        calendarId: cal.id,
        grantedToUserId: 'user-1',
        permission: CalendarPermissionLevel.Editor,
        dateCreated: new Date(),
      });

      const list = await service.listCalendarsForUser('user-1');
      expect(list).toHaveLength(1);
      expect(list[0].permission).toBe(CalendarPermissionLevel.Owner);
    });
  });

  describe('getCalendarById', () => {
    it('should return calendar with Owner permission for the owner', async () => {
      const { service } = createService();
      const cal = await service.createCalendar('user-1', 'Test', '#AABBCC', '');

      const result = await service.getCalendarById(cal.id, 'user-1');
      expect(result).not.toBeNull();
      expect(result!.calendar.id).toBe(cal.id);
      expect(result!.permission).toBe(CalendarPermissionLevel.Owner);
    });

    it('should return calendar with share permission for shared user', async () => {
      const { service, shareModel } = createService();
      const cal = await service.createCalendar('user-1', 'Test', '#AABBCC', '');

      await shareModel.insertOne({
        id: 'share-2',
        calendarId: cal.id,
        grantedToUserId: 'user-2',
        permission: CalendarPermissionLevel.Editor,
        dateCreated: new Date(),
      });

      const result = await service.getCalendarById(cal.id, 'user-2');
      expect(result).not.toBeNull();
      expect(result!.permission).toBe(CalendarPermissionLevel.Editor);
    });

    it('should return null for non-existent calendar', async () => {
      const { service } = createService();
      const result = await service.getCalendarById('nonexistent', 'user-1');
      expect(result).toBeNull();
    });

    it('should return null for user without access', async () => {
      const { service } = createService();
      const cal = await service.createCalendar(
        'user-1',
        'Private',
        '#AABBCC',
        '',
      );

      const result = await service.getCalendarById(cal.id, 'user-3');
      expect(result).toBeNull();
    });
  });

  describe('updateCalendar', () => {
    it('should update calendar fields for the owner', async () => {
      const { service } = createService();
      const cal = await service.createCalendar(
        'user-1',
        'Old Name',
        '#111111',
        'old desc',
      );

      const updated = await service.updateCalendar(cal.id, 'user-1', {
        displayName: 'New Name',
        color: '#222222',
        description: 'new desc',
      });

      expect(updated).not.toBeNull();
      expect(updated!.displayName).toBe('New Name');
      expect(updated!.color).toBe('#222222');
      expect(updated!.description).toBe('new desc');
    });

    it('should throw FORBIDDEN for non-owner', async () => {
      const { service } = createService();
      const cal = await service.createCalendar('user-1', 'Test', '#111111', '');

      await expect(
        service.updateCalendar(cal.id, 'user-2', { displayName: 'Hacked' }),
      ).rejects.toThrow('FORBIDDEN');
    });

    it('should return null for non-existent calendar', async () => {
      const { service } = createService();
      const result = await service.updateCalendar('nonexistent', 'user-1', {
        displayName: 'X',
      });
      expect(result).toBeNull();
    });

    it('should update dateModified', async () => {
      const { service } = createService();
      const cal = await service.createCalendar('user-1', 'Test', '#111111', '');
      const originalModified = cal.dateModified;

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      const updated = await service.updateCalendar(cal.id, 'user-1', {
        displayName: 'Updated',
      });

      expect(updated!.dateModified.getTime()).toBeGreaterThanOrEqual(
        originalModified.getTime(),
      );
    });
  });

  describe('deleteCalendar', () => {
    it('should delete calendar and associated shares', async () => {
      const { service, calendarModel, shareModel } = createService();
      const cal = await service.createCalendar(
        'user-1',
        'ToDelete',
        '#111111',
        '',
      );

      await shareModel.insertOne({
        id: 'share-del',
        calendarId: cal.id,
        grantedToUserId: 'user-2',
        permission: CalendarPermissionLevel.Viewer,
        dateCreated: new Date(),
      });

      const deleted = await service.deleteCalendar(cal.id, 'user-1');
      expect(deleted).toBe(true);

      // Calendar should be gone
      const found = await calendarModel.findById(cal.id);
      expect(found).toBeNull();

      // Shares should be gone
      const shares = await shareModel
        .find({ calendarId: cal.id } as any)
        .toArray();
      expect(shares).toHaveLength(0);
    });

    it('should throw FORBIDDEN for non-owner', async () => {
      const { service } = createService();
      const cal = await service.createCalendar('user-1', 'Test', '#111111', '');

      await expect(service.deleteCalendar(cal.id, 'user-2')).rejects.toThrow(
        'FORBIDDEN',
      );
    });

    it('should return false for non-existent calendar', async () => {
      const { service } = createService();
      const result = await service.deleteCalendar('nonexistent', 'user-1');
      expect(result).toBe(false);
    });
  });

  describe('createDefaultCalendar', () => {
    it('should create a default Personal calendar', async () => {
      const { service } = createService();
      const cal = await service.createDefaultCalendar('user-1');

      expect(cal.displayName).toBe('Personal');
      expect(cal.color).toBe('#4285F4');
      expect(cal.isDefault).toBe(true);
      expect(cal.isSubscription).toBe(false);
      expect(cal.ownerId).toBe('user-1');
      expect(cal.description).toBe('');
    });

    it('should persist the default calendar', async () => {
      const { service, calendarModel } = createService();
      const cal = await service.createDefaultCalendar('user-1');

      const found = await calendarModel.findById(cal.id);
      expect(found).not.toBeNull();
      expect(found!.isDefault).toBe(true);
    });
  });

  describe('subscribeToFeed', () => {
    it('should create a subscription calendar', async () => {
      const { service } = createService();
      const cal = await service.subscribeToFeed(
        'user-1',
        'https://example.com/feed.ics',
        'Holidays',
        60,
      );

      expect(cal.isSubscription).toBe(true);
      expect(cal.subscriptionUrl).toBe('https://example.com/feed.ics');
      expect(cal.subscriptionRefreshInterval).toBe(60);
      expect(cal.displayName).toBe('Holidays');
      expect(cal.ownerId).toBe('user-1');
      expect(cal.subscriptionLastRefreshed).toBeInstanceOf(Date);
    });

    it('should persist the subscription calendar', async () => {
      const { service, calendarModel } = createService();
      const cal = await service.subscribeToFeed(
        'user-1',
        'https://example.com/feed.ics',
        'Holidays',
        30,
      );

      const found = await calendarModel.findById(cal.id);
      expect(found).not.toBeNull();
      expect(found!.isSubscription).toBe(true);
      expect(found!.subscriptionUrl).toBe('https://example.com/feed.ics');
    });
  });

  describe('refreshSubscription', () => {
    it('should update the subscriptionLastRefreshed timestamp', async () => {
      const { service, calendarModel } = createService();
      const cal = await service.subscribeToFeed(
        'user-1',
        'https://example.com/feed.ics',
        'Feed',
        60,
      );

      const originalRefreshed = cal.subscriptionLastRefreshed!;

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      await service.refreshSubscription(cal.id);

      const updated = await calendarModel.findById(cal.id);
      expect(updated).not.toBeNull();
      expect(
        updated!.subscriptionLastRefreshed!.getTime(),
      ).toBeGreaterThanOrEqual(originalRefreshed.getTime());
    });
  });
});
