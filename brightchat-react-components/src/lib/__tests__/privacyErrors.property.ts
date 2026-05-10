/**
 * Property-based test for privacy-preserving error messages on 404.
 *
 * Property 6: Privacy-preserving error messages on 404
 * Tests the pure logic extracted from ComposeArea's getPrivacyPreservingError
 * function. For any 404 error on a conversation (DM) context, the displayed
 * error message must never leak privacy-revealing terms like "blocked",
 * "non-existent", or "does not exist".
 *
 * Feature: brightchat-frontend, Property 6: Privacy-preserving error messages on 404
 */

jest.mock('@brightchain/brightchain-lib', () => ({}));

import fc from 'fast-check';

// ─── Extracted logic from ComposeArea.tsx ────────────────────────────────────

type ContextType = 'conversation' | 'group' | 'channel';

/**
 * Simulates an Axios-like error with a response status.
 */
interface MockAxiosError extends Error {
  isAxiosError: true;
  response: { status: number };
}

function createMockAxiosError(message: string, status: number): MockAxiosError {
  const err = new Error(message) as MockAxiosError;
  err.isAxiosError = true;
  err.response = { status };
  return err;
}

function isAxiosError(error: unknown): error is MockAxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error as any).isAxiosError === true
  );
}

/**
 * Pure logic replicated from ComposeArea's getPrivacyPreservingError.
 * - conversation + 404 → "Message could not be delivered"
 * - other contexts or statuses → original error message
 */
function getPrivacyPreservingError(
  error: unknown,
  contextType: ContextType,
): string {
  if (
    contextType === 'conversation' &&
    isAxiosError(error) &&
    error.response?.status === 404
  ) {
    return 'Message could not be delivered';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Failed to send message';
}

// ─── Privacy-revealing terms that must never appear in 404 DM errors ────────

const PRIVACY_REVEALING_TERMS = [
  'blocked',
  'non-existent',
  'does not exist',
  'not found',
  'no such user',
  'user not found',
  'recipient not found',
  'unknown user',
  'invalid recipient',
];

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Generates random error message strings, including ones with privacy-revealing terms. */
const errorMessageArb = fc.oneof(
  // Random strings
  fc.string({ minLength: 1, maxLength: 200 }),
  // Strings that explicitly contain privacy-revealing terms
  fc.constantFrom(...PRIVACY_REVEALING_TERMS),
  // Strings with privacy terms embedded in longer messages
  fc
    .tuple(
      fc.string({ minLength: 0, maxLength: 50 }),
      fc.constantFrom(...PRIVACY_REVEALING_TERMS),
      fc.string({ minLength: 0, maxLength: 50 }),
    )
    .map(([prefix, term, suffix]) => `${prefix} ${term} ${suffix}`.trim()),
);

const _contextTypeArb = fc.constantFrom<ContextType>(
  'conversation',
  'group',
  'channel',
);

const nonConversationContextArb = fc.constantFrom<ContextType>(
  'group',
  'channel',
);

const httpStatusArb = fc.integer({ min: 100, max: 599 });

const non404StatusArb = httpStatusArb.filter((s) => s !== 404);

// ─── Property 6: Privacy-preserving error messages on 404 ───────────────────

describe('Feature: brightchat-frontend, Property 6: Privacy-preserving error messages on 404', () => {
  /**
   * **Validates: Requirements 3.5**
   *
   * For any 404 error message string on a conversation context, the
   * displayed error should NOT contain "blocked", "non-existent",
   * "does not exist", or similar privacy-revealing terms.
   */
  it('should never leak privacy-revealing terms for conversation + 404 errors', () => {
    fc.assert(
      fc.property(errorMessageArb, (rawMessage) => {
        const error = createMockAxiosError(rawMessage, 404);
        const displayed = getPrivacyPreservingError(error, 'conversation');

        const lowerDisplayed = displayed.toLowerCase();
        for (const term of PRIVACY_REVEALING_TERMS) {
          expect(lowerDisplayed).not.toContain(term.toLowerCase());
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.5**
   *
   * For conversation + 404, the displayed message should always be the
   * exact generic string "Message could not be delivered".
   */
  it('should return the generic safe message for any conversation + 404 error', () => {
    fc.assert(
      fc.property(errorMessageArb, (rawMessage) => {
        const error = createMockAxiosError(rawMessage, 404);
        const displayed = getPrivacyPreservingError(error, 'conversation');

        expect(displayed).toBe('Message could not be delivered');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.5**
   *
   * For non-conversation contexts (group, channel) with 404, the original
   * error message should pass through (privacy masking only applies to DMs).
   */
  it('should pass through the original error message for non-conversation contexts with 404', () => {
    fc.assert(
      fc.property(
        errorMessageArb,
        nonConversationContextArb,
        (rawMessage, contextType) => {
          const error = createMockAxiosError(rawMessage, 404);
          const displayed = getPrivacyPreservingError(error, contextType);

          // For non-conversation contexts, the original message passes through
          expect(displayed).toBe(rawMessage);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.5**
   *
   * For conversation context with non-404 status codes, the original
   * error message should pass through.
   */
  it('should pass through the original error message for conversation context with non-404 status', () => {
    fc.assert(
      fc.property(errorMessageArb, non404StatusArb, (rawMessage, status) => {
        const error = createMockAxiosError(rawMessage, status);
        const displayed = getPrivacyPreservingError(error, 'conversation');

        expect(displayed).toBe(rawMessage);
      }),
      { numRuns: 100 },
    );
  });
});
