/**
 * Type alias for a function that produces a UUID v4 string.
 */
export type UuidGenerator = () => string;

/**
 * Returns a default UuidGenerator that uses globalThis.crypto.randomUUID()
 * when available, falling back to a crypto.getRandomValues-based UUID v4.
 *
 * Throws a descriptive error if neither globalThis.crypto.randomUUID nor
 * globalThis.crypto.getRandomValues is available.
 */
export function createDefaultUuidGenerator(): UuidGenerator {
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return () => globalThis.crypto.randomUUID();
  }

  // Fallback: use crypto.getRandomValues (available in all modern browsers and Node 15+)
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    return () => {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
      const hex = Array.from(bytes, (b) =>
        b.toString(16).padStart(2, '0'),
      ).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    };
  }

  throw new Error(
    'Unable to create a UUID generator: neither globalThis.crypto.randomUUID ' +
      'nor globalThis.crypto.getRandomValues is available. Provide a custom ' +
      'UuidGenerator function or run in an environment that supports the Web Crypto API.',
  );
}
