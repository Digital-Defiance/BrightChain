/**
 * Email Authentication Verifier — parses SPF/DKIM/DMARC authentication
 * results from inbound email messages.
 *
 * In a typical deployment, Postfix and its milters (e.g. OpenDKIM,
 * opendmarc, pypolicyd-spf) perform the actual SPF, DKIM, and DMARC
 * verification before depositing the message in the Mail Drop Directory.
 * These results are recorded in the `Authentication-Results` header
 * (RFC 8601).
 *
 * This verifier parses those headers from the raw message to extract
 * structured `IEmailAuthenticationResult` metadata that the
 * InboundProcessor stores alongside the message.
 *
 * @see Requirements 6.4, 6.5
 * @module emailAuthVerifier
 */

import type { IEmailAuthenticationResult } from '@brightchain/brightchain-lib';

// ─── Interface ──────────────────────────────────────────────────────────────

/**
 * Interface for verifying email authentication results.
 *
 * Implementations parse the `Authentication-Results` header from a raw
 * RFC 5322 message and return structured SPF/DKIM/DMARC results.
 *
 * @see Requirements 6.4, 6.5
 */
export interface IEmailAuthVerifier {
  /**
   * Verify authentication results for an inbound email message.
   *
   * @param rawMessage - The raw RFC 5322 message bytes (as deposited by Postfix)
   * @param senderIp  - Optional IP address of the sending server (for logging)
   * @returns Structured authentication results for SPF, DKIM, and DMARC
   */
  verify(
    rawMessage: Uint8Array | Buffer,
    senderIp?: string,
  ): IEmailAuthenticationResult;
}

// ─── Types ──────────────────────────────────────────────────────────────────

type SpfStatus = IEmailAuthenticationResult['spf']['status'];
type DkimStatus = IEmailAuthenticationResult['dkim']['status'];
type DmarcStatus = IEmailAuthenticationResult['dmarc']['status'];

const VALID_SPF_STATUSES: ReadonlySet<string> = new Set([
  'pass',
  'fail',
  'softfail',
  'neutral',
  'none',
  'temperror',
  'permerror',
]);

const VALID_DKIM_STATUSES: ReadonlySet<string> = new Set([
  'pass',
  'fail',
  'none',
  'temperror',
  'permerror',
]);

const VALID_DMARC_STATUSES: ReadonlySet<string> = new Set([
  'pass',
  'fail',
  'none',
  'temperror',
  'permerror',
]);

// ─── Default result ─────────────────────────────────────────────────────────

/**
 * Returns a default `IEmailAuthenticationResult` with all statuses set to `'none'`.
 */
export function defaultAuthResult(): IEmailAuthenticationResult {
  return {
    spf: { status: 'none' },
    dkim: { status: 'none' },
    dmarc: { status: 'none' },
  };
}

// ─── Implementation ─────────────────────────────────────────────────────────

/**
 * Parses `Authentication-Results` headers from raw RFC 5322 messages to
 * extract SPF, DKIM, and DMARC verification results.
 *
 * This is an adapter/stub that reads results already computed by
 * Postfix milters. It does NOT perform cryptographic DKIM verification
 * or DNS lookups itself.
 *
 * @see Requirements 6.4, 6.5
 */
export class EmailAuthVerifier implements IEmailAuthVerifier {
  /**
   * Parse authentication results from the raw message headers.
   *
   * Extracts the `Authentication-Results` header value and parses
   * individual method results (spf=, dkim=, dmarc=).
   *
   * @param rawMessage - Raw RFC 5322 message bytes
   * @param _senderIp  - Sender IP (unused; reserved for future direct verification)
   * @returns Structured authentication results
   */
  verify(
    rawMessage: Uint8Array | Buffer,
    _senderIp?: string,
  ): IEmailAuthenticationResult {
    const headerValue = this.extractAuthResultsHeader(rawMessage);
    if (!headerValue) {
      return defaultAuthResult();
    }
    return this.parseAuthResultsHeader(headerValue);
  }

