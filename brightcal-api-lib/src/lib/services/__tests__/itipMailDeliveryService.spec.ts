/**
 * ItipMailDeliveryService — unit tests.
 *
 * Verifies:
 *  - flushQueue drains the notification service queue and sends one email per
 *    iTIP message.
 *  - flushQueue returns the number of successfully sent messages.
 *  - flushQueue clears the queue before sending (idempotent on re-call).
 *  - sendEmailReminder sends a plain-text reminder for ACTION:EMAIL reminders.
 *  - sendEmailReminder is a no-op for non-EMAIL actions.
 *  - Individual send failures do not block remaining messages.
 *
 * @see Requirements 10.1, 10.6, 17.1
 */

import { ITipMethod } from '@brightchain/brightcal-lib';
import type { ITipMessage } from '../calendarNotificationService.ts';
import type { IMailSender, IOutboundEmail } from '../itipMailDeliveryService.ts';
import { ItipMailDeliveryService } from '../itipMailDeliveryService.ts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMessage(
  method: string,
  uid: string,
  recipients: string[],
): ITipMessage {
  return {
    method,
    eventUid: uid,
    sequence: 0,
    icalData: `BEGIN:VCALENDAR\r\nMETHOD:${method}\r\nEND:VCALENDAR`,
    recipients,
  };
}

function makeNotificationService(messages: ITipMessage[] = []) {
  const queue = [...messages];
  return {
    getMessageQueue: jest.fn(() => queue as readonly ITipMessage[]),
    clearMessageQueue: jest.fn(() => {
      queue.length = 0;
    }),
  };
}

