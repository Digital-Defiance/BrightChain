/**
 * AntiSpamFilter — milter integration adapter for SpamAssassin/Rspamd
 * score classification of inbound email messages.
 *
 * The filter wraps a configurable spam engine client (SpamAssassin via
 * spamc protocol or Rspamd via HTTP API) and classifies messages as
 * ham, probable-spam, or definite-spam based on configurable score
 * thresholds from `ISpamThresholds`.
 *
 * Integration with Postfix is via the milter protocol (RFC 6008):
 * - Definite-spam → signal rejection (SMFIS_REJECT, 550)
 * - Probable-spam → accept and tag metadata with spam flag and score
 * - Ham → accept without modification
 *
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 * @module antiSpamFilter
 */

import * as http from 'http';
import * as net from 'net';

import {
  type ISpamThresholds,
  SpamClassification,
} from '@brightchain/brightchain-lib';

// ─── Spam Engine Client Interface ───────────────────────────────────────────

/**
 * Result returned by a spam engine after scanning a message.
 */
export interface ISpamScanResult {
  /** Numeric spam score assigned by the engine */
  score: number;
  /** Whether the engine considers the message spam (engine's own threshold) */
  isSpam: boolean;
  /** Optional human-readable details or rule matches */
  details?: string;
}

/**
 * Interface for spam engine clients that communicate with external
 * spam detection services.
 *
 * Implementations handle the protocol-specific communication with
 * SpamAssassin (spamc TCP protocol) or Rspamd (HTTP API).
 */
export interface ISpamEngineClient {
  /**
   * Scan a raw email message for spam.
   *
   * @param rawMessage - The raw RFC 5322 message bytes
   * @returns Scan result with score and spam determination
   */
  scan(rawMessage: Buffer): Promise<ISpamScanResult>;
}

// ─── SpamAssassin Client ────────────────────────────────────────────────────

/**
 * SpamAssassin engine client — communicates with spamd via the spamc
 * TCP protocol (default port 783).
 *
 * Protocol overview:
 * 1. Connect to spamd TCP socket
 * 2. Send `SYMBOLS SPAMC/1.5\r\nContent-length: <len>\r\n\r\n<message>`
 * 3. Parse response for `Spam: True/False ; <score> / <threshold>` header
 *
 * @see Requirement 7.1
 */
export class SpamAssassinClient implements ISpamEngineClient {
  constructor(
    private readonly host: string = 'localhost',
    private readonly port: number = 783,
    private readonly timeoutMs: number = 30_000,
  ) {}

  async scan(rawMessage: Buffer): Promise<ISpamScanResult> {
    return new Promise<ISpamScanResult>((resolve, reject) => {
      const socket = net.createConnection(
        { host: this.host, port: this.port },
        () => {
          const request =
            `SYMBOLS SPAMC/1.5\r\n` +
            `Content-length: ${rawMessage.length}\r\n` +
            `\r\n`;
          socket.write(request);
          socket.write(rawMessage);
        },
      );

      socket.setTimeout(this.timeoutMs);

      const chunks: Buffer[] = [];

      socket.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      socket.on('end', () => {
        const response = Buffer.concat(chunks).toString('utf-8');
        resolve(SpamAssassinClient.parseResponse(response));
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('SpamAssassin spamd connection timed out'));
      });

      socket.on('error', (err: Error) => {
        reject(
          new Error(`SpamAssassin spamd connection error: ${err.message}`),
        );
      });
    });
  }

  /**
   * Parse the spamd response to extract score and spam determination.
   *
   * Expected header line format:
   *   `Spam: True ; 15.3 / 5.0`
   *   `Spam: False ; 1.2 / 5.0`
   */
  static parseResponse(response: string): ISpamScanResult {
    const spamMatch = response.match(
      /Spam:\s*(True|False|Yes|No)\s*;\s*([\d.]+)\s*\/\s*([\d.]+)/i,
    );

    if (!spamMatch) {
      return {
        score: 0,
        isSpam: false,
        details: 'Unable to parse spamd response',
      };
    }

    const isSpam =
      spamMatch[1].toLowerCase() === 'true' ||
      spamMatch[1].toLowerCase() === 'yes';
    const score = parseFloat(spamMatch[2]);

    // Extract rule matches from the body (lines after headers)
    const bodyStart = response.indexOf('\r\n\r\n');
    const details =
      bodyStart >= 0 ? response.substring(bodyStart + 4).trim() : undefined;

    return { score, isSpam, details: details || undefined };
  }
}

// ─── Rspamd Client ──────────────────────────────────────────────────────────

/**
 * Rspamd engine client — communicates with rspamd via its HTTP API
 * (default port 11333).
 *
 * Protocol overview:
 * 1. POST raw message to `http://<host>:<port>/checkv2`
 * 2. Parse JSON response for `score`, `is_spam`/`action`, and `symbols`
 *
 * @see Requirement 7.1
 */
