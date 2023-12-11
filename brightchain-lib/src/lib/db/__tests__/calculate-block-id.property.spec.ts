/**
 * @fileoverview Property-based test for calculateBlockId.
 *
 * **Feature: db-core-to-lib, Property 5: calculateBlockId matches sha3_512**
 *
 * For any byte array, `calculateBlockId(data)` should produce the same hex
 * string as `Buffer.from(sha3_512(data)).toString('hex')`, confirming the
 * relocated helper uses `@noble/hashes/sha3` correctly.
 *
 * **Validates: Requirements 10.1**
 */

import { sha3_512 } from '@noble/hashes/sha3';
import fc from 'fast-check';
import { calculateBlockId } from '../collection';

describe('Feature: db-core-to-lib, Property 5: calculateBlockId matches sha3_512', () => {
  /**
   * **Validates: Requirements 10.1**
   *
   * For any arbitrary byte array, calculateBlockId(Buffer.from(data))
   * must equal Buffer.from(sha3_512(data)).toString('hex').
   */
  it('calculateBlockId produces the same hex string as sha3_512 for arbitrary byte arrays', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 0, maxLength: 1024 }), (data) => {
        const result = calculateBlockId(Buffer.from(data));
        const expected = Buffer.from(sha3_512(data)).toString('hex');
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});
