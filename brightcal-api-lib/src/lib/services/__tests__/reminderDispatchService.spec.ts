/**
 * ReminderDispatchService — unit tests.
 *
 * Uses lightweight Jest mocks for all dependencies (no real DB).
 *
 * Verifies:
 *  - processDueReminders queries for overdue, un-delivered reminders.
 *  - Email-channel reminders are dispatched via ItipMailDeliveryService.
 *  - Push-channel reminders are dispatched via NotificationDispatcher.
 *  - Processed reminders are marked delivered.
 *  - Errors from dispatch are swallowed (to not block remaining reminders).
 *  - start/stop manage the polling interval.
 *  - Calling start() twice does not create a duplicate interval.
 *
 * @see Requirements 14.1, 14.2, 14.3
 */

import { ReminderDispatchService } from '../reminderDispatchService.ts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAST = new Date(Date.now() - 10_000).toISOString();
const FUTURE = new Date(Date.now() + 600_000).toISOString();

function makeTypedReminder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rem-1',
    userId: 'user@example.com',
    eventId: 'event-001',
    channels: ['email'],
    triggerAt: new Date(PAST),
    triggerMinutesBefore: 15,
    action: 'EMAIL',
    delivered: false,
    ...overrides,
  };
}

function makeTypedEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-001',
    summary: 'Team Standup',
    dtstart: new Date(Date.now() + 300_000),
    dtend: new Date(Date.now() + 1_800_000),
    ...overrides,
  };
}

function makeReminderModel(reminders: ReturnType<typeof makeTypedReminder>[] = []) {
  return {
    find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(reminders) }),
    updateOne: jest.fn().mockResolvedValue(undefined),
  };
}

function makeEventModel(event: ReturnType<typeof makeTypedEvent> | null = makeTypedEvent()) {
  return {
    findById: jest.fn().mockResolvedValue(event),
  };
}

function makeMailDelivery() {
  return {
    sendEmailReminder: jest.fn().mockResolvedValue(undefined),
  };
}

