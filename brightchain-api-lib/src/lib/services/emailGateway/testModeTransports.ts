/**
 * Test Mode Transports for Email Gateway
 *
 * Provides mock/stub implementations of IPostfixTransport and IDkimSigner
 * for use in test mode. These capture outbound mail to the filesystem
 * instead of delivering via SMTP, enabling local development and testing
 * without real DNS, MX records, or external connectivity.
 *
 * @see Requirement 8.8 — Test mode for local development
 * @module testModeTransports
 */

import * as fs from 'fs';
import * as path from 'path';

import type { IEmailGatewayConfig } from './emailGatewayConfig';
import type {
  IDkimSigner,
  IPostfixTransport,
  IPostfixTransportResult,
} from './outboundDeliveryWorker';

/**
 * A captured email message stored by the CatchallTransport.
 */
export interface ICapturedEmail {
  /** Envelope sender address */
  from: string;
  /** Envelope recipient addresses */
  to: string[];
  /** Raw RFC 5322 message bytes */
  rawMessage: Uint8Array;
  /** Timestamp when the message was captured */
  capturedAt: Date;
  /** Filename in the catchall directory */
  filename: string;
}

/**
 * Test transport that captures outbound mail to the filesystem instead of
 * delivering via SMTP. Messages are stored in Maildir format in the
 * configured catchall directory.
 *
 * This enables inspection of sent messages during development and testing.
 *
 * @see Requirement 8.8 — Test mode for local development
 */
export class CatchallTransport implements IPostfixTransport {
  /** In-memory list of captured emails (for programmatic access in tests) */
  private readonly captured: ICapturedEmail[] = [];

  constructor(private readonly config: IEmailGatewayConfig) {
    // Ensure catchall directory structure exists
    const catchallDir = config.testMode.catchallDirectory;
    const dirs = [
      catchallDir,
      path.join(catchallDir, 'new'),
      path.join(catchallDir, 'cur'),
      path.join(catchallDir, 'tmp'),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Capture a message to the catchall directory instead of sending via SMTP.
   *
   * @param from - Envelope sender address
   * @param to - Envelope recipient addresses
   * @param rawMessage - Complete RFC 5322 message bytes
   * @returns Always returns success (250)
   */
  async send(
    from: string,
    to: string[],
    rawMessage: Uint8Array,
  ): Promise<IPostfixTransportResult> {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const filename = `${timestamp}.${random}.catchall`;

    const catchallDir = this.config.testMode.catchallDirectory;
    const tmpPath = path.join(catchallDir, 'tmp', filename);
    const newPath = path.join(catchallDir, 'new', filename);

    // Write to tmp first, then move to new (Maildir semantics)
    await fs.promises.writeFile(tmpPath, rawMessage);
    await fs.promises.rename(tmpPath, newPath);

    // Also write metadata sidecar file for easy inspection
    const metadata = {
      from,
      to,
      capturedAt: new Date().toISOString(),
      sizeBytes: rawMessage.byteLength,
    };
    await fs.promises.writeFile(
      `${newPath}.meta.json`,
      JSON.stringify(metadata, null, 2),
    );

    // Track in memory for programmatic access
    const captured: ICapturedEmail = {
      from,
      to,
      rawMessage,
      capturedAt: new Date(),
      filename,
    };
    this.captured.push(captured);

    return {
      success: true,
      responseCode: 250,
      responseMessage: `Message captured to ${filename}`,
    };
  }

  /**
   * Get all captured emails (for programmatic access in tests).
   */
  getCapturedEmails(): readonly ICapturedEmail[] {
    return this.captured;
  }

  /**
   * Clear all captured emails (for test cleanup).
   */
  clearCaptured(): void {
    this.captured.length = 0;
  }

  /**
   * Get the most recently captured email.
   */
  getLastCaptured(): ICapturedEmail | undefined {
    return this.captured[this.captured.length - 1];
  }
}

/**
 * No-op DKIM signer for test mode. Returns the message unchanged.
 *
 * Use this when DKIM signing should be skipped (e.g., no real key available).
 *
 * @see Requirement 8.8 — Test mode for local development
 */
export class NoOpDkimSigner implements IDkimSigner {
  /**
   * Return the message unchanged (no DKIM signature applied).
   */
  async sign(
    rawMessage: Uint8Array,
    _domain: string,
    _selector: string,
  ): Promise<Uint8Array> {
    return rawMessage;
  }
}

/**
 * Test DKIM signer that adds a fake DKIM-Signature header for testing.
 *
 * The signature is not cryptographically valid but allows testing the
 * DKIM signing flow without real key material.
 */
export class FakeDkimSigner implements IDkimSigner {
  /**
   * Add a fake DKIM-Signature header to the message.
   */
  async sign(
    rawMessage: Uint8Array,
    domain: string,
    selector: string,
  ): Promise<Uint8Array> {
    const fakeSignature =
      `DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/simple; d=${domain}; ` +
      `s=${selector}; h=from:to:subject:date; ` +
      `b=FAKE_SIGNATURE_FOR_TESTING_ONLY\r\n`;

    const signatureBytes = new TextEncoder().encode(fakeSignature);
    const result = new Uint8Array(
      signatureBytes.byteLength + rawMessage.byteLength,
    );
    result.set(signatureBytes, 0);
    result.set(rawMessage, signatureBytes.byteLength);

    return result;
  }
}

/**
 * Factory function to create the appropriate transport based on config.
 *
 * @param config - Gateway configuration
 * @param productionTransport - The real transport to use in production mode
 * @returns CatchallTransport in test mode with catchall enabled, otherwise productionTransport
 */
export function createTransport(
  config: IEmailGatewayConfig,
  productionTransport: IPostfixTransport,
): IPostfixTransport {
  if (config.testMode.enabled && config.testMode.catchallEnabled) {
    return new CatchallTransport(config);
  }
  return productionTransport;
}

/**
 * Factory function to create the appropriate DKIM signer based on config.
 *
 * @param config - Gateway configuration
 * @param productionSigner - The real signer to use in production mode
 * @returns NoOpDkimSigner if test mode with skipDkim, otherwise productionSigner
 */
export function createDkimSigner(
  config: IEmailGatewayConfig,
  productionSigner: IDkimSigner,
): IDkimSigner {
  if (config.testMode.enabled && config.testMode.skipDkim) {
    return new NoOpDkimSigner();
  }
  return productionSigner;
}
