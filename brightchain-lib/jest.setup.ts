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
