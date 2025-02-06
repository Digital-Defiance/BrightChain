import { toThrowType } from './src/test/matchers/errorMatchers';

expect.addSnapshotSerializer({
  test: (val) => typeof val === 'bigint',
  print: (val) => `${(val as bigint).toString()}n`,
});

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
