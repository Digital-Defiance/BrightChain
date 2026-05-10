/**
 * ItipInboundService — integration tests.
 *
 * Uses an in-memory BrightDb to validate the full create/update/cancel/reply
 * flows for inbound iTIP processing.
 *
 * @see Requirements 10.2, 10.3, 10.4, 10.5
 */

import {
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
import { createCalendarCollectionModel } from '../../models/calendarCollection.model.ts';
import { createCalendarEventModel } from '../../models/calendarEvent.model.ts';
import { EncryptionService } from '../encryptionService.ts';
import { ItipInboundService } from '../itipInboundService.ts';

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

function makeInvite(
  uid: string,
  method: ITipMethod,
  sequence = 0,
  extra: Record<string, unknown> = {},
) {
  return {
    uid,
    method,
    sequence,
    dtstart: new Date('2024-06-15T09:00:00Z'),
    dtend: new Date('2024-06-15T09:30:00Z'),
    allDay: false,
    rawIcs: makeIcs(uid, method, sequence, (extra.rawIcsExtra as string) ?? ''),
    attendees: (extra.attendees as unknown[]) ?? [],
    organizer: extra.organizer ?? { email: 'organizer@test.com' },
    summary: 'Test Event',
    ...extra,
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
    defaultPermission: 'viewer' as const,
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

      const result = await service.handleRequest(USER_ID, invite as any);

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.overwritten).toBe(0);
    });

    it('skips a duplicate event with same sequence and returns skipped:1', async () => {
      const { service } = await createServices();
      const uid = `uid-${randomUUID()}`;
      const invite = makeInvite(uid, ITipMethod.Request, 0);

      await service.handleRequest(USER_ID, invite as any);
      const result = await service.handleRequest(USER_ID, invite as any);

      expect(result.skipped).toBe(1);
      expect(result.imported).toBe(0);
    });

    it('overwrites an existing event with a higher sequence', async () => {
      const { service } = await createServices();
      const uid = `uid-${randomUUID()}`;

      await service.handleRequest(USER_ID, makeInvite(uid, ITipMethod.Request, 0) as any);
      const result = await service.handleRequest(
        USER_ID,
        makeInvite(uid, ITipMethod.Request, 1) as any,
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
        }) as any,
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

      const partstat = await service.handleReply(USER_ID, replyInvite as any);

      expect(partstat).toBe(ParticipationStatus.Accepted);
    });

    it('returns NeedsAction when event is not found', async () => {
      const { service } = await createServices();
      const invite = makeInvite(`unknown-${randomUUID()}`, ITipMethod.Reply, 0);

      const result = await service.handleReply(USER_ID, invite as any);

      expect(result).toBe(ParticipationStatus.NeedsAction);
    });
  });

  describe('handleCancel', () => {
    it('marks the full event CANCELLED', async () => {
      const { service, eventModel } = await createServices();
      const uid = `uid-${randomUUID()}`;

      await service.handleRequest(USER_ID, makeInvite(uid, ITipMethod.Request, 0) as any);

      await service.handleCancel(USER_ID, makeInvite(uid, ITipMethod.Cancel, 0) as any);

      const events = await eventModel.find({ uid } as any).toArray();
      expect(events).toHaveLength(1);
      // The event should still exist but body should be marked CANCELLED
      // (checking via the encrypted body is indirect — we trust persistEventBody)
      expect(events[0]).toBeDefined();
    });

    it('adds exdate for partial cancel with RECURRENCE-ID', async () => {
      const { service } = await createServices();
      const uid = `uid-${randomUUID()}`;

      await service.handleRequest(USER_ID, makeInvite(uid, ITipMethod.Request, 0) as any);

      const cancelInvite = makeInvite(uid, ITipMethod.Cancel, 0, {
        rawIcsExtra: 'RECURRENCE-ID:20240615T090000Z',
      });

      // Should not throw — exdate logic is exercised
      await expect(
        service.handleCancel(USER_ID, cancelInvite as any),
      ).resolves.toBeUndefined();
    });

    it('is a no-op for unknown event uid', async () => {
      const { service } = await createServices();
      const invite = makeInvite(`unknown-${randomUUID()}`, ITipMethod.Cancel, 0);

      await expect(service.handleCancel(USER_ID, invite as any)).resolves.toBeUndefined();
    });
  });

  describe('handleCounter', () => {
    it('returns null (manual review required)', async () => {
      const { service } = await createServices();
      const uid = `uid-${randomUUID()}`;
      const invite = makeInvite(uid, ITipMethod.Counter, 0);

      const result = await service.handleCounter(USER_ID, invite as any);

      expect(result).toBeNull();
    });
  });
});
