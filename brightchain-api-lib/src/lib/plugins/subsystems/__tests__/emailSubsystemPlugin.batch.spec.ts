/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for EmailSubsystemPlugin's external-email dispatcher.
 *
 * Verifies the dispatcher selects the correct delivery path:
 *  - Batch-capable transports (implementing IBatchEmailService) receive a
 *    single sendEmailBatch call carrying To/CC/BCC partitions verbatim.
 *  - Legacy single-recipient transports fall back to per-address sendEmail
 *    fan-out.
 */
import { ServiceKeys } from '@digitaldefiance/node-express-suite';

// Stub the local MessagePassingService so plugin.initialize doesn't drag in
// real CBL/metadata wiring. We just need to capture the dispatcher closure
// passed to setExternalEmailDispatcher().
let capturedDispatcher: ((args: any) => Promise<void>) | undefined;

jest.mock('../../../services/messagePassingService', () => ({
  MessagePassingService: jest.fn().mockImplementation(() => ({
    configureEmail: jest.fn(),
    setExternalEmailDispatcher: (fn: any) => {
      capturedDispatcher = fn;
    },
  })),
}));

jest.mock('../../../services/brightmail/brightDbEmailMetadataStore', () => ({
  BrightDbEmailMetadataStore: jest.fn().mockImplementation(() => ({})),
  BRIGHTMAIL_EMAILS_COLLECTION: 'emails',
  BRIGHTMAIL_ATTACHMENTS_COLLECTION: 'attachments',
  BRIGHTMAIL_READ_TRACKING_COLLECTION: 'read',
}));

import { EmailSubsystemPlugin } from '../emailSubsystemPlugin';

function makeContext(transport: unknown) {
  return {
    services: {
      get: jest.fn((key: string) => {
        if (key === ServiceKeys.EMAIL) return transport;
        throw new Error(`unknown service ${key}`);
      }),
      register: jest.fn(),
      has: jest.fn(),
    },
    apiRouter: null,
    expressApp: {} as any,
    environment: { debug: false, emailDomain: 'brightchain.example' },
    blockStore: {},
    memberStore: {},
    energyStore: {},
    brightDb: {},
    getModel: jest.fn(() => ({})),
    eventSystem: null,
  } as any;
}

const externalTo = [
  { address: 'to1@example.com', displayName: 'To One' },
  { address: 'to2@example.com' },
];
const externalCc = [{ address: 'cc1@example.com' }];
const externalBcc = [
  { address: 'bcc1@example.com' },
  { address: 'bcc2@example.com', displayName: 'B Two' },
];

const from = { address: 'sender@brightchain.example', displayName: 'Sender' };

const dispatchPayload = {
  messageId: 'msg-1',
  from,
  externalTo,
  externalCc,
  externalBcc,
  subject: 'Hi',
  textBody: 'plain',
  htmlBody: '<p>html</p>',
};

describe('EmailSubsystemPlugin external email dispatcher', () => {
  beforeEach(() => {
    capturedDispatcher = undefined;
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('routes through sendEmailBatch when the transport is batch-capable', async () => {
    const sendEmailBatch = jest.fn().mockResolvedValue(undefined);
    const sendEmail = jest.fn();
    const transport = { sendEmail, sendEmailBatch };

    const plugin = new EmailSubsystemPlugin();
    await plugin.initialize(makeContext(transport));

    expect(capturedDispatcher).toBeDefined();
    await capturedDispatcher!(dispatchPayload);

    expect(sendEmailBatch).toHaveBeenCalledTimes(1);
    expect(sendEmail).not.toHaveBeenCalled();

    const arg = sendEmailBatch.mock.calls[0][0];
    expect(arg.from).toBe('Sender <sender@brightchain.example>');
    expect(arg.subject).toBe('Hi');
    expect(arg.text).toBe('plain');
    expect(arg.html).toBe('<p>html</p>');
    expect(arg.to).toEqual(['To One <to1@example.com>', 'to2@example.com']);
    expect(arg.cc).toEqual(['cc1@example.com']);
    expect(arg.bcc).toEqual(['bcc1@example.com', 'B Two <bcc2@example.com>']);
  });

  it('falls back to per-recipient sendEmail when the transport lacks sendEmailBatch', async () => {
    const sendEmail = jest.fn().mockResolvedValue(undefined);
    const transport = { sendEmail };

    const plugin = new EmailSubsystemPlugin();
    await plugin.initialize(makeContext(transport));

    expect(capturedDispatcher).toBeDefined();
    await capturedDispatcher!(dispatchPayload);

    // 2 To + 1 CC + 2 BCC = 5 individual sends.
    expect(sendEmail).toHaveBeenCalledTimes(5);

    const recipients = sendEmail.mock.calls.map((c) => c[0]);
    expect(recipients).toEqual([
      'To One <to1@example.com>',
      'to2@example.com',
      'cc1@example.com',
      'bcc1@example.com',
      'B Two <bcc2@example.com>',
    ]);

    for (const call of sendEmail.mock.calls) {
      expect(call[1]).toBe('Hi');
      expect(call[2]).toBe('plain');
      expect(call[3]).toBe('<p>html</p>');
      expect(call[4]).toBe('Sender <sender@brightchain.example>');
    }
  });

  it('uses html=text fallback when htmlBody is undefined', async () => {
    const sendEmailBatch = jest.fn().mockResolvedValue(undefined);
    const transport = { sendEmail: jest.fn(), sendEmailBatch };

    const plugin = new EmailSubsystemPlugin();
    await plugin.initialize(makeContext(transport));

    await capturedDispatcher!({
      ...dispatchPayload,
      textBody: 'plain-only',
      htmlBody: undefined,
    });

    const arg = sendEmailBatch.mock.calls[0][0];
    expect(arg.text).toBe('plain-only');
    expect(arg.html).toBe('plain-only');
  });

  it('swallows batch transport errors without throwing', async () => {
    const sendEmailBatch = jest.fn().mockRejectedValue(new Error('batch boom'));
    const transport = { sendEmail: jest.fn(), sendEmailBatch };

    const plugin = new EmailSubsystemPlugin();
    await plugin.initialize(makeContext(transport));

    await expect(capturedDispatcher!(dispatchPayload)).resolves.toBeUndefined();
    expect(sendEmailBatch).toHaveBeenCalledTimes(1);
  });
});
