/**
 * InvitationController — unit tests.
 *
 * Tests RSVP, counter proposal, and decline-counter operations,
 * input validation, authentication enforcement, and error handling
 * by mocking the IInvitationService interface.
 *
 * @see Requirements 10.1, 10.2, 10.3, 10.4
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ParticipationStatus } from '@brightchain/brightcal-lib';
import type { ITypedCalendarEvent } from '../../models/calendarEvent.model.ts';
import {
  IInvitationService,
  InvitationController,
} from '../invitationController.ts';

// ─── Mock application ────────────────────────────────────────────────────────

function createMockApplication() {
  const mockServices = {
    get: jest.fn(() => null),
  };
  const mockSession = {
    withTransaction: jest.fn(async (cb: (s: unknown) => Promise<unknown>) =>
      cb(undefined),
    ),
    endSession: jest.fn(),
  } as any;
  const mockConnection = {
    startSession: jest.fn(async () => mockSession),
  } as any;

  return {
    services: mockServices,
    db: { connection: mockConnection },
    environment: { mongo: { useTransactions: false } },
    constants: {},
  };
}

// ─── Mock service ────────────────────────────────────────────────────────────

function createMockService(): jest.Mocked<IInvitationService> {
  return {
    rsvp: jest.fn(),
    counter: jest.fn(),
    declineCounter: jest.fn(),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(overrides: Record<string, any> = {}): any {
  return { user: undefined, params: {}, body: {}, ...overrides };
}

const SAMPLE_EVENT: ITypedCalendarEvent = {
  id: 'evt-1',
  calendarId: 'cal-1',
  uid: '550e8400-e29b-41d4-a716-446655440000',
  sequence: 0,
  summary: 'Team Standup',
  dtstart: '2024-01-15T09:00:00Z',
  dtend: '2024-01-15T09:30:00Z',
  dtstartTzid: 'America/New_York',
  dtendTzid: 'America/New_York',
  allDay: false,
  visibility: 'PUBLIC',
  transparency: 'OPAQUE',
  status: 'CONFIRMED',
  organizerId: 'user-org',
  attendees: [
    {
      userId: 'user-1',
      email: 'user1@example.com',
      displayName: 'User One',
      partstat: ParticipationStatus.Accepted,
      role: 'REQ-PARTICIPANT',
      rsvp: true,
    },
  ],
  reminders: [],
  dateCreated: new Date().toISOString(),
  dateModified: new Date().toISOString(),
} as any;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('InvitationController', () => {
  let controller: InvitationController;
  let service: jest.Mocked<IInvitationService>;

  beforeEach(() => {
    const app = createMockApplication();
    controller = new InvitationController(app as any);
    service = createMockService();
    controller.setInvitationService(service);
  });

  // ── POST /rsvp ───────────────────────────────────────────────────────

  describe('POST /rsvp', () => {
    it('should return 200 with event on valid RSVP', async () => {
      service.rsvp.mockResolvedValue(SAMPLE_EVENT);

      const req = makeReq({
        user: { id: 'user-1' },
        body: { eventId: 'evt-1', response: 'ACCEPTED' },
      });

      const result = await (controller as any).handleRsvp(req);

      expect(result.statusCode).toBe(200);
      expect(result.response.success).toBe(true);
      expect(result.response.event).toEqual(SAMPLE_EVENT);
      expect(service.rsvp).toHaveBeenCalledWith('user-1', 'evt-1', 'ACCEPTED');
    });

    it('should accept DECLINED response', async () => {
      service.rsvp.mockResolvedValue(SAMPLE_EVENT);

      const req = makeReq({
        user: { id: 'user-1' },
        body: { eventId: 'evt-1', response: 'DECLINED' },
      });

      const result = await (controller as any).handleRsvp(req);

      expect(result.statusCode).toBe(200);
      expect(service.rsvp).toHaveBeenCalledWith('user-1', 'evt-1', 'DECLINED');
    });

    it('should accept TENTATIVE response', async () => {
      service.rsvp.mockResolvedValue(SAMPLE_EVENT);

      const req = makeReq({
        user: { id: 'user-1' },
        body: { eventId: 'evt-1', response: 'TENTATIVE' },
      });

      const result = await (controller as any).handleRsvp(req);

      expect(result.statusCode).toBe(200);
      expect(service.rsvp).toHaveBeenCalledWith('user-1', 'evt-1', 'TENTATIVE');
    });

    it('should return 401 if not authenticated', async () => {
      const req = makeReq({
        body: { eventId: 'evt-1', response: 'ACCEPTED' },
      });

      const result = await (controller as any).handleRsvp(req);

      expect(result.statusCode).toBe(401);
    });

    it('should return 400 if eventId is missing', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: { response: 'ACCEPTED' },
      });

      const result = await (controller as any).handleRsvp(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if response is invalid', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: { eventId: 'evt-1', response: 'MAYBE' },
      });

      const result = await (controller as any).handleRsvp(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if response is missing', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: { eventId: 'evt-1' },
      });

      const result = await (controller as any).handleRsvp(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 503 if service is not available', async () => {
      const app = createMockApplication();
      const noServiceController = new InvitationController(app as any);

      const req = makeReq({
        user: { id: 'user-1' },
        body: { eventId: 'evt-1', response: 'ACCEPTED' },
      });

      const result = await (noServiceController as any).handleRsvp(req);

      expect(result.statusCode).toBe(503);
    });
  });

  // ── POST /counter ─────────────────────────────────────────────────

  describe('POST /counter', () => {
    it('should return 200 on valid counter proposal', async () => {
      service.counter.mockResolvedValue(undefined);

      const req = makeReq({
        user: { id: 'user-1' },
        body: {
          eventId: 'evt-1',
          proposedStart: '2024-01-16T14:00:00Z',
          proposedEnd: '2024-01-16T15:00:00Z',
          comment: 'Better time for me',
        },
      });

      const result = await (controller as any).handleCounter(req);

      expect(result.statusCode).toBe(200);
      expect(result.response.success).toBe(true);
      expect(service.counter).toHaveBeenCalledWith(
        'user-1',
        'evt-1',
        '2024-01-16T14:00:00Z',
        '2024-01-16T15:00:00Z',
        'Better time for me',
      );
    });

    it('should work without optional comment', async () => {
      service.counter.mockResolvedValue(undefined);

      const req = makeReq({
        user: { id: 'user-1' },
        body: {
          eventId: 'evt-1',
          proposedStart: '2024-01-16T14:00:00Z',
          proposedEnd: '2024-01-16T15:00:00Z',
        },
      });

      const result = await (controller as any).handleCounter(req);

      expect(result.statusCode).toBe(200);
      expect(service.counter).toHaveBeenCalledWith(
        'user-1',
        'evt-1',
        '2024-01-16T14:00:00Z',
        '2024-01-16T15:00:00Z',
        undefined,
      );
    });

    it('should return 401 if not authenticated', async () => {
      const req = makeReq({
        body: {
          eventId: 'evt-1',
          proposedStart: '2024-01-16T14:00:00Z',
          proposedEnd: '2024-01-16T15:00:00Z',
        },
      });

      const result = await (controller as any).handleCounter(req);

      expect(result.statusCode).toBe(401);
    });

    it('should return 400 if eventId is missing', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: {
          proposedStart: '2024-01-16T14:00:00Z',
          proposedEnd: '2024-01-16T15:00:00Z',
        },
      });

      const result = await (controller as any).handleCounter(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if proposedStart is missing', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: {
          eventId: 'evt-1',
          proposedEnd: '2024-01-16T15:00:00Z',
        },
      });

      const result = await (controller as any).handleCounter(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if proposedEnd is missing', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: {
          eventId: 'evt-1',
          proposedStart: '2024-01-16T14:00:00Z',
        },
      });

      const result = await (controller as any).handleCounter(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if proposedStart is not valid ISO date', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: {
          eventId: 'evt-1',
          proposedStart: 'not-a-date',
          proposedEnd: '2024-01-16T15:00:00Z',
        },
      });

      const result = await (controller as any).handleCounter(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if proposedEnd is before proposedStart', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: {
          eventId: 'evt-1',
          proposedStart: '2024-01-16T15:00:00Z',
          proposedEnd: '2024-01-16T14:00:00Z',
        },
      });

      const result = await (controller as any).handleCounter(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if comment is not a string', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: {
          eventId: 'evt-1',
          proposedStart: '2024-01-16T14:00:00Z',
          proposedEnd: '2024-01-16T15:00:00Z',
          comment: 123,
        },
      });

      const result = await (controller as any).handleCounter(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 503 if service is not available', async () => {
      const app = createMockApplication();
      const noServiceController = new InvitationController(app as any);

      const req = makeReq({
        user: { id: 'user-1' },
        body: {
          eventId: 'evt-1',
          proposedStart: '2024-01-16T14:00:00Z',
          proposedEnd: '2024-01-16T15:00:00Z',
        },
      });

      const result = await (noServiceController as any).handleCounter(req);

      expect(result.statusCode).toBe(503);
    });
  });

  // ── POST /decline-counter ────────────────────────────────────────────

  describe('POST /decline-counter', () => {
    it('should return 200 on valid decline-counter', async () => {
      service.declineCounter.mockResolvedValue(undefined);

      const req = makeReq({
        user: { id: 'user-1' },
        body: { eventId: 'evt-1', counterProposalId: 'counter-456' },
      });

      const result = await (controller as any).handleDeclineCounter(req);

      expect(result.statusCode).toBe(200);
      expect(result.response.success).toBe(true);
      expect(service.declineCounter).toHaveBeenCalledWith(
        'user-1',
        'evt-1',
        'counter-456',
      );
    });

    it('should return 401 if not authenticated', async () => {
      const req = makeReq({
        body: { eventId: 'evt-1', counterProposalId: 'counter-456' },
      });

      const result = await (controller as any).handleDeclineCounter(req);

      expect(result.statusCode).toBe(401);
    });

    it('should return 400 if eventId is missing', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: { counterProposalId: 'counter-456' },
      });

      const result = await (controller as any).handleDeclineCounter(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if counterProposalId is missing', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: { eventId: 'evt-1' },
      });

      const result = await (controller as any).handleDeclineCounter(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 503 if service is not available', async () => {
      const app = createMockApplication();
      const noServiceController = new InvitationController(app as any);

      const req = makeReq({
        user: { id: 'user-1' },
        body: { eventId: 'evt-1', counterProposalId: 'counter-456' },
      });

      const result = await (noServiceController as any).handleDeclineCounter(
        req,
      );

      expect(result.statusCode).toBe(503);
    });
  });
});
