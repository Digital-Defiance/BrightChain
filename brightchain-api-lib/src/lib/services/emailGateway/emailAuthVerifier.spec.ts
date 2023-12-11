/**
 * Unit tests for EmailAuthVerifier.
 *
 * Validates:
 * - Parsing of Authentication-Results headers for SPF, DKIM, DMARC
 * - Default results when no header is present
 * - DMARC reject policy detection
 * - Header folding / continuation handling
 * - Invalid / partial header handling
 *
 * @see Requirements 6.4, 6.5
 */

import { defaultAuthResult, EmailAuthVerifier } from './emailAuthVerifier';

import type { IEmailAuthenticationResult } from '@brightchain/brightchain-lib';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRawMessage(headers: string, body = 'Hello'): Buffer {
  return Buffer.from(`${headers}\r\n\r\n${body}`);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('EmailAuthVerifier', () => {
  let verifier: EmailAuthVerifier;

  beforeEach(() => {
    verifier = new EmailAuthVerifier();
  });

  // ── defaultAuthResult ─────────────────────────────────────────────

  describe('defaultAuthResult', () => {
    it('should return all statuses as none', () => {
      const result = defaultAuthResult();
      expect(result.spf.status).toBe('none');
      expect(result.dkim.status).toBe('none');
      expect(result.dmarc.status).toBe('none');
    });
  });

  // ── verify — no header ────────────────────────────────────────────

  describe('verify with no Authentication-Results header', () => {
    it('should return default (none) results', () => {
      const raw = makeRawMessage(
        'From: sender@example.com\r\nTo: alice@brightchain.org\r\nSubject: Test',
      );
      const result = verifier.verify(raw);

      expect(result.spf.status).toBe('none');
      expect(result.dkim.status).toBe('none');
      expect(result.dmarc.status).toBe('none');
    });
  });

  // ── verify — full passing header ──────────────────────────────────

  describe('verify with all-pass Authentication-Results', () => {
    it('should parse spf=pass, dkim=pass, dmarc=pass', () => {
      const raw = makeRawMessage(
        [
          'From: sender@example.com',
          'To: alice@brightchain.org',
          'Authentication-Results: mx.brightchain.org; spf=pass (sender authorized); dkim=pass header.d=example.com; dmarc=pass (policy=none)',
        ].join('\r\n'),
      );

      const result = verifier.verify(raw);

      expect(result.spf.status).toBe('pass');
      expect(result.spf.details).toBe('sender authorized');
      expect(result.dkim.status).toBe('pass');
      expect(result.dmarc.status).toBe('pass');
      expect(result.dmarc.details).toBe('policy=none');
    });
  });

  // ── verify — DMARC fail ───────────────────────────────────────────

  describe('verify with DMARC fail', () => {
    it('should parse dmarc=fail and report details', () => {
      const raw = makeRawMessage(
        [
          'From: spammer@evil.com',
          'Authentication-Results: mx.brightchain.org; spf=fail; dkim=fail; dmarc=fail (p=reject)',
        ].join('\r\n'),
      );

      const result = verifier.verify(raw);

      expect(result.spf.status).toBe('fail');
      expect(result.dkim.status).toBe('fail');
      expect(result.dmarc.status).toBe('fail');
      expect(result.dmarc.details).toBe('p=reject');
    });
  });

  // ── verify — partial results ──────────────────────────────────────

  describe('verify with partial results', () => {
    it('should parse only the methods present, leaving others as none', () => {
      const raw = makeRawMessage(
        'Authentication-Results: mx.brightchain.org; spf=softfail',
      );

      const result = verifier.verify(raw);

      expect(result.spf.status).toBe('softfail');
      expect(result.dkim.status).toBe('none');
      expect(result.dmarc.status).toBe('none');
    });
  });

  // ── verify — header folding ───────────────────────────────────────

  describe('verify with folded (continuation) header', () => {
    it('should handle RFC 5322 header folding', () => {
      const raw = makeRawMessage(
        [
          'From: sender@example.com',
          'Authentication-Results: mx.brightchain.org;',
          '\tspf=pass (sender ok);',
          '\tdkim=pass;',
          '\tdmarc=pass',
        ].join('\r\n'),
      );

      const result = verifier.verify(raw);

      expect(result.spf.status).toBe('pass');
      expect(result.spf.details).toBe('sender ok');
      expect(result.dkim.status).toBe('pass');
      expect(result.dmarc.status).toBe('pass');
    });
  });

  // ── verify — Uint8Array input ─────────────────────────────────────

  describe('verify with Uint8Array input', () => {
    it('should accept Uint8Array as well as Buffer', () => {
      const text =
        'Authentication-Results: mx.brightchain.org; spf=neutral\r\n\r\nBody';
      const raw = new Uint8Array(Buffer.from(text));

      const result = verifier.verify(raw);

      expect(result.spf.status).toBe('neutral');
    });
  });

  // ── verify — invalid status values ────────────────────────────────

  describe('verify with invalid status values', () => {
    it('should ignore unrecognized status values and keep defaults', () => {
      const raw = makeRawMessage(
        'Authentication-Results: mx.brightchain.org; spf=bogus; dkim=invalid',
      );

      const result = verifier.verify(raw);

      // Invalid statuses should be ignored, leaving defaults
      expect(result.spf.status).toBe('none');
      expect(result.dkim.status).toBe('none');
    });
  });

  // ── verify — temperror / permerror ────────────────────────────────

  describe('verify with temperror and permerror statuses', () => {
    it('should parse temperror and permerror correctly', () => {
      const raw = makeRawMessage(
        'Authentication-Results: mx.brightchain.org; spf=temperror; dkim=permerror; dmarc=temperror',
      );

      const result = verifier.verify(raw);

      expect(result.spf.status).toBe('temperror');
      expect(result.dkim.status).toBe('permerror');
      expect(result.dmarc.status).toBe('temperror');
    });
  });

  // ── verify — LF-only line endings ─────────────────────────────────

  describe('verify with LF-only line endings', () => {
    it('should handle messages with LF instead of CRLF', () => {
      const raw = Buffer.from(
        'Authentication-Results: mx.brightchain.org; spf=pass; dkim=pass\n\nBody',
      );

      const result = verifier.verify(raw);

      expect(result.spf.status).toBe('pass');
      expect(result.dkim.status).toBe('pass');
    });
  });

  // ── shouldRejectDmarc ─────────────────────────────────────────────

  describe('shouldRejectDmarc', () => {
    it('should return true when dmarc status is fail', () => {
      const result: IEmailAuthenticationResult = {
        spf: { status: 'pass' },
        dkim: { status: 'pass' },
        dmarc: { status: 'fail', details: 'p=reject' },
      };

      expect(EmailAuthVerifier.shouldRejectDmarc(result)).toBe(true);
    });

    it('should return false when dmarc status is pass', () => {
      const result: IEmailAuthenticationResult = {
        spf: { status: 'pass' },
        dkim: { status: 'pass' },
        dmarc: { status: 'pass' },
      };

      expect(EmailAuthVerifier.shouldRejectDmarc(result)).toBe(false);
    });

    it('should return false when dmarc status is none', () => {
      const result = defaultAuthResult();
      expect(EmailAuthVerifier.shouldRejectDmarc(result)).toBe(false);
    });

    it('should return false when dmarc status is temperror', () => {
      const result: IEmailAuthenticationResult = {
        spf: { status: 'none' },
        dkim: { status: 'none' },
        dmarc: { status: 'temperror' },
      };

      expect(EmailAuthVerifier.shouldRejectDmarc(result)).toBe(false);
    });
  });
});
