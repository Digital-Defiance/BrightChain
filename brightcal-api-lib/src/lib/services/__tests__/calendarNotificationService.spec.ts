/**
 * CalendarNotificationService — unit tests.
 *
 * Tests iTIP message generation (REQUEST, REPLY, CANCEL, COUNTER, DECLINECOUNTER),
 * RSVP tracking with PARTSTAT updates, attendee summary counts, SEQUENCE handling,
 * reminder scheduling/cancellation, and real-time notifications.
 *
 * @see Requirements 4.5, 4.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
 */

import {
  EventTransparency,
  EventVisibility,
  ITipMethod,
  ParticipationStatus,
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
import { createCalendarReminderModel } from '../../models/calendarReminder.model.ts';
import { createCalendarShareModel } from '../../models/calendarShare.model.ts';
import { CalendarEngineService } from '../calendarEngineService.ts';
import { CalendarNotificationService } from '../calendarNotificationService.ts';
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
  const reminderModel = createCalendarReminderModel(db);
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
  const notificationService = new CalendarNotificationService(
    eventModel,
    reminderModel,
    calendarModel,
    encryption,
  );
  return {
    eventService,
    calendarService,
    permissionService,
    notificationService,
    eventModel,
    reminderModel,
    db,
  };
}

async function setupCalendar(
  calendarService: CalendarEngineService,
  ownerId: string,
) {
  return calendarService.createCalendar(ownerId, 'Test Cal', '#4285F4', '');
}

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

