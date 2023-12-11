/**
 * Unit tests for AntiSpamFilter.
 *
 * Validates:
 * - Spam classification based on configurable thresholds (Req 7.2)
 * - Definite-spam rejection with 550 (Req 7.3)
 * - Probable-spam tagging with headers (Req 7.4)
 * - Milter protocol response generation (Req 7.5)
 * - SpamAssassin spamc response parsing (Req 7.1)
 * - Rspamd JSON response parsing (Req 7.1)
 * - Engine selection via constructor (Req 7.1)
 *
 * @see Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import type { ISpamThresholds } from '@brightchain/brightchain-lib';
import { SpamClassification } from '@brightchain/brightchain-lib';

import type { ISpamEngineClient, ISpamScanResult } from './antiSpamFilter';
import {
  AntiSpamFilter,
  RspamdClient,
  SpamAssassinClient,
} from './antiSpamFilter';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Default thresholds: probable at 5.0, definite at 10.0 */
const DEFAULT_THRESHOLDS: ISpamThresholds = {
  probableSpamScore: 5.0,
  definiteSpamScore: 10.0,
};

/** A stub engine client that returns a fixed result. */
class StubSpamEngine implements ISpamEngineClient {
  constructor(private readonly result: ISpamScanResult) {}
  async scan(_rawMessage: Buffer): Promise<ISpamScanResult> {
    return this.result;
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('AntiSpamFilter', () => {
  // ── classify ──────────────────────────────────────────────────────

  describe('classify', () => {
    let filter: AntiSpamFilter;

    beforeEach(() => {
      filter = new AntiSpamFilter(
        'spamassassin',
        DEFAULT_THRESHOLDS,
        new StubSpamEngine({ score: 0, isSpam: false }),
      );
    });

    it('should classify score below probableSpamScore as Ham', () => {
      expect(filter.classify(0)).toBe(SpamClassification.Ham);
      expect(filter.classify(4.99)).toBe(SpamClassification.Ham);
      expect(filter.classify(-1)).toBe(SpamClassification.Ham);
    });

    it('should classify score at probableSpamScore as ProbableSpam', () => {
      expect(filter.classify(5.0)).toBe(SpamClassification.ProbableSpam);
    });

    it('should classify score between thresholds as ProbableSpam', () => {
      expect(filter.classify(7.5)).toBe(SpamClassification.ProbableSpam);
      expect(filter.classify(9.99)).toBe(SpamClassification.ProbableSpam);
    });

    it('should classify score at definiteSpamScore as DefiniteSpam', () => {
      expect(filter.classify(10.0)).toBe(SpamClassification.DefiniteSpam);
    });

    it('should classify score above definiteSpamScore as DefiniteSpam', () => {
      expect(filter.classify(15.0)).toBe(SpamClassification.DefiniteSpam);
      expect(filter.classify(100)).toBe(SpamClassification.DefiniteSpam);
    });
  });

  // ── scan ───────────────────────────────────────────────────────────

  describe('scan', () => {
    it('should return Ham classification for low score', async () => {
      const engine = new StubSpamEngine({
        score: 1.2,
        isSpam: false,
        details: 'BAYES_00',
      });
      const filter = new AntiSpamFilter(
        'spamassassin',
        DEFAULT_THRESHOLDS,
        engine,
      );

      const result = await filter.scan(Buffer.from('test message'));

      expect(result.score).toBe(1.2);
      expect(result.classification).toBe(SpamClassification.Ham);
      expect(result.details).toBe('BAYES_00');
    });

    it('should return ProbableSpam classification for mid score', async () => {
      const engine = new StubSpamEngine({ score: 7.5, isSpam: true });
      const filter = new AntiSpamFilter('rspamd', DEFAULT_THRESHOLDS, engine);

      const result = await filter.scan(Buffer.from('test message'));

      expect(result.score).toBe(7.5);
      expect(result.classification).toBe(SpamClassification.ProbableSpam);
    });

    it('should return DefiniteSpam classification for high score', async () => {
      const engine = new StubSpamEngine({ score: 15.3, isSpam: true });
      const filter = new AntiSpamFilter(
        'spamassassin',
        DEFAULT_THRESHOLDS,
        engine,
      );

      const result = await filter.scan(Buffer.from('test message'));

      expect(result.score).toBe(15.3);
      expect(result.classification).toBe(SpamClassification.DefiniteSpam);
    });
  });

  // ── milterCheck ───────────────────────────────────────────────────

  describe('milterCheck', () => {
    it('should return reject action for definite spam (Req 7.3)', async () => {
      const engine = new StubSpamEngine({ score: 12.0, isSpam: true });
      const filter = new AntiSpamFilter(
        'spamassassin',
        DEFAULT_THRESHOLDS,
        engine,
      );

      const response = await filter.milterCheck(Buffer.from('spam message'));

      expect(response.action).toBe('reject');
      expect(response.replyCode).toBe(550);
      expect(response.replyText).toContain('spam');
      expect(response.scanResult.classification).toBe(
        SpamClassification.DefiniteSpam,
      );
    });

    it('should return continue action with headers for probable spam (Req 7.4)', async () => {
      const engine = new StubSpamEngine({
        score: 6.5,
        isSpam: true,
        details: 'URIBL_BLACK',
      });
      const filter = new AntiSpamFilter(
        'spamassassin',
        DEFAULT_THRESHOLDS,
        engine,
      );

      const response = await filter.milterCheck(Buffer.from('suspect message'));

      expect(response.action).toBe('continue');
      expect(response.replyCode).toBeUndefined();
      expect(response.addHeaders).toBeDefined();
      expect(response.addHeaders!['X-Spam-Flag']).toBe('YES');
      expect(response.addHeaders!['X-Spam-Score']).toBe('6.50');
      expect(response.addHeaders!['X-Spam-Status']).toContain('Yes');
      expect(response.addHeaders!['X-Spam-Status']).toContain('URIBL_BLACK');
      expect(response.scanResult.classification).toBe(
        SpamClassification.ProbableSpam,
      );
    });

    it('should return accept action for ham', async () => {
      const engine = new StubSpamEngine({ score: 0.5, isSpam: false });
      const filter = new AntiSpamFilter(
        'spamassassin',
        DEFAULT_THRESHOLDS,
        engine,
      );

      const response = await filter.milterCheck(Buffer.from('good message'));

      expect(response.action).toBe('accept');
      expect(response.addHeaders).toBeDefined();
      expect(response.addHeaders!['X-Spam-Flag']).toBe('NO');
      expect(response.addHeaders!['X-Spam-Score']).toBe('0.50');
      expect(response.scanResult.classification).toBe(SpamClassification.Ham);
    });
  });

  // ── SpamAssassinClient.parseResponse ──────────────────────────────

  describe('SpamAssassinClient.parseResponse', () => {
    it('should parse a Spam: True response', () => {
      const response =
        'SPAMD/1.1 0 EX_OK\r\nSpam: True ; 15.3 / 5.0\r\n\r\nURIBL_BLACK,BAYES_99';
      const result = SpamAssassinClient.parseResponse(response);

      expect(result.score).toBe(15.3);
      expect(result.isSpam).toBe(true);
      expect(result.details).toBe('URIBL_BLACK,BAYES_99');
    });

    it('should parse a Spam: False response', () => {
      const response =
        'SPAMD/1.1 0 EX_OK\r\nSpam: False ; 1.2 / 5.0\r\n\r\nBAYES_00';
      const result = SpamAssassinClient.parseResponse(response);

      expect(result.score).toBe(1.2);
      expect(result.isSpam).toBe(false);
      expect(result.details).toBe('BAYES_00');
    });

    it('should handle Yes/No variants', () => {
      const response = 'SPAMD/1.1 0 EX_OK\r\nSpam: Yes ; 8.0 / 5.0\r\n\r\n';
      const result = SpamAssassinClient.parseResponse(response);

      expect(result.score).toBe(8.0);
      expect(result.isSpam).toBe(true);
    });

    it('should return defaults for unparseable response', () => {
      const result = SpamAssassinClient.parseResponse('garbage data');

      expect(result.score).toBe(0);
      expect(result.isSpam).toBe(false);
      expect(result.details).toBe('Unable to parse spamd response');
    });
  });

  // ── RspamdClient.parseResponse ────────────────────────────────────

  describe('RspamdClient.parseResponse', () => {
    it('should parse a reject action response', () => {
      const body = JSON.stringify({
        score: 15.3,
        required_score: 15.0,
        action: 'reject',
        symbols: { URIBL_BLACK: {}, BAYES_SPAM: {} },
      });
      const result = RspamdClient.parseResponse(body);

      expect(result.score).toBe(15.3);
      expect(result.isSpam).toBe(true);
      expect(result.details).toContain('URIBL_BLACK');
      expect(result.details).toContain('BAYES_SPAM');
    });

    it('should parse a no action response as not spam', () => {
      const body = JSON.stringify({
        score: 0.5,
        required_score: 15.0,
        action: 'no action',
        symbols: {},
      });
      const result = RspamdClient.parseResponse(body);

      expect(result.score).toBe(0.5);
      expect(result.isSpam).toBe(false);
    });

    it('should parse add header action as spam', () => {
      const body = JSON.stringify({
        score: 7.0,
        action: 'add header',
        symbols: { FORGED_SENDER: {} },
      });
      const result = RspamdClient.parseResponse(body);

      expect(result.score).toBe(7.0);
      expect(result.isSpam).toBe(true);
      expect(result.details).toBe('FORGED_SENDER');
    });

    it('should return defaults for invalid JSON', () => {
      const result = RspamdClient.parseResponse('not json');

      expect(result.score).toBe(0);
      expect(result.isSpam).toBe(false);
      expect(result.details).toBe('Unable to parse Rspamd JSON response');
    });

    it('should handle missing symbols gracefully', () => {
      const body = JSON.stringify({
        score: 3.0,
        action: 'no action',
      });
      const result = RspamdClient.parseResponse(body);

      expect(result.score).toBe(3.0);
      expect(result.isSpam).toBe(false);
      expect(result.details).toBeUndefined();
    });
  });

  // ── Engine selection ──────────────────────────────────────────────

  describe('engine selection', () => {
    it('should use injected engine client when provided', async () => {
      let scanCalled = false;
      const mockEngine: ISpamEngineClient = {
        async scan(_msg: Buffer) {
          scanCalled = true;
          return { score: 2.0, isSpam: false };
        },
      };

      const filter = new AntiSpamFilter(
        'spamassassin',
        DEFAULT_THRESHOLDS,
        mockEngine,
      );
      await filter.scan(Buffer.from('test'));

      expect(scanCalled).toBe(true);
    });

    it('should default to SpamAssassinClient when engine is spamassassin and no client provided', () => {
      // We can't easily test the internal client type, but we can verify
      // the constructor doesn't throw
      const filter = new AntiSpamFilter('spamassassin', DEFAULT_THRESHOLDS);
      expect(filter).toBeDefined();
    });

    it('should default to RspamdClient when engine is rspamd and no client provided', () => {
      const filter = new AntiSpamFilter('rspamd', DEFAULT_THRESHOLDS);
      expect(filter).toBeDefined();
    });
  });

  // ── Boundary conditions for classification thresholds ────────────

  describe('classification boundary conditions', () => {
    /**
     * Validates: Requirements 7.2, 7.3, 7.4
     *
     * Tests the exact boundary values where classification transitions
     * between Ham ↔ ProbableSpam ↔ DefiniteSpam.
     */

    describe('probableSpamScore boundary (default 5.0)', () => {
      let filter: AntiSpamFilter;

      beforeEach(() => {
        filter = new AntiSpamFilter(
          'spamassassin',
          DEFAULT_THRESHOLDS,
          new StubSpamEngine({ score: 0, isSpam: false }),
        );
      });

      it('should classify 4.999999 as Ham (just below threshold)', () => {
        expect(filter.classify(4.999999)).toBe(SpamClassification.Ham);
      });

      it('should classify 5.0 as ProbableSpam (exactly at threshold)', () => {
        expect(filter.classify(5.0)).toBe(SpamClassification.ProbableSpam);
      });

      it('should classify 5.000001 as ProbableSpam (just above threshold)', () => {
        expect(filter.classify(5.000001)).toBe(SpamClassification.ProbableSpam);
      });
    });

    describe('definiteSpamScore boundary (default 10.0)', () => {
      let filter: AntiSpamFilter;

      beforeEach(() => {
        filter = new AntiSpamFilter(
          'spamassassin',
          DEFAULT_THRESHOLDS,
          new StubSpamEngine({ score: 0, isSpam: false }),
        );
      });

      it('should classify 9.999999 as ProbableSpam (just below threshold)', () => {
        expect(filter.classify(9.999999)).toBe(SpamClassification.ProbableSpam);
      });

      it('should classify 10.0 as DefiniteSpam (exactly at threshold)', () => {
        expect(filter.classify(10.0)).toBe(SpamClassification.DefiniteSpam);
      });

      it('should classify 10.000001 as DefiniteSpam (just above threshold)', () => {
        expect(filter.classify(10.000001)).toBe(
          SpamClassification.DefiniteSpam,
        );
      });
    });

    describe('edge case scores', () => {
      let filter: AntiSpamFilter;

      beforeEach(() => {
        filter = new AntiSpamFilter(
          'spamassassin',
          DEFAULT_THRESHOLDS,
          new StubSpamEngine({ score: 0, isSpam: false }),
        );
      });

      it('should classify score of 0 as Ham', () => {
        expect(filter.classify(0)).toBe(SpamClassification.Ham);
      });

      it('should classify negative scores as Ham', () => {
        expect(filter.classify(-1)).toBe(SpamClassification.Ham);
        expect(filter.classify(-100)).toBe(SpamClassification.Ham);
        expect(filter.classify(-0.001)).toBe(SpamClassification.Ham);
      });

      it('should classify very large scores as DefiniteSpam', () => {
        expect(filter.classify(1000)).toBe(SpamClassification.DefiniteSpam);
        expect(filter.classify(Number.MAX_SAFE_INTEGER)).toBe(
          SpamClassification.DefiniteSpam,
        );
      });
    });

    describe('equal thresholds (probableSpamScore === definiteSpamScore)', () => {
      let filter: AntiSpamFilter;

      beforeEach(() => {
        filter = new AntiSpamFilter(
          'spamassassin',
          { probableSpamScore: 5.0, definiteSpamScore: 5.0 },
          new StubSpamEngine({ score: 0, isSpam: false }),
        );
      });

      it('should classify below threshold as Ham', () => {
        expect(filter.classify(4.999999)).toBe(SpamClassification.Ham);
      });

      it('should classify at threshold as DefiniteSpam (definite check runs first)', () => {
        // When both thresholds are equal, score >= definiteSpamScore is checked
        // first, so the score lands in DefiniteSpam, skipping ProbableSpam entirely.
        expect(filter.classify(5.0)).toBe(SpamClassification.DefiniteSpam);
      });

      it('should classify above threshold as DefiniteSpam', () => {
        expect(filter.classify(5.001)).toBe(SpamClassification.DefiniteSpam);
      });
    });

    describe('very close thresholds', () => {
      let filter: AntiSpamFilter;

      beforeEach(() => {
        filter = new AntiSpamFilter(
          'spamassassin',
          { probableSpamScore: 5.0, definiteSpamScore: 5.001 },
          new StubSpamEngine({ score: 0, isSpam: false }),
        );
      });

      it('should classify 4.999 as Ham', () => {
        expect(filter.classify(4.999)).toBe(SpamClassification.Ham);
      });

      it('should classify 5.0 as ProbableSpam (at probable threshold)', () => {
        expect(filter.classify(5.0)).toBe(SpamClassification.ProbableSpam);
      });

      it('should classify 5.0005 as ProbableSpam (between close thresholds)', () => {
        expect(filter.classify(5.0005)).toBe(SpamClassification.ProbableSpam);
      });

      it('should classify 5.001 as DefiniteSpam (at definite threshold)', () => {
        expect(filter.classify(5.001)).toBe(SpamClassification.DefiniteSpam);
      });

      it('should classify 5.002 as DefiniteSpam (above definite threshold)', () => {
        expect(filter.classify(5.002)).toBe(SpamClassification.DefiniteSpam);
      });
    });

    describe('zero thresholds', () => {
      let filter: AntiSpamFilter;

      beforeEach(() => {
        filter = new AntiSpamFilter(
          'spamassassin',
          { probableSpamScore: 0, definiteSpamScore: 0 },
          new StubSpamEngine({ score: 0, isSpam: false }),
        );
      });

      it('should classify negative scores as Ham', () => {
        expect(filter.classify(-0.001)).toBe(SpamClassification.Ham);
        expect(filter.classify(-10)).toBe(SpamClassification.Ham);
      });

      it('should classify score of 0 as DefiniteSpam (both thresholds at 0)', () => {
        expect(filter.classify(0)).toBe(SpamClassification.DefiniteSpam);
      });

      it('should classify any positive score as DefiniteSpam', () => {
        expect(filter.classify(0.001)).toBe(SpamClassification.DefiniteSpam);
        expect(filter.classify(1)).toBe(SpamClassification.DefiniteSpam);
      });
    });

    describe('floating point precision edge cases', () => {
      let filter: AntiSpamFilter;

      beforeEach(() => {
        filter = new AntiSpamFilter(
          'spamassassin',
          DEFAULT_THRESHOLDS,
          new StubSpamEngine({ score: 0, isSpam: false }),
        );
      });

      it('should handle 0.1 + 0.2 style floating point sums near threshold', () => {
        // 0.1 + 0.2 === 0.30000000000000004 in IEEE 754
        // Verify the filter handles real floating point arithmetic
        const almostFive = 4.9 + 0.1; // should be exactly 5.0
        expect(filter.classify(almostFive)).toBe(
          SpamClassification.ProbableSpam,
        );
      });

      it('should handle Number.EPSILON near thresholds', () => {
        // Number.EPSILON (~2.2e-16) is too small to change 5.0 or 10.0
        // in IEEE 754 double precision, so 5.0 - EPSILON === 5.0.
        // This verifies the filter doesn't break on such values.
        expect(filter.classify(5.0 - Number.EPSILON)).toBe(
          SpamClassification.ProbableSpam,
        );
        expect(filter.classify(5.0 + Number.EPSILON)).toBe(
          SpamClassification.ProbableSpam,
        );
        expect(filter.classify(10.0 - Number.EPSILON)).toBe(
          SpamClassification.DefiniteSpam,
        );
        expect(filter.classify(10.0 + Number.EPSILON)).toBe(
          SpamClassification.DefiniteSpam,
        );
      });

      it('should distinguish scores that differ by the smallest representable step', () => {
        // Use a value just below 5.0 that IEEE 754 can actually represent
        const justBelowFive = 5.0 - 5.0 * Number.EPSILON;
        // This is the largest double < 5.0
        expect(justBelowFive).toBeLessThan(5.0);
        expect(filter.classify(justBelowFive)).toBe(SpamClassification.Ham);

        const justBelowTen = 10.0 - 10.0 * Number.EPSILON;
        expect(justBelowTen).toBeLessThan(10.0);
        expect(filter.classify(justBelowTen)).toBe(
          SpamClassification.ProbableSpam,
        );
      });
    });
  });

  // ── Custom thresholds ─────────────────────────────────────────────

  describe('custom thresholds', () => {
    it('should respect custom threshold values', () => {
      const customThresholds: ISpamThresholds = {
        probableSpamScore: 3.0,
        definiteSpamScore: 7.0,
      };
      const filter = new AntiSpamFilter(
        'spamassassin',
        customThresholds,
        new StubSpamEngine({ score: 0, isSpam: false }),
      );

      expect(filter.classify(2.9)).toBe(SpamClassification.Ham);
      expect(filter.classify(3.0)).toBe(SpamClassification.ProbableSpam);
      expect(filter.classify(5.0)).toBe(SpamClassification.ProbableSpam);
      expect(filter.classify(7.0)).toBe(SpamClassification.DefiniteSpam);
      expect(filter.classify(9.0)).toBe(SpamClassification.DefiniteSpam);
    });
  });
});