export class RspamdClient implements ISpamEngineClient {
  constructor(
    private readonly host: string = 'localhost',
    private readonly port: number = 11333,
    private readonly timeoutMs: number = 30_000,
  ) {}

  async scan(rawMessage: Buffer): Promise<ISpamScanResult> {
    return new Promise<ISpamScanResult>((resolve, reject) => {
      const options: http.RequestOptions = {
        hostname: this.host,
        port: this.port,
        path: '/checkv2',
        method: 'POST',
        headers: {
          'Content-Length': rawMessage.length,
        },
        timeout: this.timeoutMs,
      };

      const req = http.request(options, (res) => {
        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');
          try {
            resolve(RspamdClient.parseResponse(body));
          } catch (err) {
            reject(
              new Error(
                `Rspamd response parse error: ${err instanceof Error ? err.message : String(err)}`,
              ),
            );
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Rspamd HTTP connection timed out'));
      });

      req.on('error', (err: Error) => {
        reject(new Error(`Rspamd HTTP connection error: ${err.message}`));
      });

      req.write(rawMessage);
      req.end();
    });
  }

  /**
   * Parse the Rspamd JSON response.
   *
   * Expected JSON structure:
   * ```json
   * {
   *   "score": 15.3,
   *   "required_score": 15.0,
   *   "action": "reject" | "add header" | "no action" | ...,
   *   "symbols": { ... }
   * }
   * ```
   */
  static parseResponse(body: string): ISpamScanResult {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {
        score: 0,
        isSpam: false,
        details: 'Unable to parse Rspamd JSON response',
      };
    }

    const score = typeof parsed['score'] === 'number' ? parsed['score'] : 0;
    const action = typeof parsed['action'] === 'string' ? parsed['action'] : '';

    // Rspamd actions: "reject", "rewrite subject", "add header",
    // "greylist", "no action", "soft reject"
    const isSpam = action === 'reject' || action === 'add header';

    // Summarize matched symbols if available
    let details: string | undefined;
    if (
      parsed['symbols'] &&
      typeof parsed['symbols'] === 'object' &&
      parsed['symbols'] !== null
    ) {
      const symbolNames = Object.keys(
        parsed['symbols'] as Record<string, unknown>,
      );
      if (symbolNames.length > 0) {
        details = symbolNames.join(', ');
      }
    }

    return { score, isSpam, details };
  }
}

// ─── Anti-Spam Filter Result ────────────────────────────────────────────────

/**
 * Result of scanning a message through the anti-spam filter.
 *
 * @see Requirements 7.2, 7.3, 7.4
 */
export interface IAntiSpamScanResult {
  /** Numeric spam score from the engine */
  score: number;
  /** Classification based on configurable thresholds */
  classification: SpamClassification;
  /** Optional details from the spam engine (rule matches, etc.) */
  details?: string;
}

// ─── Milter Action ──────────────────────────────────────────────────────────

/**
 * Milter protocol actions that the filter can signal to Postfix.
 *
 * Maps to Sendmail milter protocol responses (RFC 6008):
 * - `accept`: SMFIS_ACCEPT — accept the message
 * - `reject`: SMFIS_REJECT — reject with 550
 * - `continue`: SMFIS_CONTINUE — continue processing (accept with modifications)
 *
 * @see Requirement 7.5
 */
export type MilterAction = 'accept' | 'reject' | 'continue';

/**
 * Full milter response including the action and any metadata tags
 * to add to the message.
 *
 * @see Requirements 7.3, 7.4, 7.5
 */
export interface IMilterResponse {
  /** Milter action to signal to Postfix */
  action: MilterAction;
  /** SMTP reply code (e.g. 550 for rejection) */
  replyCode?: number;
  /** SMTP reply text */
  replyText?: string;
  /** Headers to add to the message (for probable-spam tagging) */
  addHeaders?: Record<string, string>;
  /** The scan result that produced this response */
  scanResult: IAntiSpamScanResult;
}

// ─── Anti-Spam Filter Interface ─────────────────────────────────────────────

/**
 * Interface for the anti-spam filter adapter.
 *
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */
export interface IAntiSpamFilter {
  /**
   * Scan a raw email message and return the spam classification result.
   *
   * @param rawMessage - The raw RFC 5322 message bytes
   * @returns Scan result with score, classification, and optional details
   */
  scan(rawMessage: Buffer): Promise<IAntiSpamScanResult>;

  /**
   * Scan a message and return the milter protocol response that should
   * be sent back to Postfix.
   *
   * This is the primary integration point for the Postfix milter protocol.
   *
   * @param rawMessage - The raw RFC 5322 message bytes
   * @returns Milter response with action, optional reply code, and headers
   */
  milterCheck(rawMessage: Buffer): Promise<IMilterResponse>;
}