describe('CalendarNotificationService', () => {
  describe('generateRequest', () => {
    it('should generate an iTIP REQUEST with correct method and recipients', async () => {
      const { eventService, calendarService, notificationService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'organizer');
      const event = await eventService.createEvent(
        'organizer',
        makeEventBody(cal.id, {
          attendees: [
            {
              email: 'attendee1@test.com',
              userId: 'attendee-1',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
            {
              email: 'attendee2@test.com',
              userId: 'attendee-2',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
          ],
        }),
      );

      const msg = notificationService.generateRequest(event);

      expect(msg.method).toBe(ITipMethod.Request);
      expect(msg.eventUid).toBe(event.uid);
      expect(msg.sequence).toBe(event.sequence);
      expect(msg.recipients).toContain('attendee-1');
      expect(msg.recipients).toContain('attendee-2');
      expect(msg.recipients).not.toContain('organizer');
      expect(msg.icalData).toContain('METHOD:REQUEST');
      expect(msg.icalData).toContain(`UID:${event.uid}`);
    });

    it('should add the message to the queue', async () => {
      const { eventService, calendarService, notificationService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'organizer');
      const event = await eventService.createEvent(
        'organizer',
        makeEventBody(cal.id, {
          attendees: [
            {
              email: 'a@test.com',
              userId: 'att-1',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
          ],
        }),
      );

      notificationService.generateRequest(event);

      expect(notificationService.getMessageQueue()).toHaveLength(1);
      expect(notificationService.getMessageQueue()[0].method).toBe(
        ITipMethod.Request,
      );
    });

    it('should carry the current SEQUENCE number', async () => {
      const { eventService, calendarService, notificationService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'organizer');
      const event = await eventService.createEvent(
        'organizer',
        makeEventBody(cal.id),
      );

      // Simulate organizer modification: sequence incremented
      const updated = await eventService.updateEvent(
        event.id,
        'organizer',
        { summary: 'Updated' },
        'all',
      );

      const msg = notificationService.generateRequest(updated!);
      expect(msg.sequence).toBe(1);
      expect(msg.icalData).toContain('SEQUENCE:1');
    });
  });

  describe('generateCancel', () => {
    it('should generate an iTIP CANCEL with correct method', async () => {
      const { eventService, calendarService, notificationService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'organizer');
      const event = await eventService.createEvent(
        'organizer',
        makeEventBody(cal.id, {
          attendees: [
            {
              email: 'a@test.com',
              userId: 'att-1',
              partstat: ParticipationStatus.Accepted,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
          ],
        }),
      );

      const msg = notificationService.generateCancel(event);

      expect(msg.method).toBe(ITipMethod.Cancel);
      expect(msg.eventUid).toBe(event.uid);
      expect(msg.recipients).toContain('att-1');
      expect(msg.recipients).not.toContain('organizer');
      expect(msg.icalData).toContain('METHOD:CANCEL');
    });
  });

  describe('rsvp', () => {
    it('should generate an iTIP REPLY with the attendee PARTSTAT', async () => {
      const { eventService, calendarService, notificationService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'organizer');
      const event = await eventService.createEvent(
        'organizer',
        makeEventBody(cal.id, {
          attendees: [
            {
              email: 'bob@test.com',
              userId: 'bob',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
          ],
        }),
      );

      const result = await notificationService.rsvp(
        'bob',
        event.id,
        ParticipationStatus.Accepted,
      );

      expect(result.id).toBe(event.id);

      const queue = notificationService.getMessageQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].method).toBe(ITipMethod.Reply);
      expect(queue[0].recipients).toEqual(['organizer']);
      expect(queue[0].icalData).toContain('METHOD:REPLY');
      expect(queue[0].icalData).toContain('PARTSTAT=ACCEPTED');
    });

    it('should throw NOT_FOUND for non-existent event', async () => {
      const { notificationService } = createServices();

      await expect(
        notificationService.rsvp(
          'bob',
          'nonexistent',
          ParticipationStatus.Accepted,
        ),
      ).rejects.toThrow('NOT_FOUND');
    });

    it('should throw NOT_ATTENDEE if user is not an attendee', async () => {
      const { eventService, calendarService, notificationService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'organizer');
      const event = await eventService.createEvent(
        'organizer',
        makeEventBody(cal.id, {
          attendees: [
            {
              email: 'bob@test.com',
              userId: 'bob',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
          ],
        }),
      );

      await expect(
        notificationService.rsvp(
          'stranger',
          event.id,
          ParticipationStatus.Accepted,
        ),
      ).rejects.toThrow('NOT_ATTENDEE');
    });

    it('should update PARTSTAT in the attendee summary', async () => {
      const { eventService, calendarService, notificationService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'organizer');
      const event = await eventService.createEvent(
        'organizer',
        makeEventBody(cal.id, {
          attendees: [
            {
              email: 'bob@test.com',
              userId: 'bob',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
            {
              email: 'alice@test.com',
              userId: 'alice',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
          ],
        }),
      );

      await notificationService.rsvp(
        'bob',
        event.id,
        ParticipationStatus.Accepted,
      );

      const summary = await notificationService.getAttendeeSummary(event.id);
      expect(summary.total).toBe(2);
      expect(summary.accepted).toBe(1);
      expect(summary.noResponse).toBe(1);
    });
  });

  describe('counter', () => {
    it('should generate an iTIP COUNTER message to the organizer', async () => {
      const { eventService, calendarService, notificationService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'organizer');
      const event = await eventService.createEvent(
        'organizer',
        makeEventBody(cal.id, {
          attendees: [
            {
              email: 'bob@test.com',
              userId: 'bob',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
          ],
        }),
      );

      await notificationService.counter(
        'bob',
        event.id,
        '2024-06-16T10:00:00Z',
        '2024-06-16T10:30:00Z',
        'I have a conflict',
      );

      const queue = notificationService.getMessageQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].method).toBe(ITipMethod.Counter);
      expect(queue[0].recipients).toEqual(['organizer']);
      expect(queue[0].icalData).toContain('METHOD:COUNTER');
      expect(queue[0].icalData).toContain('COMMENT:I have a conflict');
    });

    it('should throw NOT_FOUND for non-existent event', async () => {
      const { notificationService } = createServices();

      await expect(
        notificationService.counter(
          'bob',
          'nonexistent',
          '2024-06-16T10:00:00Z',
          '2024-06-16T10:30:00Z',
        ),
      ).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('declineCounter', () => {
    it('should generate an iTIP DECLINECOUNTER message', async () => {
      const { eventService, calendarService, notificationService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'organizer');
      const event = await eventService.createEvent(
        'organizer',
        makeEventBody(cal.id, {
          attendees: [
            {
              email: 'bob@test.com',
              userId: 'bob',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
          ],
        }),
      );

      await notificationService.declineCounter(
        'organizer',
        event.id,
        'counter-123',
      );

      const queue = notificationService.getMessageQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].method).toBe(ITipMethod.DeclineCounter);
      expect(queue[0].icalData).toContain('METHOD:DECLINECOUNTER');
    });

    it('should throw NOT_FOUND for non-existent event', async () => {
      const { notificationService } = createServices();

      await expect(
        notificationService.declineCounter(
          'organizer',
          'nonexistent',
          'counter-123',
        ),
      ).rejects.toThrow('NOT_FOUND');
    });

    it('should throw NOT_ORGANIZER if user is not the organizer', async () => {
      const { eventService, calendarService, notificationService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'organizer');
      const event = await eventService.createEvent(
        'organizer',
        makeEventBody(cal.id, {
          attendees: [
            {
              email: 'bob@test.com',
              userId: 'bob',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
          ],
        }),
      );

      await expect(
        notificationService.declineCounter('bob', event.id, 'counter-123'),
      ).rejects.toThrow('NOT_ORGANIZER');
    });
  });

  describe('getAttendeeSummary', () => {
    it('should return correct counts for mixed RSVP statuses', async () => {
      const { eventService, calendarService, notificationService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'organizer');
      const event = await eventService.createEvent(
        'organizer',
        makeEventBody(cal.id, {
          attendees: [
            {
              email: 'a@test.com',
              userId: 'a',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
            {
              email: 'b@test.com',
              userId: 'b',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
            {
              email: 'c@test.com',
              userId: 'c',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
            {
              email: 'd@test.com',
              userId: 'd',
              partstat: ParticipationStatus.NeedsAction,
              role: 'OPT-PARTICIPANT',
              rsvp: true,
            },
          ],
        }),
      );

      await notificationService.rsvp(
        'a',
        event.id,
        ParticipationStatus.Accepted,
      );
      await notificationService.rsvp(
        'b',
        event.id,
        ParticipationStatus.Declined,
      );
      await notificationService.rsvp(
        'c',
        event.id,
        ParticipationStatus.Tentative,
      );
      // 'd' does not respond

      const summary = await notificationService.getAttendeeSummary(event.id);
      expect(summary.total).toBe(4);
      expect(summary.accepted).toBe(1);
      expect(summary.declined).toBe(1);
      expect(summary.tentative).toBe(1);
      expect(summary.noResponse).toBe(1);
      expect(
        summary.accepted +
          summary.declined +
          summary.tentative +
          summary.noResponse,
      ).toBe(summary.total);
    });

    it('should throw NOT_FOUND for non-existent event', async () => {
      const { notificationService } = createServices();

      await expect(
        notificationService.getAttendeeSummary('nonexistent'),
      ).rejects.toThrow('NOT_FOUND');
    });

    it('should return all noResponse when no RSVPs received', async () => {
      const { eventService, calendarService, notificationService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'organizer');
      const event = await eventService.createEvent(
        'organizer',
        makeEventBody(cal.id, {
          attendees: [
            {
              email: 'a@test.com',
              userId: 'a',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
            {
              email: 'b@test.com',
              userId: 'b',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
          ],
        }),
      );

      const summary = await notificationService.getAttendeeSummary(event.id);
      expect(summary.total).toBe(2);
      expect(summary.noResponse).toBe(2);
      expect(summary.accepted).toBe(0);
      expect(summary.declined).toBe(0);
      expect(summary.tentative).toBe(0);
    });
  });

  describe('message queue', () => {
    it('should accumulate messages and clear on demand', async () => {
      const { eventService, calendarService, notificationService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'organizer');
      const event = await eventService.createEvent(
        'organizer',
        makeEventBody(cal.id, {
          attendees: [
            {
              email: 'a@test.com',
              userId: 'att-1',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
          ],
        }),
      );

      notificationService.generateRequest(event);
      notificationService.generateCancel(event);

      expect(notificationService.getMessageQueue()).toHaveLength(2);

      notificationService.clearMessageQueue();
      expect(notificationService.getMessageQueue()).toHaveLength(0);
    });
  });

  describe('iCalData structure', () => {
    it('should produce valid VCALENDAR structure in REQUEST', async () => {
      const { eventService, calendarService, notificationService } =
        createServices();
      const cal = await setupCalendar(calendarService, 'organizer');
      const event = await eventService.createEvent(
        'organizer',
        makeEventBody(cal.id),
      );

      const msg = notificationService.generateRequest(event);

      expect(msg.icalData).toContain('BEGIN:VCALENDAR');
      expect(msg.icalData).toContain('END:VCALENDAR');
      expect(msg.icalData).toContain('BEGIN:VEVENT');
      expect(msg.icalData).toContain('END:VEVENT');
      expect(msg.icalData).toContain('VERSION:2.0');
      expect(msg.icalData).toContain('PRODID:');
      expect(msg.icalData).toContain(`SUMMARY:${event.summary}`);
    });
  });

  describe('scheduleReminders', () => {
    it('should create reminder records for each configured interval', async () => {
      const { notificationService, reminderModel } = createServices();
      const eventId = 'event-123';
      const eventStart = new Date('2024-06-15T09:00:00Z');

      await notificationService.scheduleReminders(eventId, eventStart, [
        { action: 'DISPLAY', triggerMinutesBefore: 30 },
        { action: 'EMAIL', triggerMinutesBefore: 10 },
      ]);

      const all = await reminderModel.find({} as any).toArray();
      expect(all).toHaveLength(2);
      expect(all.every((r) => r.eventId === eventId)).toBe(true);
      expect(all.every((r) => r.delivered === false)).toBe(true);
    });

    it('should compute triggerAt as eventStart minus triggerMinutesBefore', async () => {
      const { notificationService, reminderModel } = createServices();
      const eventStart = new Date('2024-06-15T09:00:00Z');

      await notificationService.scheduleReminders('evt-1', eventStart, [
        { action: 'DISPLAY', triggerMinutesBefore: 30 },
      ]);

      const all = await reminderModel.find({} as any).toArray();
      expect(all[0].triggerAt.getTime()).toBe(
        eventStart.getTime() - 30 * 60 * 1000,
      );
    });

    it('should set email channel for EMAIL action reminders', async () => {
      const { notificationService, reminderModel } = createServices();

      await notificationService.scheduleReminders(
        'evt-1',
        new Date('2024-06-15T09:00:00Z'),
        [{ action: 'EMAIL', triggerMinutesBefore: 15 }],
      );

      const all = await reminderModel.find({} as any).toArray();
      expect(all[0].channels).toEqual(['email']);
    });

    it('should set push channel for DISPLAY action reminders', async () => {
      const { notificationService, reminderModel } = createServices();

      await notificationService.scheduleReminders(
        'evt-1',
        new Date('2024-06-15T09:00:00Z'),
        [{ action: 'DISPLAY', triggerMinutesBefore: 5 }],
      );

      const all = await reminderModel.find({} as any).toArray();
      expect(all[0].channels).toEqual(['push']);
    });
  });

  describe('cancelReminders', () => {
    it('should remove all undelivered reminders for an event', async () => {
      const { notificationService, reminderModel } = createServices();
      const eventId = 'event-to-cancel';

      await notificationService.scheduleReminders(
        eventId,
        new Date('2024-06-15T09:00:00Z'),
        [
          { action: 'DISPLAY', triggerMinutesBefore: 30 },
          { action: 'EMAIL', triggerMinutesBefore: 10 },
        ],
      );

      // Verify reminders exist
      let all = await reminderModel.find({} as any).toArray();
      expect(all).toHaveLength(2);

      await notificationService.cancelReminders(eventId);

      all = await reminderModel.find({} as any).toArray();
      expect(all.filter((r) => r.eventId === eventId)).toHaveLength(0);
    });

    it('should not affect reminders for other events', async () => {
      const { notificationService, reminderModel } = createServices();

      await notificationService.scheduleReminders(
        'event-A',
        new Date('2024-06-15T09:00:00Z'),
        [{ action: 'DISPLAY', triggerMinutesBefore: 30 }],
      );
      await notificationService.scheduleReminders(
        'event-B',
        new Date('2024-06-15T10:00:00Z'),
        [{ action: 'DISPLAY', triggerMinutesBefore: 15 }],
      );

      await notificationService.cancelReminders('event-A');

      const all = await reminderModel.find({} as any).toArray();
      expect(all).toHaveLength(1);
      expect(all[0].eventId).toBe('event-B');
    });
  });

  describe('getDueReminders', () => {
    it('should return reminders where triggerAt <= now and not delivered', async () => {
      const { notificationService } = createServices();

      // Schedule a reminder 30 min before an event at 09:00
      await notificationService.scheduleReminders(
        'evt-due',
        new Date('2024-06-15T09:00:00Z'),
        [{ action: 'DISPLAY', triggerMinutesBefore: 30 }],
      );

      // Check at 08:31 — should be due (triggerAt = 08:30)
      const due = await notificationService.getDueReminders(
        new Date('2024-06-15T08:31:00Z'),
      );
      expect(due).toHaveLength(1);
      expect(due[0].eventId).toBe('evt-due');
    });

    it('should not return reminders that are not yet due', async () => {
      const { notificationService } = createServices();

      await notificationService.scheduleReminders(
        'evt-future',
        new Date('2024-06-15T09:00:00Z'),
        [{ action: 'DISPLAY', triggerMinutesBefore: 30 }],
      );

      // Check at 08:00 — triggerAt is 08:30, not yet due
      const due = await notificationService.getDueReminders(
        new Date('2024-06-15T08:00:00Z'),
      );
      expect(due).toHaveLength(0);
    });
  });

  describe('markReminderDelivered', () => {
    it('should mark a reminder as delivered', async () => {
      const { notificationService, reminderModel } = createServices();

      await notificationService.scheduleReminders(
        'evt-mark',
        new Date('2024-06-15T09:00:00Z'),
        [{ action: 'DISPLAY', triggerMinutesBefore: 10 }],
      );

      const all = await reminderModel.find({} as any).toArray();
      expect(all[0].delivered).toBe(false);

      await notificationService.markReminderDelivered(all[0].id);

      const updated = await reminderModel.findById(all[0].id);
      expect(updated?.delivered).toBe(true);
    });
  });

  describe('emitRealTimeNotification', () => {
    it('should queue a real-time notification', () => {
      const { notificationService } = createServices();

      notificationService.emitRealTimeNotification('invitation', 'user-1', {
        eventId: 'evt-1',
        summary: 'Team Meeting',
      });

      const queue = notificationService.getRealTimeQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].type).toBe('invitation');
      expect(queue[0].userId).toBe('user-1');
      expect(queue[0].payload).toEqual({
        eventId: 'evt-1',
        summary: 'Team Meeting',
      });
      expect(queue[0].timestamp).toBeInstanceOf(Date);
    });

    it('should accumulate multiple notifications and clear on demand', () => {
      const { notificationService } = createServices();

      notificationService.emitRealTimeNotification('invitation', 'user-1', {});
      notificationService.emitRealTimeNotification('rsvp', 'user-2', {});
      notificationService.emitRealTimeNotification('cancel', 'user-1', {});

      expect(notificationService.getRealTimeQueue()).toHaveLength(3);

      notificationService.clearRealTimeQueue();
      expect(notificationService.getRealTimeQueue()).toHaveLength(0);
    });
  });
});
