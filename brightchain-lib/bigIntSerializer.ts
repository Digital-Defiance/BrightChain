import { NewPlugin } from 'pretty-format';

const bigIntSerializer: NewPlugin = {
  test: (val) => typeof val === 'bigint',
  serialize: (val) => `${val.toString()}n`,
};

export default bigIntSerializer;