// ─── Anti-Spam Filter Implementation ────────────────────────────────────────

/**
 * Milter integration adapter for SpamAssassin/Rspamd score classification.
 *
 * Wraps a configurable spam engine client and classifies messages based
 * on `ISpamThresholds`:
 * - score < probableSpamScore → Ham (accept)
 * - probableSpamScore ≤ score < definiteSpamScore → ProbableSpam (tag metadata)
 * - score ≥ definiteSpamScore → DefiniteSpam (reject 550)
 *
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */
export class AntiSpamFilter implements IAntiSpamFilter {
  private readonly engineClient: ISpamEngineClient;
  private readonly thresholds: ISpamThresholds;

  /**
   * Create an AntiSpamFilter with the specified engine and thresholds.
   *
   * @param engine - Which spam engine to use: `'spamassassin'` or `'rspamd'`
   * @param thresholds - Score thresholds for classification
   * @param engineClient - Optional pre-configured engine client (for testing / DI)
   * @param engineHost - Host for the spam engine (default: localhost)
   * @param enginePort - Port for the spam engine (default: engine-specific)
   */
  constructor(
    engine: 'spamassassin' | 'rspamd',
    thresholds: ISpamThresholds,
    engineClient?: ISpamEngineClient,
    engineHost?: string,
    enginePort?: number,
  ) {
    this.thresholds = thresholds;

    if (engineClient) {
      this.engineClient = engineClient;
    } else if (engine === 'rspamd') {
      this.engineClient = new RspamdClient(
        engineHost ?? 'localhost',
        enginePort ?? 11333,
      );
    } else {
      this.engineClient = new SpamAssassinClient(
        engineHost ?? 'localhost',
        enginePort ?? 783,
      );
    }
  }

  /**
   * Classify a spam score against the configured thresholds.
   *
   * @param score - Numeric spam score from the engine
   * @returns The spam classification
   *
   * @see Requirement 7.2
   */
  classify(score: number): SpamClassification {
    if (score >= this.thresholds.definiteSpamScore) {
      return SpamClassification.DefiniteSpam;
    }
    if (score >= this.thresholds.probableSpamScore) {
      return SpamClassification.ProbableSpam;
    }
    return SpamClassification.Ham;
  }

  /**
   * Scan a raw email message and return the spam classification result.
   *
   * Delegates to the configured spam engine client, then classifies
   * the returned score against the configured thresholds.
   *
   * @param rawMessage - The raw RFC 5322 message bytes
   * @returns Scan result with score, classification, and optional details
   *
   * @see Requirements 7.1, 7.2
   */
  async scan(rawMessage: Buffer): Promise<IAntiSpamScanResult> {
    const engineResult = await this.engineClient.scan(rawMessage);
    const classification = this.classify(engineResult.score);

    return {
      score: engineResult.score,
      classification,
      details: engineResult.details,
    };
  }

  /**
   * Scan a message and return the milter protocol response for Postfix.
   *
   * Maps classification to milter actions:
   * - DefiniteSpam → reject (SMFIS_REJECT, 550)
   * - ProbableSpam → continue with X-Spam-Flag / X-Spam-Score headers
   * - Ham → accept
   *
   * @param rawMessage - The raw RFC 5322 message bytes
   * @returns Milter response with action, optional reply code, and headers
   *
   * @see Requirements 7.3, 7.4, 7.5
   */
  async milterCheck(rawMessage: Buffer): Promise<IMilterResponse> {
    const scanResult = await this.scan(rawMessage);

    switch (scanResult.classification) {
      case SpamClassification.DefiniteSpam:
        // Req 7.3: reject at SMTP time with 550
        return {
          action: 'reject',
          replyCode: 550,
          replyText: '5.7.1 Message rejected as spam',
          scanResult,
        };

      case SpamClassification.ProbableSpam:
        // Req 7.4: accept and tag metadata with spam flag and score
        return {
          action: 'continue',
          addHeaders: {
            'X-Spam-Flag': 'YES',
            'X-Spam-Score': scanResult.score.toFixed(2),
            'X-Spam-Status': `Yes, score=${scanResult.score.toFixed(2)}${
              scanResult.details ? ` tests=${scanResult.details}` : ''
            }`,
          },
          scanResult,
        };

      case SpamClassification.Ham:
      default:
        // Ham: accept without modification
        return {
          action: 'accept',
          addHeaders: {
            'X-Spam-Flag': 'NO',
            'X-Spam-Score': scanResult.score.toFixed(2),
            'X-Spam-Status': `No, score=${scanResult.score.toFixed(2)}${
              scanResult.details ? ` tests=${scanResult.details}` : ''
            }`,
          },
          scanResult,
        };
    }
  }
}
