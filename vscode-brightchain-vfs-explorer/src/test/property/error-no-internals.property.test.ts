/**
 * Feature: brightchain-vfs-explorer, Property 7: Login error messages do not expose internals
 *
 * For any API error response (4xx or 5xx), the error message forwarded to the
 * Login Webview via HostToWebviewMessage should not contain stack traces,
 * file paths, or raw exception class names.
 *
 * We test this by generating arbitrary error messages — including ones that
 * deliberately contain stack traces, file paths, and exception class names —
 * and verifying that `sanitizeErrorMessage` strips all internal details.
 *
 * **Validates: Requirements 2.6, 3.4**
 */

import fc from 'fast-check';
import { sanitizeErrorMessage } from '../../util/error-sanitizer';

// ---------------------------------------------------------------------------
// Detection helpers — these mirror the patterns the sanitizer must remove
// ---------------------------------------------------------------------------

/** Returns true if the string contains a stack-trace line. */
function containsStackTrace(msg: string): boolean {
  return /^\s*at\s+/m.test(msg);
}

/** Returns true if the string contains a file path with a code extension. */
function containsFilePath(msg: string): boolean {
  return /[/\\]\S+\.(ts|js|tsx|jsx|mjs|cjs)\b/.test(msg);
}

/** Returns true if the string contains a raw exception class prefix. */
function containsExceptionClass(msg: string): boolean {
  return /\b(TypeError|ReferenceError|RangeError|SyntaxError|EvalError|URIError|Error|InternalError|AggregateError):/.test(
    msg,
  );
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary that generates a realistic stack trace string. */
const arbStackTrace: fc.Arbitrary<string> = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 40 }),
    fc.constantFrom('/src/auth/', '/home/user/project/', 'C:\\Users\\dev\\'),
    fc.constantFrom('auth-manager.ts', 'api-client.js', 'index.mjs'),
    fc.nat({ max: 999 }),
    fc.nat({ max: 99 }),
  )
  .map(
    ([fnName, dir, file, line, col]) =>
      `Something went wrong\n    at ${fnName} (${dir}${file}:${line}:${col})\n    at Object.<anonymous> (${dir}${file}:${line}:${col})`,
  );

/** Arbitrary that generates a message containing a file path. */
const arbFilePathMessage: fc.Arbitrary<string> = fc
  .tuple(
    fc.constantFrom('Failed at', 'Error in', 'Cannot read'),
    fc.constantFrom('/src/', '/home/user/', 'C:\\app\\', './lib/'),
    fc.constantFrom(
      'auth-manager.ts',
      'index.js',
      'util.tsx',
      'config.cjs',
      'main.mjs',
    ),
  )
  .map(([prefix, dir, file]) => `${prefix} ${dir}${file}`);

/** Arbitrary that generates a message with a raw exception class prefix. */
const arbExceptionClassMessage: fc.Arbitrary<string> = fc
  .tuple(
    fc.constantFrom(
      'TypeError',
      'ReferenceError',
      'RangeError',
      'SyntaxError',
      'EvalError',
      'URIError',
      'Error',
      'InternalError',
      'AggregateError',
    ),
    fc.string({ minLength: 1, maxLength: 80 }),
  )
  .map(([cls, detail]) => `${cls}: ${detail}`);

/** Arbitrary that generates a plain safe message (no internals). */
const arbSafeMessage: fc.Arbitrary<string> = fc.constantFrom(
  'Invalid credentials',
  'Account locked',
  'Too many attempts',
  'Server unavailable',
  'Network timeout',
  'Bad request',
  'Forbidden',
  'Not found',
  'Service error',
);

/** Arbitrary that generates any kind of error input (string, Error, object, other). */
const arbErrorInput: fc.Arbitrary<unknown> = fc.oneof(
  // Plain strings with internals
  arbStackTrace,
  arbFilePathMessage,
  arbExceptionClassMessage,
  // Error objects with internals
  arbStackTrace.map((msg) => new Error(msg)),
  arbExceptionClassMessage.map((msg) => new Error(msg)),
  // Objects with message property
  arbFilePathMessage.map((msg) => ({ message: msg, code: 500 })),
  // Safe messages
  arbSafeMessage,
  arbSafeMessage.map((msg) => new Error(msg)),
  // Edge cases
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(42),
  fc.constant(''),
);

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Property 7: Login error messages do not expose internals', () => {
  it('sanitized output never contains stack traces', () => {
    fc.assert(
      fc.property(arbStackTrace, (rawMessage) => {
        const sanitized = sanitizeErrorMessage(rawMessage);
        expect(containsStackTrace(sanitized)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('sanitized output never contains file paths with code extensions', () => {
    fc.assert(
      fc.property(arbFilePathMessage, (rawMessage) => {
        const sanitized = sanitizeErrorMessage(rawMessage);
        expect(containsFilePath(sanitized)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('sanitized output never contains raw exception class prefixes', () => {
    fc.assert(
      fc.property(arbExceptionClassMessage, (rawMessage) => {
        const sanitized = sanitizeErrorMessage(rawMessage);
        expect(containsExceptionClass(sanitized)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('sanitized output from any error input never leaks internals', () => {
    fc.assert(
      fc.property(arbErrorInput, (errorInput) => {
        const sanitized = sanitizeErrorMessage(errorInput);

        // Must be a non-empty string
        expect(typeof sanitized).toBe('string');
        expect(sanitized.length).toBeGreaterThan(0);

        // Must not contain any internal details
        expect(containsStackTrace(sanitized)).toBe(false);
        expect(containsFilePath(sanitized)).toBe(false);
        expect(containsExceptionClass(sanitized)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('safe messages pass through without being destroyed', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'Invalid credentials',
          'Account locked',
          'Too many attempts',
          'Server unavailable',
        ),
        (safeMessage) => {
          const sanitized = sanitizeErrorMessage(safeMessage);
          // The safe message should survive sanitization (possibly trimmed)
          expect(sanitized).toBe(safeMessage.trim());
        },
      ),
      { numRuns: 100 },
    );
  });
});
