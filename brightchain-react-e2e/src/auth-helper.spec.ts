/**
 * Property-based tests for the auth helper credential generator.
 *
 * Feature: comprehensive-e2e-tests
 *
 * These are unit-style property tests that do NOT require a browser context.
 */
import { expect, test } from '@playwright/test';
import axios, { AxiosError } from 'axios';
import fc from 'fast-check';
import { generateCredentials, registerViaApi } from './fixtures';

test.describe('Auth Helper – Property Tests', () => {
  // Feature: comprehensive-e2e-tests, Property 1: Auth helper credential uniqueness
  test('Property 1: all generated usernames and emails are distinct across N invocations', () => {
    /**
     * For any N invocations of the credential generator, all generated
     * usernames and emails should be distinct.
     *
     * **Validates: Requirements 1.4**
     */
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 50 }), (n: number) => {
        const usernames = new Set<string>();
        const emails = new Set<string>();

        for (let i = 0; i < n; i++) {
          const creds = generateCredentials();
          usernames.add(creds.username);
          emails.add(creds.email);
        }

        // Every username and email must be unique
        expect(usernames.size).toBe(n);
        expect(emails.size).toBe(n);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: comprehensive-e2e-tests, Property 2: Auth helper error propagation
  test('Property 2: thrown error contains both HTTP status code and response body for non-2xx responses', async () => {
    /**
     * For any failed HTTP response (non-2xx status) from the registration API,
     * the auth helper should throw an error whose message contains both the
     * HTTP status code and the response body text.
     *
     * **Validates: Requirements 1.5**
     */
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 400, max: 499 }),
        fc
          .string({ minLength: 1, maxLength: 200 })
          // eslint-disable-next-line no-control-regex
          .filter((s) => s.length > 0 && !/[\x00-\x1f]/.test(s)),
        async (statusCode: number, bodyText: string) => {
          const originalPost = axios.post;
          try {
            axios.post = (() => {
              const err = new AxiosError(
                `Request failed with status code ${statusCode}`,
                AxiosError.ERR_BAD_REQUEST,
                undefined,
                undefined,
                {
                  status: statusCode,
                  data: bodyText,
                  statusText: 'Error',
                  headers: {},
                  config: {} as never,
                } as never,
              );
              return Promise.reject(err);
            }) as typeof axios.post;

            try {
              await registerViaApi('http://localhost:9999');
              // Should never reach here — registerViaApi must throw
              expect(true).toBe(false);
            } catch (e: unknown) {
              const msg = (e as Error).message;
              expect(msg).toContain(String(statusCode));
              expect(msg).toContain(bodyText);
            }
          } finally {
            axios.post = originalPost;
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
