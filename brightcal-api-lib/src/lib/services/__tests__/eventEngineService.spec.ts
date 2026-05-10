/**
 * EventEngineService — unit tests.
 *
 * Tests event CRUD with permission checks, UUID assignment, SEQUENCE management,
 * and recurrence exception handling using in-memory BrightDb.
 *
 * @see Requirements 4.8, 4.9, 5.5, 5.6, 5.7
 */

import {
  EventTransparency,
  EventVisibility,
  RecurrenceFrequency,
} from '@brightchain/brightcal-lib';
import {
  initializeBrightChain,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
  validBlockSizes,
} from '@brightchain/brightchain-lib';
import { BrightDb, InMemoryHeadRegistry } from '@brightchain/db';
import type { ICreateEventBody } from '../../controllers/eventController.ts';
import { createCalendarCollectionModel } from '../../models/calendarCollection.model.ts';
import { createCalendarEventModel } from '../../models/calendarEvent.model.ts';
import { createCalendarShareModel } from '../../models/calendarShare.model.ts';
import { CalendarEngineService } from '../calendarEngineService.ts';
import { decryptEventBody } from '../calendarEventCrypto.ts';
import { CalendarPermissionService } from '../calendarPermissionService.ts';
import { EncryptionService } from '../encryptionService.ts';
import { EventEngineService } from '../eventEngineService.ts';

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
  const eventModel = createCalendarEventModel(db);
  const encryption = new EncryptionService();
  const calendarService = new CalendarEngineService(
    calendarModel,
    shareModel,
    encryption,
  );
  const permissionService = new CalendarPermissionService(
    calendarModel,
    shareModel,
  );
  const eventService = new EventEngineService(
    eventModel,
    calendarModel,
    permissionService,
    encryption,
  );

  /** Helper to decrypt an event retrieved from the model. */
  async function decryptEvent(event: NonNullable<Awaited<ReturnType<typeof eventModel.findById>>>) {
    const calendar = await calendarModel.findById(event.calendarId);
    if (!calendar?.encryptionKey) throw new Error('No encryption key');
    return decryptEventBody(event, calendar.encryptionKey, encryption);
  }

  return {
    eventService,
    calendarService,
    permissionService,
    eventModel,
    calendarModel,
    shareModel,
    encryption,
    decryptEvent,
    db,
  };
}

/** Helper to create a calendar owned by the given user. */
async function setupCalendar(
  calendarService: CalendarEngineService,
  ownerId: string,
) {
  return calendarService.createCalendar(ownerId, 'Test Cal', '#4285F4', '');
}