  /**
   * Check whether the authentication result indicates a DMARC reject
   * condition — i.e. DMARC status is `'fail'`.
   *
   * The caller (InboundProcessor) uses this to decide whether to move
   * the message to the error directory with a 550-equivalent rejection.
   *
   * @param result - The parsed authentication result
   * @returns `true` if DMARC failed (reject policy should apply)
   *
   * @see Requirement 6.5
   */
  static shouldRejectDmarc(result: IEmailAuthenticationResult): boolean {
    return result.dmarc.status === 'fail';
  }

  // ─── Header extraction ──────────────────────────────────────────────

  /**
   * Extract the value of the first `Authentication-Results` header from
   * the raw message bytes.
   *
   * RFC 5322 headers end at the first blank line (`\r\n\r\n` or `\n\n`).
   * Header continuation (folding) is handled by joining lines that start
   * with whitespace.
   */
  private extractAuthResultsHeader(
    rawMessage: Uint8Array | Buffer,
  ): string | null {
    const text =
      typeof rawMessage === 'string'
        ? rawMessage
        : Buffer.isBuffer(rawMessage)
          ? rawMessage.toString('utf-8')
          : new TextDecoder().decode(rawMessage);

    // Split headers from body at the first blank line.
    const headerEndCrLf = text.indexOf('\r\n\r\n');
    const headerEndLf = text.indexOf('\n\n');
    let headerSection: string;

    if (
      headerEndCrLf >= 0 &&
      (headerEndLf < 0 || headerEndCrLf <= headerEndLf)
    ) {
      headerSection = text.substring(0, headerEndCrLf);
    } else if (headerEndLf >= 0) {
      headerSection = text.substring(0, headerEndLf);
    } else {
      // No blank line — treat entire content as headers.
      headerSection = text;
    }

    // Unfold continuation lines (lines starting with whitespace are
    // continuations of the previous header per RFC 5322 §2.2.3).
    const unfolded = headerSection.replace(/\r?\n([ \t])/g, ' ');

    // Split into individual header lines.
    const lines = unfolded.split(/\r?\n/);

    for (const line of lines) {
      const match = line.match(/^Authentication-Results:\s*(.+)$/i);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  // ─── Header parsing ─────────────────────────────────────────────────

  /**
   * Parse an `Authentication-Results` header value into structured results.
   *
   * The header format (RFC 8601) is roughly:
   *   `authserv-id; method=status (details); method=status ...`
   *
   * We split on `;` and look for `spf=`, `dkim=`, `dmarc=` prefixes.
   */
  private parseAuthResultsHeader(
    headerValue: string,
  ): IEmailAuthenticationResult {
    const result = defaultAuthResult();

    // Split on semicolons — first segment is the authserv-id, rest are results.
    const segments = headerValue.split(';').map((s) => s.trim());

    // Skip the first segment (authserv-id).
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment) continue;

      this.parseMethodResult(segment, result);
    }

    return result;
  }

  /**
   * Parse a single method result segment like `spf=pass (details here)`.
   */
  private parseMethodResult(
    segment: string,
    result: IEmailAuthenticationResult,
  ): void {
    // Match pattern: method=status with optional details in parentheses or after whitespace
    // Examples:
    //   spf=pass (sender SPF authorized)
    //   dkim=pass header.d=example.com
    //   dmarc=fail (p=reject)
    const methodMatch = segment.match(/^\s*(spf|dkim|dmarc)\s*=\s*(\S+)/i);
    if (!methodMatch) return;

    const method = methodMatch[1].toLowerCase() as 'spf' | 'dkim' | 'dmarc';
    const rawStatus = methodMatch[2].toLowerCase();

    // Extract optional details in parentheses.
    const detailsMatch = segment.match(/\(([^)]*)\)/);
    const details = detailsMatch ? detailsMatch[1].trim() : undefined;

    switch (method) {
      case 'spf':
        if (VALID_SPF_STATUSES.has(rawStatus)) {
          result.spf = { status: rawStatus as SpfStatus, details };
        }
        break;
      case 'dkim':
        if (VALID_DKIM_STATUSES.has(rawStatus)) {
          result.dkim = { status: rawStatus as DkimStatus, details };
        }
        break;
      case 'dmarc':
        if (VALID_DMARC_STATUSES.has(rawStatus)) {
          result.dmarc = { status: rawStatus as DmarcStatus, details };
        }
        break;
    }
  }
}
