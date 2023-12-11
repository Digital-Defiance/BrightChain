/* eslint-disable @typescript-eslint/no-explicit-any */
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  IApplication,
  IBatchEmailService,
  IEmailBatchInput,
  IEmailService,
} from '@digitaldefiance/node-express-suite';
import { Environment } from '../environment';
import { DefaultBackendIdType } from '../types/backend-id';
// import { debugLog } from '../utils';
const debugLog = (
  debug: boolean,
  type: string,
  message: string,
  ...args: any[]
) => {
  if (debug) {
    console.log(`[${type}] ${message}`, ...args);
  }
};

/**
 * A generic service for sending emails using Amazon SES.
 */
export class SESEmailService<TID extends PlatformID = DefaultBackendIdType>
  implements IEmailService, IBatchEmailService
{
  private readonly sesClient: SESClient;
  private readonly emailSender: string;
  private readonly disableEmailSend: boolean;
  private readonly debug: boolean;
  private readonly application: IApplication<TID>;

  /**
   * Constructs an instance of EmailService.
   * @param config Configuration object containing AWS credentials, region, sender email, and debug/disable flags.
   */
  constructor(application: IApplication<TID>) {
    this.application = application;
    this.emailSender = application.environment.emailSender;
    this.disableEmailSend = application.environment.disableEmailSend;
    this.debug = application.environment.debug;

    // Initialize the SES client with provided AWS credentials and region.
    const environment: Environment = application.environment as Environment;
    this.sesClient = new SESClient({
      region: environment.aws.region,
      credentials: {
        accessKeyId: environment.aws.accessKeyId.value ?? '',
        secretAccessKey: environment.aws.secretAccessKey.value ?? '',
      },
    });
  }

  /**
   * Sends an email using Amazon SES.
   * @param to The recipient's email address.
   * @param subject The subject line of the email.
   * @param text The plain text body of the email.
   * @param html The HTML body of the email.
   * @param source Optional RFC 5322 mailbox string used as the SES `Source`
   *   (envelope MAIL FROM and `From:` header). Must be a verified SES
   *   identity (or live in a verified domain). Defaults to the configured
   *   `EMAIL_SENDER` when omitted.
   * @returns A Promise that resolves when the email is sent successfully, or rejects on failure.
   * @throws Error if email sending is disabled or if SES encounters an error.
   */
  public async sendEmail(
    to: string,
    subject: string,
    text: string,
    html: string,
    source?: string,
  ): Promise<void> {
    if (this.disableEmailSend) {
      debugLog(
        this.debug,
        'log',
        `Email sending disabled for: ${to} - Subject: ${subject}`,
      );
      return;
    }

    const sendCommand = new SendEmailCommand({
      Destination: {
        ToAddresses: [to], // Recipient email address
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: html, // HTML content of the email
          },
          Text: {
            Charset: 'UTF-8',
            Data: text, // Plain text content of the email
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: subject, // Subject of the email
        },
      },
      Source: source ?? this.emailSender, // Sender email address (must be verified in SES)
    });

    try {
      await this.sesClient.send(sendCommand);
      debugLog(
        this.debug,
        'log',
        `Email sent successfully to ${to} with subject: ${subject}`,
      );
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      throw new Error(
        `Failed to send email: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  /**
   * Maximum number of destinations (To + CC + BCC combined) per SES
   * `SendEmail` call. Larger lists are split into multiple SES calls; each
   * recipient still receives a single message — only the wire-level batching
   * is fanned out.
   *
   * @see https://docs.aws.amazon.com/ses/latest/dg/quotas.html
   */
  private static readonly SES_MAX_DESTINATIONS_PER_SEND = 50;

  /**
   * Send a single message to multiple recipients in one (or a few) SES
   * `SendEmail` calls. To and CC addresses are visible to all recipients;
   * BCC addresses are not exposed by SES on the rendered message.
   *
   * Honours the same `disableEmailSend` short-circuit as {@link sendEmail}.
   * If the combined To+CC+BCC list exceeds the per-call limit, the BCC list
   * is chunked across additional calls (To/CC are kept in the first call
   * only so they appear once in the visible headers).
   */
  public async sendEmailBatch(
    input: IEmailBatchInput & { from?: string },
  ): Promise<void> {
    const to = input.to ?? [];
    const cc = input.cc ?? [];
    const bcc = input.bcc ?? [];

    if (to.length === 0 && cc.length === 0 && bcc.length === 0) {
      return;
    }

    if (this.disableEmailSend) {
      debugLog(
        this.debug,
        'log',
        `Email sending disabled for batch (to=${to.length} cc=${cc.length} bcc=${bcc.length}) - Subject: ${input.subject}`,
      );
      return;
    }

    const limit = SESEmailService.SES_MAX_DESTINATIONS_PER_SEND;
    const visibleCount = to.length + cc.length;
    if (visibleCount > limit) {
      throw new Error(
        `SES SendEmail destination limit exceeded: To+CC=${visibleCount} > ${limit}`,
      );
    }

    // First call carries the visible recipients (To/CC) plus as many BCCs as
    // fit. Remaining BCCs are sent in subsequent calls with no To/CC so the
    // header line stays consistent and we never duplicate visible delivery.
    const bccChunks: string[][] = [];
    const firstChunkBccCapacity = Math.max(0, limit - visibleCount);
    if (bcc.length === 0) {
      bccChunks.push([]);
    } else {
      bccChunks.push(bcc.slice(0, firstChunkBccCapacity));
      for (let i = firstChunkBccCapacity; i < bcc.length; i += limit) {
        bccChunks.push(bcc.slice(i, i + limit));
      }
    }

    for (let chunkIndex = 0; chunkIndex < bccChunks.length; chunkIndex++) {
      const isFirst = chunkIndex === 0;
      const command = new SendEmailCommand({
        Destination: {
          ToAddresses: isFirst ? to : undefined,
          CcAddresses: isFirst && cc.length > 0 ? cc : undefined,
          BccAddresses:
            bccChunks[chunkIndex].length > 0
              ? bccChunks[chunkIndex]
              : undefined,
        },
        Message: {
          Body: {
            Html: { Charset: 'UTF-8', Data: input.html },
            Text: { Charset: 'UTF-8', Data: input.text },
          },
          Subject: { Charset: 'UTF-8', Data: input.subject },
        },
        Source: input.from ?? this.emailSender,
      });

      try {
        await this.sesClient.send(command);
        debugLog(
          this.debug,
          'log',
          `Email batch chunk ${chunkIndex + 1}/${bccChunks.length} sent (to=${
            isFirst ? to.length : 0
          } cc=${isFirst ? cc.length : 0} bcc=${
            bccChunks[chunkIndex].length
          }) subject="${input.subject}"`,
        );
      } catch (error) {
        console.error(
          `Failed to send batch email (chunk ${chunkIndex + 1}/${
            bccChunks.length
          }):`,
          error,
        );
        throw new Error(
          `Failed to send batch email: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}