function makePushDispatcher() {
  return {
    sendToUser: jest.fn(),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ReminderDispatchService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('processDueReminders', () => {
    it('queries reminders where triggerAt <= now and delivered = false', async () => {
      const reminderModel = makeReminderModel([]);
      const svc = new ReminderDispatchService(
        reminderModel as never,
        makeEventModel() as never,
        makeMailDelivery() as never,
      );

      await svc.processDueReminders();

      expect(reminderModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ delivered: false }),
      );
    });

    it('returns 0 when no due reminders exist', async () => {
      const svc = new ReminderDispatchService(
        makeReminderModel([]) as never,
        makeEventModel() as never,
        makeMailDelivery() as never,
      );

      const count = await svc.processDueReminders();

      expect(count).toBe(0);
    });

    it('dispatches email reminder for email-channel reminder', async () => {
      const reminder = makeTypedReminder({ channels: ['email'] });
      const mailDelivery = makeMailDelivery();
      const svc = new ReminderDispatchService(
        makeReminderModel([reminder]) as never,
        makeEventModel() as never,
        mailDelivery as never,
      );

      const count = await svc.processDueReminders();

      expect(count).toBe(1);
      expect(mailDelivery.sendEmailReminder).toHaveBeenCalledTimes(1);
    });

    it('dispatches push reminder for push-channel reminder', async () => {
      const reminder = makeTypedReminder({ channels: ['push'] });
      const pushDispatcher = makePushDispatcher();
      const svc = new ReminderDispatchService(
        makeReminderModel([reminder]) as never,
        makeEventModel() as never,
        makeMailDelivery() as never,
        pushDispatcher as never,
      );

      await svc.processDueReminders();

      expect(pushDispatcher.sendToUser).toHaveBeenCalledWith(
        reminder.userId,
        'REMINDER',
        expect.objectContaining({ eventId: 'event-001' }),
      );
    });

    it('marks each dispatched reminder as delivered', async () => {
      const reminder = makeTypedReminder();
      const reminderModel = makeReminderModel([reminder]);
      const svc = new ReminderDispatchService(
        reminderModel as never,
        makeEventModel() as never,
        makeMailDelivery() as never,
      );

      await svc.processDueReminders();

      expect(reminderModel.updateOne).toHaveBeenCalledWith(
        { _id: reminder.id },
        { delivered: true },
      );
    });

    it('skips email dispatch when event is not found', async () => {
      const reminder = makeTypedReminder({ channels: ['email'] });
      const mailDelivery = makeMailDelivery();
      const svc = new ReminderDispatchService(
        makeReminderModel([reminder]) as never,
        makeEventModel(null) as never, // event not found
        mailDelivery as never,
      );

      await svc.processDueReminders();

      expect(mailDelivery.sendEmailReminder).not.toHaveBeenCalled();
    });

    it('processes both email and push channels on a single reminder', async () => {
      const reminder = makeTypedReminder({ channels: ['email', 'push'] });
      const mailDelivery = makeMailDelivery();
      const pushDispatcher = makePushDispatcher();
      const svc = new ReminderDispatchService(
        makeReminderModel([reminder]) as never,
        makeEventModel() as never,
        mailDelivery as never,
        pushDispatcher as never,
      );

      await svc.processDueReminders();

      expect(mailDelivery.sendEmailReminder).toHaveBeenCalledTimes(1);
      expect(pushDispatcher.sendToUser).toHaveBeenCalledTimes(1);
    });

    it('continues processing remaining reminders after a dispatch error', async () => {
      const reminder1 = makeTypedReminder({ id: 'rem-1', eventId: 'e-1' });
      const reminder2 = makeTypedReminder({ id: 'rem-2', eventId: 'e-2' });
      const mailDelivery = makeMailDelivery();
      mailDelivery.sendEmailReminder
        .mockRejectedValueOnce(new Error('send failed'))
        .mockResolvedValueOnce(undefined);

      const reminderModel = makeReminderModel([reminder1, reminder2]);
      const svc = new ReminderDispatchService(
        reminderModel as never,
        makeEventModel() as never,
        mailDelivery as never,
      );

      const count = await svc.processDueReminders();

      // Only the second succeeded
      expect(count).toBe(1);
      expect(mailDelivery.sendEmailReminder).toHaveBeenCalledTimes(2);
    });

    it('passes event summary and dtstart to sendEmailReminder', async () => {
      const eventStart = new Date(Date.now() + 900_000);
      const event = makeTypedEvent({ summary: 'Sprint Review', dtstart: eventStart });
      const reminder = makeTypedReminder({ channels: ['email'] });
      const mailDelivery = makeMailDelivery();
      const svc = new ReminderDispatchService(
        makeReminderModel([reminder]) as never,
        makeEventModel(event) as never,
        mailDelivery as never,
      );

      await svc.processDueReminders();

      const [, summary, dtstart] = mailDelivery.sendEmailReminder.mock.calls[0];
      expect(summary).toBe('Sprint Review');
      expect(dtstart).toBe(eventStart.toISOString());
    });
  });

  describe('start / stop', () => {
    it('start begins polling; stop clears the interval', () => {
      jest.useFakeTimers();
      const reminderModel = makeReminderModel([]);
      const svc = new ReminderDispatchService(
        reminderModel as never,
        makeEventModel() as never,
        makeMailDelivery() as never,
      );

      svc.start(1_000);
      jest.advanceTimersByTime(3_500);
      svc.stop();
      jest.advanceTimersByTime(5_000);

      // find called ~3 times during the 3.5 s window, then zero more after stop
      expect(reminderModel.find.mock.calls.length).toBeGreaterThanOrEqual(3);
      const callsAfterStop = reminderModel.find.mock.calls.length;
      jest.advanceTimersByTime(5_000);
      expect(reminderModel.find.mock.calls.length).toBe(callsAfterStop);
    });

    it('calling start() twice does not create a second interval', () => {
      jest.useFakeTimers();
      const reminderModel = makeReminderModel([]);
      const svc = new ReminderDispatchService(
        reminderModel as never,
        makeEventModel() as never,
        makeMailDelivery() as never,
      );

      svc.start(1_000);
      svc.start(1_000); // second call should be no-op
      jest.advanceTimersByTime(3_500);
      svc.stop();

      // With a single 1s interval, we expect ~3 calls, not 6
      expect(reminderModel.find.mock.calls.length).toBeLessThanOrEqual(5);
    });
  });
});
