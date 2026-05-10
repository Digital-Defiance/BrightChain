/**
 * processInboundItip — unit tests.
 *
 * Verifies:
 *  - REQUEST method calls handleRequest and returns correct shape.
 *  - REPLY method calls handleReply and returns correct shape.
 *  - CANCEL method calls handleCancel and returns correct shape.
 *  - COUNTER method calls handleCounter and returns correct shape.
 *  - Unsupported methods return { method: 'UNSUPPORTED' }.
 *
 * Uses a hand-rolled mock for IItipInboundHandler to avoid DB setup.
 *
 * @see Requirements 10.2–10.5
 */

import {
  ITipMethod,
  ParticipationStatus,
  type ICalInviteEmailDTO,
  type IImportResult,
  type IItipInboundHandler,
} from '@brightchain/brightcal-lib';
import { processInboundItip } from '../processInboundItip.ts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeInvite(method: ITipMethod | string): ICalInviteEmailDTO {
  return {
    method: method as ITipMethod,
    uid: 'test-uid-001',
    sequence: 1,
    summary: 'Test Event',
    dtstart: '2024-06-15T09:00:00Z',
    dtstartTzid: 'UTC',
    allDay: false,
    organizerEmail: 'organizer@example.com',
    attendees: [],
    rawIcs: 'BEGIN:VCALENDAR\r\nEND:VCALENDAR',
    receivedAt: '2024-06-14T12:00:00Z',
    sourceEmailId: 'email-42',
  };
}

const importOk: IImportResult = {
  imported: 1,
  skipped: 0,
  overwritten: 0,
  duplicates: [],
};

function makeHandler(overrides: Partial<IItipInboundHandler> = {}): jest.Mocked<IItipInboundHandler> {
  return {
    handleRequest: jest.fn().mockResolvedValue(importOk),
    handleReply: jest.fn().mockResolvedValue(ParticipationStatus.Accepted),
    handleCancel: jest.fn().mockResolvedValue(undefined),
    handleCounter: jest.fn().mockResolvedValue(null),
    ...overrides,
  } as jest.Mocked<IItipInboundHandler>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('processInboundItip', () => {
  describe('REQUEST', () => {
    it('calls handleRequest with userId and invite', async () => {
      const handler = makeHandler();
      const invite = makeInvite(ITipMethod.Request);

      const result = await processInboundItip(handler, 'user-1', invite);

      expect(handler.handleRequest).toHaveBeenCalledWith('user-1', invite);
      expect(result).toEqual({ method: ITipMethod.Request, result: importOk });
    });

    it('forwards the IImportResult from handleRequest', async () => {
      const importResult: IImportResult = {
        imported: 0,
        skipped: 1,
        overwritten: 0,
        duplicates: ['test-uid-001'],
      };
      const handler = makeHandler({
        handleRequest: jest.fn().mockResolvedValue(importResult),
      });

      const result = await processInboundItip(
        handler,
        'user-1',
        makeInvite(ITipMethod.Request),
      );

      expect(result).toEqual({ method: ITipMethod.Request, result: importResult });
    });
  });

  describe('REPLY', () => {
    it('calls handleReply and returns partstat', async () => {
      const handler = makeHandler();
      const invite = makeInvite(ITipMethod.Reply);

      const result = await processInboundItip(handler, 'organizer-1', invite);

      expect(handler.handleReply).toHaveBeenCalledWith('organizer-1', invite);
      expect(result).toEqual({
        method: ITipMethod.Reply,
        partstat: ParticipationStatus.Accepted,
      });
    });

    it('returns DECLINED partstat when attendee declined', async () => {
      const handler = makeHandler({
        handleReply: jest.fn().mockResolvedValue(ParticipationStatus.Declined),
      });

      const result = await processInboundItip(
        handler,
        'org',
        makeInvite(ITipMethod.Reply),
      );

      expect(result).toEqual({
        method: ITipMethod.Reply,
        partstat: ParticipationStatus.Declined,
      });
    });
  });

  describe('CANCEL', () => {
    it('calls handleCancel and returns cancel shape', async () => {
      const handler = makeHandler();
      const invite = makeInvite(ITipMethod.Cancel);

      const result = await processInboundItip(handler, 'user-1', invite);

      expect(handler.handleCancel).toHaveBeenCalledWith('user-1', invite);
      expect(result).toEqual({ method: ITipMethod.Cancel, result: undefined });
    });
  });

  describe('COUNTER', () => {
    it('calls handleCounter and returns counter ICS when provided', async () => {
      const counterIcs = 'BEGIN:VCALENDAR\r\nMETHOD:COUNTER\r\nEND:VCALENDAR';
      const handler = makeHandler({
        handleCounter: jest.fn().mockResolvedValue(counterIcs),
      });

      const result = await processInboundItip(
        handler,
        'org',
        makeInvite(ITipMethod.Counter),
      );

      expect(result).toEqual({ method: ITipMethod.Counter, counterIcs });
    });

    it('returns null counterIcs when organizer declines to handle', async () => {
      const handler = makeHandler({
        handleCounter: jest.fn().mockResolvedValue(null),
      });

      const result = await processInboundItip(
        handler,
        'org',
        makeInvite(ITipMethod.Counter),
      );

      expect(result).toEqual({ method: ITipMethod.Counter, counterIcs: null });
    });
  });

  describe('unsupported methods', () => {
    it.each(['PUBLISH', 'REFRESH', 'ADD', 'DECLINECOUNTER'])(
      'returns UNSUPPORTED for method %s',
      async (method) => {
        const handler = makeHandler();
        const invite = makeInvite(method as ITipMethod);

        const result = await processInboundItip(handler, 'user-1', invite);

        expect(result).toEqual({ method: 'UNSUPPORTED', iTipMethod: method });
        expect(handler.handleRequest).not.toHaveBeenCalled();
        expect(handler.handleReply).not.toHaveBeenCalled();
        expect(handler.handleCancel).not.toHaveBeenCalled();
        expect(handler.handleCounter).not.toHaveBeenCalled();
      },
    );
  });
});
