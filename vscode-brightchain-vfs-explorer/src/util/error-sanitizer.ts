/**
 * Error message sanitizer for the BrightChain VFS Explorer extension.
 *
 * Strips internal details (stack traces, file paths, raw exception class names)
 * from error messages before forwarding them to the Login Webview via
 * HostToWebviewMessage.
 */

/** Patterns that indicate internal/leaked information in error messages. */
const STACK_TRACE_LINE = /^\s*at\s+/m;
const FILE_EXTENSION_PATH = /[/\\]\S+\.(ts|js|tsx|jsx|mjs|cjs)\b/;
const RAW_EXCEPTION_CLASS =
  /\b(TypeError|ReferenceError|RangeError|SyntaxError|EvalError|URIError|Error|InternalError|AggregateError):/;

/**
 * Sanitize an error of unknown shape into a user-safe message string.
 *
 * Rules:
 * - Stack trace lines (lines starting with "at ") are removed.
 * - File paths containing "/" or "\" with code file extensions are removed.
 * - Raw exception class name prefixes (e.g. "TypeError:") are stripped,
 *   keeping only the human-readable portion after the colon.
 * - If the resulting message is empty or was not a string, a generic
 *   fallback is returned.
 */
export function sanitizeErrorMessage(error: unknown): string {
  const raw = extractRawMessage(error);
  let sanitized = raw;

  // Remove stack trace lines
  sanitized = sanitized
    .split('\n')
    .filter((line) => !STACK_TRACE_LINE.test(line))
    .join('\n');

  // Remove file paths with code extensions
  sanitized = sanitized.replace(FILE_EXTENSION_PATH, '');

  // Strip raw exception class name prefixes (keep text after the colon)
  sanitized = sanitized.replace(RAW_EXCEPTION_CLASS, '');

  // Collapse whitespace and trim
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Fallback if nothing meaningful remains
  if (!sanitized) {
    return 'Authentication failed. Please try again.';
  }

  return sanitized;
}

/**
 * Extract a raw message string from an unknown error value.
 */
function extractRawMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as Record<string, unknown>)['message'] === 'string'
  ) {
    return (error as Record<string, unknown>)['message'] as string;
  }
  return '';
}