function makeMailSender(): jest.Mocked<IMailSender> {
  return { sendEmail: jest.fn().mockResolvedValue(undefined) };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ItipMailDeliveryService', () => {
  describe('flushQueue', () => {
    it('sends one email per queued iTIP message', async () => {
      const msgs = [
        makeMessage('REQUEST', 'uid-1', ['alice@example.com']),
        makeMessage('REQUEST', 'uid-2', ['bob@example.com']),
      ];
      const notifier = makeNotificationService(msgs);
      const sender = makeMailSender();
      const svc = new ItipMailDeliveryService(
        notifier as never,
        sender,
        'noreply@test.example',
      );

      const count = await svc.flushQueue();

      expect(count).toBe(2);
      expect(sender.sendEmail).toHaveBeenCalledTimes(2);
    });

    it('clears the queue before dispatching', async () => {
      const notifier = makeNotificationService([
        makeMessage('REQUEST', 'uid-1', ['alice@example.com']),
      ]);
      const sender = makeMailSender();
      const svc = new ItipMailDeliveryService(
        notifier as never,
        sender,
        'noreply@test.example',
      );

      await svc.flushQueue();

      expect(notifier.clearMessageQueue).toHaveBeenCalledTimes(1);
    });

    it('returns 0 and sends nothing when queue is empty', async () => {
      const notifier = makeNotificationService([]);
      const sender = makeMailSender();
      const svc = new ItipMailDeliveryService(
        notifier as never,
        sender,
        'noreply@test.example',
      );

      const count = await svc.flushQueue();

      expect(count).toBe(0);
      expect(sender.sendEmail).not.toHaveBeenCalled();
    });

    it('continues sending remaining messages after a per-message failure', async () => {
      const msgs = [
        makeMessage('REQUEST', 'uid-1', ['bad@example.com']),
        makeMessage('REQUEST', 'uid-2', ['good@example.com']),
      ];
      const notifier = makeNotificationService(msgs);
      const sender = makeMailSender();
      sender.sendEmail
        .mockRejectedValueOnce(new Error('SMTP error'))
        .mockResolvedValueOnce(undefined);

      const svc = new ItipMailDeliveryService(
        notifier as never,
        sender,
        'noreply@test.example',
      );

      const count = await svc.flushQueue();

      // Only the second message succeeded
      expect(count).toBe(1);
      expect(sender.sendEmail).toHaveBeenCalledTimes(2);
    });

    it('sets the correct iTIP method on the calendar email', async () => {
      const msgs = [makeMessage('CANCEL', 'uid-cancel', ['alice@example.com'])];
      const notifier = makeNotificationService(msgs);
      const sender = makeMailSender();
      const svc = new ItipMailDeliveryService(
        notifier as never,
        sender,
        'noreply@test.example',
      );

      await svc.flushQueue();

      const sent = sender.sendEmail.mock.calls[0][0] as IOutboundEmail;
      expect(sent.calendarMethod).toBe('CANCEL');
      expect(sent.to).toEqual(['alice@example.com']);
    });

    it('uses subject "Cancelled: Calendar Event" for CANCEL method', async () => {
      const notifier = makeNotificationService([
        makeMessage('CANCEL', 'uid-1', ['alice@example.com']),
      ]);
      const sender = makeMailSender();
      const svc = new ItipMailDeliveryService(
        notifier as never,
        sender,
        'noreply@test.example',
      );

      await svc.flushQueue();

      const sent = sender.sendEmail.mock.calls[0][0] as IOutboundEmail;
      expect(sent.subject).toMatch(/cancelled/i);
    });
  });

  describe('sendEmailReminder', () => {
    it('sends a reminder email for ACTION:EMAIL reminders', async () => {
      const notifier = makeNotificationService();
      const sender = makeMailSender();
      const svc = new ItipMailDeliveryService(
        notifier as never,
        sender,
        'noreply@test.example',
      );

      await svc.sendEmailReminder(
        { action: 'EMAIL', triggerMinutesBefore: 30 },
        'Team Standup',
        '2024-06-15T09:00:00Z',
        'user@example.com',
      );

      expect(sender.sendEmail).toHaveBeenCalledTimes(1);
      const sent = sender.sendEmail.mock.calls[0][0] as IOutboundEmail;
      expect(sent.to).toEqual(['user@example.com']);
      expect(sent.subject).toContain('Reminder');
      expect(sent.subject).toContain('Team Standup');
      expect(sent.textBody).toContain('30 minute(s)');
    });

    it('sends "X hour(s)" label for reminders >= 60 minutes', async () => {
      const notifier = makeNotificationService();
      const sender = makeMailSender();
      const svc = new ItipMailDeliveryService(
        notifier as never,
        sender,
        'noreply@test.example',
      );

      await svc.sendEmailReminder(
        { action: 'EMAIL', triggerMinutesBefore: 120 },
        'All Hands',
        '2024-06-15T14:00:00Z',
        'user@example.com',
      );

      const sent = sender.sendEmail.mock.calls[0][0] as IOutboundEmail;
      expect(sent.textBody).toContain('2 hour(s)');
    });

    it('is a no-op for ACTION:DISPLAY reminders', async () => {
      const notifier = makeNotificationService();
      const sender = makeMailSender();
      const svc = new ItipMailDeliveryService(
        notifier as never,
        sender,
        'noreply@test.example',
      );

      await svc.sendEmailReminder(
        { action: 'DISPLAY', triggerMinutesBefore: 15 },
        'Meeting',
        '2024-06-15T10:00:00Z',
        'user@example.com',
      );

      expect(sender.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('method subjects', () => {
    const cases: Array<[string, RegExp]> = [
      ['REQUEST', /calendar invite/i],
      ['REPLY', /response to calendar invite/i],
      ['CANCEL', /cancelled/i],
      ['COUNTER', /counter-proposal/i],
      ['DECLINECOUNTER', /counter declined/i],
    ];

    it.each(cases)(
      'uses correct subject for %s method',
      async (method, pattern) => {
        const notifier = makeNotificationService([
          makeMessage(method, 'uid-x', ['a@example.com']),
        ]);
        const sender = makeMailSender();
        const svc = new ItipMailDeliveryService(
          notifier as never,
          sender,
          'noreply@test.example',
        );

        await svc.flushQueue();

        const sent = sender.sendEmail.mock.calls[0][0] as IOutboundEmail;
        expect(sent.subject).toMatch(pattern);
      },
    );
  });
});
