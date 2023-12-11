/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for SESEmailService.sendEmailBatch chunking.
 *
 * Verifies:
 *  - Single SES call when To+CC+BCC fits within the 50-destination limit.
 *  - BCC chunked across multiple SES calls when the combined list exceeds
 *    the limit; visible (To/CC) recipients only appear on the first call.
 *  - Each chunk preserves the same Subject/Source/Body content.
 *  - The all-empty input early-returns without invoking SES.
 *  - disableEmailSend short-circuits without invoking SES.
 *  - Throws when To+CC alone exceeds the limit.
 */
import { SendEmailCommand } from '@aws-sdk/client-ses';
import type { IApplication } from '@digitaldefiance/node-express-suite';
import { SESEmailService } from '../sesEmail';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-ses', () => {
  const actual = jest.requireActual('@aws-sdk/client-ses');
  return {
    ...actual,
    SESClient: jest.fn().mockImplementation(() => ({
      send: (...args: unknown[]) => sendMock(...args),
    })),
  };
});

function makeService(opts: { disableEmailSend?: boolean } = {}) {
  const application = {
    environment: {
      emailSender: 'sender@example.com',
      disableEmailSend: opts.disableEmailSend ?? false,
      debug: false,
      aws: {
        region: 'us-east-1',
        accessKeyId: { value: 'AKIA' },
        secretAccessKey: { value: 'SECRET' },
      },
    },
  } as unknown as IApplication;
  return new SESEmailService(application);
}

function addrs(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${i}@example.com`);
}

describe('SESEmailService.sendEmailBatch', () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ MessageId: 'mock' });
  });

  it('early-returns without invoking SES when all recipient lists are empty', async () => {
    const service = makeService();
    await service.sendEmailBatch({
      to: [],
      cc: [],
      bcc: [],
      subject: 's',
      text: 't',
      html: 'h',
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('does not call SES when disableEmailSend is true', async () => {
    const service = makeService({ disableEmailSend: true });
    await service.sendEmailBatch({
      to: ['a@example.com'],
      cc: [],
      bcc: [],
      subject: 's',
      text: 't',
      html: 'h',
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('sends a single SES call when To+CC+BCC fits within limit', async () => {
    const service = makeService();
    const to = addrs('to', 10);
    const cc = addrs('cc', 5);
    const bcc = addrs('bcc', 5);

    await service.sendEmailBatch({
      to,
      cc,
      bcc,
      subject: 'Hello',
      text: 'plain',
      html: '<p>html</p>',
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const cmd = sendMock.mock.calls[0][0] as SendEmailCommand;
    expect(cmd).toBeInstanceOf(SendEmailCommand);
    const input = (cmd as any).input;
    expect(input.Destination.ToAddresses).toEqual(to);
    expect(input.Destination.CcAddresses).toEqual(cc);
    expect(input.Destination.BccAddresses).toEqual(bcc);
    expect(input.Source).toBe('sender@example.com');
    expect(input.Message.Subject.Data).toBe('Hello');
    expect(input.Message.Body.Text.Data).toBe('plain');
    expect(input.Message.Body.Html.Data).toBe('<p>html</p>');
  });

  it('chunks BCC across additional SES calls when combined > 50, keeping To/CC only on first call', async () => {
    const service = makeService();
    const to = addrs('to', 30);
    const cc = addrs('cc', 15);
    const bcc = addrs('bcc', 70); // visible=45 + bcc=70 = 115 total

    await service.sendEmailBatch({
      to,
      cc,
      bcc,
      subject: 'Subj',
      text: 'T',
      html: 'H',
    });

    // First call: 45 visible + 5 BCC = 50. Remaining 65 BCC split as 50 + 15.
    expect(sendMock).toHaveBeenCalledTimes(3);

    const inputs = sendMock.mock.calls.map(
      (c) => (c[0] as SendEmailCommand & { input: any }).input,
    );

    expect(inputs[0].Destination.ToAddresses).toEqual(to);
    expect(inputs[0].Destination.CcAddresses).toEqual(cc);
    expect(inputs[0].Destination.BccAddresses).toEqual(bcc.slice(0, 5));

    expect(inputs[1].Destination.ToAddresses).toBeUndefined();
    expect(inputs[1].Destination.CcAddresses).toBeUndefined();
    expect(inputs[1].Destination.BccAddresses).toEqual(bcc.slice(5, 55));

    expect(inputs[2].Destination.ToAddresses).toBeUndefined();
    expect(inputs[2].Destination.CcAddresses).toBeUndefined();
    expect(inputs[2].Destination.BccAddresses).toEqual(bcc.slice(55, 70));

    // Subject/body identical across chunks.
    for (const input of inputs) {
      expect(input.Source).toBe('sender@example.com');
      expect(input.Message.Subject.Data).toBe('Subj');
      expect(input.Message.Body.Text.Data).toBe('T');
      expect(input.Message.Body.Html.Data).toBe('H');
    }

    // Round-trip BCC reconstruction matches the input list.
    const allBcc = inputs.flatMap((i) => i.Destination.BccAddresses ?? []);
    expect(allBcc).toEqual(bcc);
  });

  it('omits empty CC/BCC arrays from the SES Destination', async () => {
    const service = makeService();
    await service.sendEmailBatch({
      to: ['solo@example.com'],
      cc: [],
      bcc: [],
      subject: 's',
      text: 't',
      html: 'h',
    });

    const input = (sendMock.mock.calls[0][0] as any).input;
    expect(input.Destination.ToAddresses).toEqual(['solo@example.com']);
    expect(input.Destination.CcAddresses).toBeUndefined();
    expect(input.Destination.BccAddresses).toBeUndefined();
  });

  it('throws when To+CC alone exceeds the per-call limit', async () => {
    const service = makeService();
    await expect(
      service.sendEmailBatch({
        to: addrs('to', 40),
        cc: addrs('cc', 15), // 55 visible > 50
        bcc: [],
        subject: 's',
        text: 't',
        html: 'h',
      }),
    ).rejects.toThrow(/destination limit exceeded/i);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('wraps SES errors with a Failed to send batch email message', async () => {
    sendMock.mockRejectedValueOnce(new Error('boom'));
    const service = makeService();
    await expect(
      service.sendEmailBatch({
        to: ['x@example.com'],
        cc: [],
        bcc: [],
        subject: 's',
        text: 't',
        html: 'h',
      }),
    ).rejects.toThrow(/Failed to send batch email/);
  });
});
