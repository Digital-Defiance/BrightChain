import { NewPlugin } from 'pretty-format';

const bigIntSerializer: NewPlugin = {
  test(val: unknown): boolean {
    return typeof val === 'bigint';
  },
  serialize(val: unknown): string {
    if (typeof val !== 'bigint') {
      throw new Error('Expected BigInt value');
    }
    return `${val.toString()}n`;
  },
};

export default bigIntSerializer;
