/**
 * Property-based tests for FakeEmailService.
 *
 * Feature: comprehensive-e2e-tests
 */
import fc from 'fast-check';
import express from 'express';
import request from 'supertest';
import {
  FakeEmailService,
  CapturedEmail,
} from '../fakeEmailService';
import { createTestEmailRouter } from '../../routers/testEmailRouter';

// --- Arbitraries ---

/** Generates a plausible email address. */
const emailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{1,20}$/),
    fc.stringMatching(/^[a-z]{2,10}$/),
    fc.constantFrom('com', 'org', 'net', 'io'),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/** Generates a non-empty subject line. */
const subjectArb = fc.string({ minLength: 1, maxLength: 200 });

/** Generates arbitrary plain text body. */
const textBodyArb = fc.string({ minLength: 0, maxLength: 500 });

/** Generates arbitrary HTML body. */
const htmlBodyArb = fc.string({ minLength: 0, maxLength: 500 });

describe('FakeEmailService – Property Tests', () => {
  let service: FakeEmailService;

  beforeEach(() => {
    FakeEmailService.resetInstance();
    service = FakeEmailService.getInstance();
  });

  afterEach(() => {
    FakeEmailService.resetInstance();
  });

  describe('Property 7: Email store-then-retrieve round-trip', () => {
    // Feature: comprehensive-e2e-tests, Property 7: Email store-then-retrieve round-trip

    /**
     * For any recipient address, subject, text, and HTML body, calling
     * sendEmail on the FakeEmailService and then calling getEmails with
     * that recipient address should return an array containing the sent
     * email, and getLatestEmail should return the most recently sent
     * email for that address.
     *
     * **Validates: Requirements 5.2, 5.3, 5.4**
     */
    it('sendEmail then getEmails returns the sent email', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          subjectArb,
          textBodyArb,
          htmlBodyArb,
          async (to, subject, text, html) => {
            // Reset between iterations to isolate each run
            service.clear();

            await service.sendEmail(to, subject, text, html);

            const emails = service.getEmails(to);
            expect(emails).toHaveLength(1);
            expect(emails[0].to).toBe(to);
            expect(emails[0].subject).toBe(subject);
            expect(emails[0].text).toBe(text);
            expect(emails[0].html).toBe(html);
            expect(emails[0].timestamp).toBeInstanceOf(Date);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('getLatestEmail returns the most recently sent email', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          fc.array(
            fc.tuple(subjectArb, textBodyArb, htmlBodyArb),
            { minLength: 1, maxLength: 10 },
          ),
          async (to, emailData) => {
            service.clear();

            for (const [subject, text, html] of emailData) {
              await service.sendEmail(to, subject, text, html);
            }

            const latest = service.getLatestEmail(to);
            const [lastSubject, lastText, lastHtml] =
              emailData[emailData.length - 1];

            expect(latest).toBeDefined();
            expect(latest!.to).toBe(to);
            expect(latest!.subject).toBe(lastSubject);
            expect(latest!.text).toBe(lastText);
            expect(latest!.html).toBe(lastHtml);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('getEmails returns empty array for unknown recipient', async () => {
      await fc.assert(
        fc.asyncProperty(emailArb, async (to) => {
          service.clear();

          const emails = service.getEmails(to);
          expect(emails).toEqual([]);
        }),
        { numRuns: 100 },
      );
    });

    it('getLatestEmail returns undefined for unknown recipient', async () => {
      await fc.assert(
        fc.asyncProperty(emailArb, async (to) => {
          service.clear();

          const latest = service.getLatestEmail(to);
          expect(latest).toBeUndefined();
        }),
        { numRuns: 100 },
      );
    });

    it('multiple recipients are stored independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          emailArb,
          subjectArb,
          subjectArb,
          textBodyArb,
          htmlBodyArb,
          async (to1, to2, subject1, subject2, text, html) => {
            fc.pre(to1 !== to2);
            service.clear();

            await service.sendEmail(to1, subject1, text, html);
            await service.sendEmail(to2, subject2, text, html);

            const emails1 = service.getEmails(to1);
            const emails2 = service.getEmails(to2);

            expect(emails1).toHaveLength(1);
            expect(emails1[0].subject).toBe(subject1);

            expect(emails2).toHaveLength(1);
            expect(emails2[0].subject).toBe(subject2);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 8: Email clear empties store', () => {
    // Feature: comprehensive-e2e-tests, Property 8: Email clear empties store

    /**
     * For any set of emails previously stored in the FakeEmailService,
     * calling clear() should cause getEmails for every previously used
     * recipient address to return an empty array.
     *
     * **Validates: Requirements 5.5**
     */
    it('clear() causes getEmails to return empty arrays for all recipients', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.tuple(emailArb, subjectArb, textBodyArb, htmlBodyArb),
            { minLength: 1, maxLength: 20 },
          ),
          async (emailData) => {
            service.clear();

            // Collect unique recipients
            const recipients = new Set<string>();

            // Send N emails to M recipients
            for (const [to, subject, text, html] of emailData) {
              await service.sendEmail(to, subject, text, html);
              recipients.add(to);
            }

            // Verify emails were stored
            for (const addr of recipients) {
              expect(service.getEmails(addr).length).toBeGreaterThan(0);
            }

            // Clear the store
            service.clear();

            // Verify all recipients now return empty arrays
            for (const addr of recipients) {
              expect(service.getEmails(addr)).toEqual([]);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 9: Email code extraction round-trip', () => {
    // Feature: comprehensive-e2e-tests, Property 9: Email code extraction round-trip

    /**
     * For any 6-digit verification code embedded in an email body using
     * one of the application's standard formats, calling extractCode on
     * that email body should return the original code string.
     *
     * **Validates: Requirements 5.6**
     */

    /** Generates a 6-digit numeric code string (e.g. "012345", "999999"). */
    const sixDigitCodeArb = fc
      .integer({ min: 0, max: 999999 })
      .map((n) => n.toString().padStart(6, '0'));

    /** Wraps a code in one of the supported email body formats. */
    const codeInBodyArb = (code: string) =>
      fc.constantFrom(
        // Pattern 1a: code=XXXXX in a query string
        `Please verify your account: https://example.com/verify?code=${code}`,
        // Pattern 1b: code: XXXXX in plain text
        `Your code: ${code}. Please enter it to continue.`,
        // Pattern 2a: "verification code: XXXXX"
        `Your verification code: ${code}`,
        // Pattern 2b: "your code is XXXXX"
        `your code is ${code}`,
        // Pattern 3: standalone 6-digit code between HTML tags
        `<p>Use the following code to verify:</p><p>${code}</p>`,
        // Pattern 3: standalone 6-digit code on its own line
        `Enter this code:\n${code}\nIt expires in 10 minutes.`,
      );

    it('extractCode returns the original 6-digit code from any supported format', () => {
      fc.assert(
        fc.property(
          sixDigitCodeArb.chain((code) =>
            codeInBodyArb(code).map((body) => ({ code, body })),
          ),
          ({ code, body }) => {
            const extracted = service.extractCode(body);
            expect(extracted).toBe(code);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 10: Test email API endpoint returns captured emails', () => {
    // Feature: comprehensive-e2e-tests, Property 10: Test email API endpoint returns captured emails

    /**
     * For any email sent via the FakeEmailService during a test run,
     * a GET /api/test/emails/:address request with the recipient address
     * should return a response containing that email's subject, text,
     * and HTML body.
     *
     * **Validates: Requirements 5.8**
     */

    function createApp(): express.Express {
      const a = express();
      a.use(createTestEmailRouter());
      return a;
    }

    it('GET /api/test/emails/:address returns emails stored via sendEmail', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          subjectArb,
          textBodyArb,
          htmlBodyArb,
          async (to, subject, text, html) => {
            service.clear();

            await service.sendEmail(to, subject, text, html);

            const app = createApp();
            const res = await request(app)
              .get(`/api/test/emails/${encodeURIComponent(to)}`)
              .expect(200);

            const emails = res.body;
            expect(Array.isArray(emails)).toBe(true);
            expect(emails).toHaveLength(1);
            expect(emails[0].to).toBe(to);
            expect(emails[0].subject).toBe(subject);
            expect(emails[0].text).toBe(text);
            expect(emails[0].html).toBe(html);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('GET /api/test/emails/:address returns multiple emails for same recipient', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArb,
          fc.array(
            fc.tuple(subjectArb, textBodyArb, htmlBodyArb),
            { minLength: 1, maxLength: 5 },
          ),
          async (to, emailData) => {
            service.clear();

            for (const [subject, text, html] of emailData) {
              await service.sendEmail(to, subject, text, html);
            }

            const app = createApp();
            const res = await request(app)
              .get(`/api/test/emails/${encodeURIComponent(to)}`)
              .expect(200);

            const emails = res.body;
            expect(emails).toHaveLength(emailData.length);

            for (let i = 0; i < emailData.length; i++) {
              expect(emails[i].subject).toBe(emailData[i][0]);
              expect(emails[i].text).toBe(emailData[i][1]);
              expect(emails[i].html).toBe(emailData[i][2]);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('GET /api/test/emails/:address returns empty array for unknown address', async () => {
      await fc.assert(
        fc.asyncProperty(emailArb, async (to) => {
          service.clear();

          const app = createApp();
          const res = await request(app)
            .get(`/api/test/emails/${encodeURIComponent(to)}`)
            .expect(200);

          expect(res.body).toEqual([]);
        }),
        { numRuns: 100 },
      );
    });
  });
});
