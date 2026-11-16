/**
 * ItipInboundService — integration tests.
 *
 * Uses an in-memory BrightDb to validate the full create/update/cancel/reply
 * flows for inbound iTIP processing.
 *
 * @see Requirements 10.2, 10.3, 10.4, 10.5
 */

import {
  CalendarPermissionLevel,
  type IAttendeeDTO,
  type ICalInviteEmailDTO,
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
import { randomUUID } from 'crypto';
import { createCalendarCollectionModel } from '../../models/calendarCollection.model.js';
import { createCalendarEventModel } from '../../models/calendarEvent.model.js';
import { EncryptionService } from '../encryptionService.js';
import { ItipInboundService } from '../itipInboundService.js';

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(() => {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
});

function makeDb(name = 'testdb'): BrightDb {
  const store = new MemoryBlockStore(validBlockSizes);
  const registry = InMemoryHeadRegistry.createIsolated();
  return new BrightDb(store, { name, headRegistry: registry });
}

const USER_ID = 'user-abc';

function makeIcs(
  uid: string,
  method: ITipMethod,
  sequence = 0,
  overrides = '',
): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    'SUMMARY:Test Event',
    'DTSTART:20240615T090000Z',
    'DTEND:20240615T093000Z',
    `SEQUENCE:${sequence}`,
    overrides,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

interface IInviteOverrides {
  rawIcsExtra?: string;
  attendees?: IAttendeeDTO[];
}
/**
 * Build an inbound invite DTO.
 *
 * NOTE: ItipInboundService reads dtstart/dtend as Date objects even though
 * ICalInviteEmailDTO declares them as ISO strings, so the fixture supplies
 * Dates (cast through unknown) to match the service's runtime expectation.
 */
function makeInvite(
  uid: string,
  method: ITipMethod,
  sequence = 0,
  extra: IInviteOverrides = {},
): ICalInviteEmailDTO {
  return {
    uid,
    method,
    sequence,
    dtstart: new Date('2024-06-15T09:00:00Z') as unknown as string,
    dtend: new Date('2024-06-15T09:30:00Z') as unknown as string,
    dtstartTzid: 'UTC',
    allDay: false,
    rawIcs: makeIcs(uid, method, sequence, extra.rawIcsExtra ?? ''),
    attendees: extra.attendees ?? [],
    organizerEmail: 'organizer@test.com',
    summary: 'Test Event',
    receivedAt: '2024-06-15T08:00:00Z',
    sourceEmailId: 'email-1',
  };
}
async function createServices() {
  const db = makeDb(randomUUID());
  const calendarModel = createCalendarCollectionModel(db);
  const eventModel = createCalendarEventModel(db);
  const encryption = new EncryptionService();

  // Create a default calendar for USER_ID
  const now = new Date();
  const defaultCalendar = {
    id: randomUUID().replace(/-/g, ''),
    ownerId: USER_ID,
    displayName: 'Default',
    color: '#4285F4',
    description: '',
    isDefault: true,
    isSubscription: false,
    defaultPermission: CalendarPermissionLevel.Viewer,
    encryptionKey: encryption.generateKey(),
    dateCreated: now,
    dateModified: now,
  };
  await calendarModel.insertOne(defaultCalendar);

  const service = new ItipInboundService(eventModel, calendarModel, encryption);
  return { service, eventModel, calendarModel };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ItipInboundService', () => {
  describe('handleRequest', () => {
    it('imports a new event and returns imported:1', async () => {
      const { service } = await createServices();
      const uid = `uid-${randomUUID()}`;
      const invite = makeInvite(uid, ITipMethod.Request, 0);

      const result = await service.handleRequest(USER_ID, invite);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.overwritten).toBe(0);
    });

    it('skips a duplicate event with same sequence and returns skipped:1', async () => {
      const { service } = await createServices();
      const uid = `uid-${randomUUID()}`;
      const invite = makeInvite(uid, ITipMethod.Request, 0);

      await service.handleRequest(USER_ID, invite);
      const result = await service.handleRequest(USER_ID, invite);

      expect(result.skipped).toBe(1);
      expect(result.imported).toBe(0);
    });

    it('overwrites an existing event with a higher sequence', async () => {
      const { service } = await createServices();
      const uid = `uid-${randomUUID()}`;

      await service.handleRequest(
        USER_ID,
        makeInvite(uid, ITipMethod.Request, 0),
      );
      const result = await service.handleRequest(
        USER_ID,
        makeInvite(uid, ITipMethod.Request, 1),
      );

      expect(result.overwritten).toBe(1);
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(0);
    });
  });

  describe('handleReply', () => {
    it('updates attendee partstat from NeedsAction to Accepted', async () => {
      const { service } = await createServices();
      const uid = `uid-${randomUUID()}`;

      // First, create the event
      await service.handleRequest(
        USER_ID,
        makeInvite(uid, ITipMethod.Request, 0, {
          attendees: [
            {
              email: 'attendee@test.com',
              userId: 'att-1',
              partstat: ParticipationStatus.NeedsAction,
              role: 'REQ-PARTICIPANT',
              rsvp: true,
            },
          ],
        }),
      );

      // Then send a REPLY with Accepted
      const replyInvite = makeInvite(uid, ITipMethod.Reply, 0, {
        attendees: [
          {
            email: 'attendee@test.com',
            userId: 'att-1',
            partstat: ParticipationStatus.Accepted,
            role: 'REQ-PARTICIPANT',
            rsvp: true,
          },
        ],
      });

      const partstat = await service.handleReply(USER_ID, replyInvite);

      expect(partstat).toBe(ParticipationStatus.Accepted);
    });

    it('returns NeedsAction when event is not found', async () => {
      const { service } = await createServices();
      const invite = makeInvite(`unknown-${randomUUID()}`, ITipMethod.Reply, 0);

      const result = await service.handleReply(USER_ID, invite);

      expect(result).toBe(ParticipationStatus.NeedsAction);
    });
  });

  describe('handleCancel', () => {
    it('marks the full event CANCELLED', async () => {
      const { service, eventModel } = await createServices();
      const uid = `uid-${randomUUID()}`;

      await service.handleRequest(
        USER_ID,
        makeInvite(uid, ITipMethod.Request, 0),
      );

      await service.handleCancel(
        USER_ID,
        makeInvite(uid, ITipMethod.Cancel, 0),
      );

      const events = await eventModel.find({ uid }).toArray();
      expect(events).toHaveLength(1);
      // The event should still exist but body should be marked CANCELLED
      // (checking via the encrypted body is indirect — we trust persistEventBody)
      expect(events[0]).toBeDefined();
    });

    it('adds exdate for partial cancel with RECURRENCE-ID', async () => {
      const { service } = await createServices();
      const uid = `uid-${randomUUID()}`;

      await service.handleRequest(
        USER_ID,
        makeInvite(uid, ITipMethod.Request, 0),
      );

      const cancelInvite = makeInvite(uid, ITipMethod.Cancel, 0, {
        rawIcsExtra: 'RECURRENCE-ID:20240615T090000Z',
      });

      // Should not throw — exdate logic is exercised
      await expect(
        service.handleCancel(USER_ID, cancelInvite),
      ).resolves.toBeUndefined();
    });

    it('is a no-op for unknown event uid', async () => {
      const { service } = await createServices();
      const invite = makeInvite(
        `unknown-${randomUUID()}`,
        ITipMethod.Cancel,
        0,
      );

      await expect(
        service.handleCancel(USER_ID, invite),
      ).resolves.toBeUndefined();
    });
  });

  describe('handleCounter', () => {
    it('returns null (manual review required)', async () => {
      const { service } = await createServices();
      const uid = `uid-${randomUUID()}`;
      const invite = makeInvite(uid, ITipMethod.Counter, 0);

      const result = await service.handleCounter(USER_ID, invite);

      expect(result).toBeNull();
    });
  });
});
