// https://raw.githubusercontent.com/indutny/minimalistic-crypto-utils/master/test/utils-test.js
'use strict';

import * as utils from './minimalisticUtils';

describe('utils', () => {
  it('should convert to array', () => {
    expect(utils.toArray('1234', 'hex')).toEqual([0x12, 0x34]);
    expect(utils.toArray('1234')).toEqual([49, 50, 51, 52]);
    expect(utils.toArray('1234', 'utf8')).toEqual([49, 50, 51, 52]);
    expect(utils.toArray('\u1234234')).toEqual([18, 52, 50, 51, 52]);
    expect(utils.toArray([1, 2, 3, 4])).toEqual([1, 2, 3, 4]);
  });

  it('should zero pad byte to hex', () => {
    expect(utils.zero2('0')).toEqual('00');
    expect(utils.zero2('01')).toEqual('01');
  });

  it('should convert to hex', () => {
    expect(utils.toHex([0, 1, 2, 3])).toEqual('00010203');
  });

  it('should encode', () => {
    expect(utils.encode([0, 1, 2, 3])).toEqual([0, 1, 2, 3]);
    expect(utils.encode([0, 1, 2, 3], 'hex')).toEqual('00010203');
  });
});
