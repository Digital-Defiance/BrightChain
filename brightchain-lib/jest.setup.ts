import bigIntSerializer from './bigIntSerializer';
import { blockLogger } from './src/lib/logging/blockLogger';
import { SecurityAuditLogger } from './src/lib/security/securityAuditLogger';
import { initializeTestServices } from './src/lib/test/service.initializer.helper';
import { toThrowType } from './src/test/matchers/errorMatchers';

// Initialize services before running tests
initializeTestServices();

// Silence security audit logs and block logs during tests
SecurityAuditLogger.getInstance().silent = true;
blockLogger.silent = true;

expect.addSnapshotSerializer(bigIntSerializer);

/**
 * Custom equality tester for Uint8Array subclasses (e.g. GuidUint8Array).
 *
 * Jest's built-in arrayBufferEquality uses the intrinsic %TypedArray%.prototype.buffer
 * getter, which throws "incompatible receiver" when called on TypedArray subclasses that
 * cross the VM realm boundary (custom Jest environment). This tester handles those cases
 * by iterating bytes directly, avoiding the .buffer getter entirely.
 */
// addEqualityTesters exists at runtime (Jest 30) but @jest/globals types lag behind.

(
  expect as unknown as {
    addEqualityTesters(
      t: Array<(a: unknown, b: unknown) => boolean | undefined>,
    ): void;
  }
).addEqualityTesters([
  function uint8ArraySubclassEquality(
    a: unknown,
    b: unknown,
  ): boolean | undefined {
    // Handle Uint8Array subclasses (e.g. GuidUint8Array) that cross the Jest VM realm
    // boundary. Jest's built-in arrayBufferEquality uses the intrinsic
    // %TypedArray%.prototype.buffer getter which throws on cross-realm TypedArray
    // subclasses. We compare bytes directly to avoid that.
    const isUint8ArrayLike = (
      v: unknown,
    ): v is { length: number; [i: number]: number } =>
      v != null &&
      typeof v === 'object' &&
      typeof (v as { length?: unknown }).length === 'number' &&
      (v instanceof Uint8Array ||
        Object.prototype.toString.call(v) === '[object Uint8Array]');

    if (!isUint8ArrayLike(a) || !isUint8ArrayLike(b)) {
      return undefined; // defer to other testers
    }
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  },
]);

expect.extend({
  toBeBigInt(received: unknown, argument: bigint) {
    const pass = received === argument;
    if (pass) {
      return {
        message: () => `expected ${received} not to be ${argument}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be ${argument}`,
        pass: false,
      };
    }
  },
  toMatchSnapshotBigInt(received: bigint) {
    const pass = true;
    const message = () => `Snapshot failed`;

    return {
      message,
      pass,
      actual: received.toString(), //This converts to String
    };
  },
  toThrowType,
});