/** Helper to build a valid ICreateEventBody. */
function makeEventBody(
  calendarId: string,
  overrides: Partial<ICreateEventBody> = {},
): ICreateEventBody {
  return {
    calendarId,
    summary: 'Team Standup',
    dtstart: '2024-06-15T09:00:00Z',
    dtend: '2024-06-15T09:30:00Z',
    dtstartTzid: 'America/New_York',
    dtendTzid: 'America/New_York',
    allDay: false,
    visibility: EventVisibility.Public,
    transparency: EventTransparency.Opaque,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('EventEngineService', () => {
  describe('createEvent', () => {
    it('should create an event with a UUID uid and sequence 0', async () => {
      const { eventService, calendarService } = createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      const event = await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id),
      );

      expect(event.uid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(event.sequence).toBe(0);
      expect(event.status).toBe('CONFIRMED');
      expect(event.calendarId).toBe(cal.id);
      expect(event.summary).toBe('Team Standup');
      expect(event.organizerId).toBe('user-1');
      expect(event.dtstart).toBeInstanceOf(Date);
      expect(event.dtend).toBeInstanceOf(Date);
    });

    it('should generate searchText from summary, description, and location', async () => {
      const { eventService, calendarService } = createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      const event = await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id, {
          description: 'Daily sync',
          location: 'Room 42',
        }),
      );

      expect(event.searchText).toContain('Team Standup');
      expect(event.searchText).toContain('Daily sync');
      expect(event.searchText).toContain('Room 42');
    });

    it('should throw FORBIDDEN if user lacks Editor permission', async () => {
      const { eventService, calendarService } = createServices();
      const cal = await setupCalendar(calendarService, 'user-1');

      await expect(
        eventService.createEvent('user-2', makeEventBody(cal.id)),
      ).rejects.toThrow('FORBIDDEN');
    });

    it('should persist the event in the database', async () => {
      const { eventService, calendarService, eventModel } = createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      const event = await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id),
      );

      const found = await eventModel.findById(event.id);
      expect(found).not.toBeNull();
      expect(found!.uid).toBe(event.uid);
    });

    it('should mark event as recurring when rrule is provided', async () => {
      const { eventService, calendarService } = createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      const event = await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id, {
          rrule: { freq: RecurrenceFrequency.Daily, count: 5 },
        }),
      );

      expect(event.isRecurring).toBe(true);
      expect(event.rrule).toBeDefined();
      expect(event.rrule!.freq).toBe(RecurrenceFrequency.Daily);
    });
  });

  describe('listEvents', () => {
    it('should list events for a calendar the user has access to', async () => {
      const { eventService, calendarService } = createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      await eventService.createEvent('user-1', makeEventBody(cal.id));
      await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id, { summary: 'Second Event' }),
      );

      const events = await eventService.listEvents('user-1', cal.id);
      expect(events).toHaveLength(2);
    });

    it('should filter events by date range', async () => {
      const { eventService, calendarService } = createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id, {
          dtstart: '2024-06-10T09:00:00Z',
          dtend: '2024-06-10T10:00:00Z',
        }),
      );
      await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id, {
          dtstart: '2024-06-20T09:00:00Z',
          dtend: '2024-06-20T10:00:00Z',
        }),
      );

      const filtered = await eventService.listEvents(
        'user-1',
        cal.id,
        '2024-06-15T00:00:00Z',
        '2024-06-25T00:00:00Z',
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].summary).toBe('Team Standup');
    });

    it('should throw FORBIDDEN if user has no permission', async () => {
      const { eventService, calendarService } = createServices();
      const cal = await setupCalendar(calendarService, 'user-1');

      await expect(eventService.listEvents('user-2', cal.id)).rejects.toThrow(
        'FORBIDDEN',
      );
    });
  });

  describe('getEventById', () => {
    it('should return an event the user has access to', async () => {
      const { eventService, calendarService } = createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      const created = await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id),
      );

      const found = await eventService.getEventById(created.id, 'user-1');
      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
    });

    it('should return null for non-existent event', async () => {
      const { eventService } = createServices();
      const found = await eventService.getEventById('nonexistent', 'user-1');
      expect(found).toBeNull();
    });

    it('should throw FORBIDDEN if user lacks permission', async () => {
      const { eventService, calendarService } = createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      const created = await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id),
      );

      await expect(
        eventService.getEventById(created.id, 'user-2'),
      ).rejects.toThrow('FORBIDDEN');
    });
  });

  describe('updateEvent', () => {
    it('should increment SEQUENCE on update (mode all)', async () => {
      const { eventService, calendarService } = createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      const event = await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id),
      );
      expect(event.sequence).toBe(0);

      const updated = await eventService.updateEvent(
        event.id,
        'user-1',
        { summary: 'Updated Standup' },
        'all',
      );

      expect(updated).not.toBeNull();
      expect(updated!.sequence).toBe(1);
      expect(updated!.summary).toBe('Updated Standup');
    });

    it('should update dateModified on update', async () => {
      const { eventService, calendarService } = createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      const event = await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id),
      );

      await new Promise((r) => setTimeout(r, 10));

      const updated = await eventService.updateEvent(
        event.id,
        'user-1',
        { summary: 'Changed' },
        'all',
      );

      expect(updated!.dateModified.getTime()).toBeGreaterThan(
        event.dateModified.getTime(),
      );
    });

    it('should return null for non-existent event', async () => {
      const { eventService } = createServices();
      const result = await eventService.updateEvent(
        'nonexistent',
        'user-1',
        { summary: 'X' },
        'all',
      );
      expect(result).toBeNull();
    });

    it('should throw FORBIDDEN if user lacks Editor permission', async () => {
      const { eventService, calendarService } = createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      const event = await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id),
      );

      await expect(
        eventService.updateEvent(
          event.id,
          'user-2',
          { summary: 'Hacked' },
          'all',
        ),
      ).rejects.toThrow('FORBIDDEN');
    });

    describe('recurrence mode: single', () => {
      it('should create a RECURRENCE-ID exception and add EXDATE to parent', async () => {
        const { eventService, calendarService, eventModel, decryptEvent } = createServices();
        const cal = await setupCalendar(calendarService, 'user-1');
        const parent = await eventService.createEvent(
          'user-1',
          makeEventBody(cal.id, {
            rrule: { freq: RecurrenceFrequency.Daily, count: 10 },
          }),
        );

        const exception = await eventService.updateEvent(
          parent.id,
          'user-1',
          { summary: 'Modified Occurrence', dtstart: '2024-06-17T09:00:00Z' },
          'single',
        );

        expect(exception).not.toBeNull();
        expect(exception!.recurrenceId).toBeInstanceOf(Date);
        expect(exception!.parentEventId).toBe(parent.id);
        expect(exception!.summary).toBe('Modified Occurrence');
        expect(exception!.isRecurring).toBe(false);
        expect(exception!.uid).toBeDefined(); // New UID due to unique index constraint

        // Parent should have EXDATE added
        const rawParent = await eventModel.findById(parent.id);
        const updatedParent = await decryptEvent(rawParent!);
        expect(updatedParent!.exdates).toBeDefined();
        expect(updatedParent!.exdates!.length).toBe(1);
      });
    });

    describe('recurrence mode: thisAndFuture', () => {
      it('should split the series into two', async () => {
        const { eventService, calendarService, eventModel, decryptEvent } = createServices();
        const cal = await setupCalendar(calendarService, 'user-1');
        const original = await eventService.createEvent(
          'user-1',
          makeEventBody(cal.id, {
            rrule: { freq: RecurrenceFrequency.Daily, count: 30 },
          }),
        );

        const newSeries = await eventService.updateEvent(
          original.id,
          'user-1',
          {
            summary: 'New Series',
            dtstart: '2024-06-20T09:00:00Z',
            dtend: '2024-06-20T09:30:00Z',
          },
          'thisAndFuture',
        );

        expect(newSeries).not.toBeNull();
        expect(newSeries!.summary).toBe('New Series');
        expect(newSeries!.parentEventId).toBe(original.id);
        expect(newSeries!.uid).not.toBe(original.uid); // New UID for new series
        expect(newSeries!.isRecurring).toBe(true);

        // Original should have UNTIL set
        const rawOriginal = await eventModel.findById(original.id);
        const updatedOriginal = await decryptEvent(rawOriginal!);
        expect(updatedOriginal!.rrule).toBeDefined();
        expect(updatedOriginal!.rrule!.until).toBeDefined();
        expect(updatedOriginal!.rrule!.count).toBeUndefined();
      });
    });
  });

  describe('deleteEvent', () => {
    it('should delete a non-recurring event (mode all)', async () => {
      const { eventService, calendarService, eventModel } = createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      const event = await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id),
      );

      const deleted = await eventService.deleteEvent(event.id, 'user-1', 'all');
      expect(deleted).toBe(true);

      const found = await eventModel.findById(event.id);
      expect(found).toBeNull();
    });

    it('should return false for non-existent event', async () => {
      const { eventService } = createServices();
      const result = await eventService.deleteEvent(
        'nonexistent',
        'user-1',
        'all',
      );
      expect(result).toBe(false);
    });

    it('should throw FORBIDDEN if user lacks Editor permission', async () => {
      const { eventService, calendarService } = createServices();
      const cal = await setupCalendar(calendarService, 'user-1');
      const event = await eventService.createEvent(
        'user-1',
        makeEventBody(cal.id),
      );

      await expect(
        eventService.deleteEvent(event.id, 'user-2', 'all'),
      ).rejects.toThrow('FORBIDDEN');
    });

    describe('recurrence mode: single', () => {
      it('should add EXDATE instead of deleting the series', async () => {
        const { eventService, calendarService, eventModel, decryptEvent } = createServices();
        const cal = await setupCalendar(calendarService, 'user-1');
        const event = await eventService.createEvent(
          'user-1',
          makeEventBody(cal.id, {
            rrule: { freq: RecurrenceFrequency.Daily, count: 10 },
          }),
        );

        const deleted = await eventService.deleteEvent(
          event.id,
          'user-1',
          'single',
        );
        expect(deleted).toBe(true);

        // Event should still exist with EXDATE added
        const raw = await eventModel.findById(event.id);
        expect(raw).not.toBeNull();
        const updated = await decryptEvent(raw!);
        expect(updated!.exdates).toBeDefined();
        expect(updated!.exdates!.length).toBe(1);
        expect(updated!.sequence).toBe(1);
      });
    });

    describe('recurrence mode: thisAndFuture', () => {
      it('should set UNTIL on the rrule', async () => {
        const { eventService, calendarService, eventModel, decryptEvent } = createServices();
        const cal = await setupCalendar(calendarService, 'user-1');
        const event = await eventService.createEvent(
          'user-1',
          makeEventBody(cal.id, {
            rrule: { freq: RecurrenceFrequency.Daily, count: 30 },
          }),
        );

        const deleted = await eventService.deleteEvent(
          event.id,
          'user-1',
          'thisAndFuture',
        );
        expect(deleted).toBe(true);

        const raw = await eventModel.findById(event.id);
        expect(raw).not.toBeNull();
        const updated = await decryptEvent(raw!);
        expect(updated!.rrule).toBeDefined();
        expect(updated!.rrule!.until).toBeDefined();
        expect(updated!.rrule!.count).toBeUndefined();
        expect(updated!.sequence).toBe(1);
      });
    });
  });
});
