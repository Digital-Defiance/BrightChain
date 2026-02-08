/**
 * @fileoverview Property-based tests for XOR Utility Functions
 *
 * **Feature: cbl-whitening-storage**
 *
 * This test suite verifies:
 * - Property 1: Whitener Size Matches CBL Size
 * - Property 2: XOR Round-Trip Reconstruction
 *
 * **Validates: Requirements 1.1, 1.2, 3.4**
 */

import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import { BrightChainStrings } from '../enumerations';
import { TranslatableBrightChainError } from '../errors/translatableBrightChainError';
import { XorService } from '../services/xor';
import { padToBlockSize, unpadCblData, xorArrays } from './xorUtils';

/**
 * Arbitrary for generating hex strings of specified length
 */
const arbHexString = (minLength: number, maxLength: number) =>
  fc
    .array(fc.integer({ min: 0, max: 15 }), {
      minLength,
      maxLength,
    })
    .map((arr) => arr.map((n) => n.toString(16)).join(''));

/**
 * Arbitrary for generating valid CBL JSON data
 */
const arbCblData = fc
  .record({
    version: fc.constant(1),
    fileName: fc.string({ minLength: 1, maxLength: 100 }),
    originalSize: fc.integer({ min: 1, max: 10_000_000 }),
    blockCount: fc.integer({ min: 1, max: 1000 }),
    blocks: fc.array(
      fc.record({
        id: arbHexString(128, 128),
        size: fc.integer({ min: 1, max: 4096 }),
      }),
      { minLength: 1, maxLength: 100 },
    ),
  })
  .map((cbl) => new TextEncoder().encode(JSON.stringify(cbl)));

/**
 * Arbitrary for generating block sizes
 */
const arbBlockSize = fc.constantFrom(256, 1024, 4096, 131072);

/**
 * Arbitrary for generating random byte arrays
 */
const arbByteArray = (minLength: number, maxLength: number) =>
  fc
    .integer({ min: minLength, max: maxLength })
    .chain((length) =>
      fc.array(fc.integer({ min: 0, max: 255 }), {
        minLength: length,
        maxLength: length,
      }),
    )
    .map((arr) => new Uint8Array(arr));

describe('XOR Utility Functions - Property Tests', () => {
  describe('xorArrays', () => {
    /**
     * **Feature: cbl-whitening-storage, Property 2: XOR Round-Trip Reconstruction**
     *
     * *For any* two equal-length arrays A and B, XORing them twice should return the original:
     * (A ⊕ B) ⊕ B = A
     *
     * **Validates: Requirements 1.2, 3.4**
     */
    it('should satisfy XOR round-trip property: (A ⊕ B) ⊕ B = A', () => {
      fc.assert(
        fc.property(arbByteArray(1, 10000), arbByteArray(1, 10000), (a, b) => {
          // Make arrays equal length
          const length = Math.min(a.length, b.length);
          const aSlice = a.subarray(0, length);
          const bSlice = b.subarray(0, length);

          // XOR twice should return original
          const xor1 = xorArrays(aSlice, bSlice);
          const xor2 = xorArrays(xor1, bSlice);

          expect(xor2).toEqual(aSlice);
          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: cbl-whitening-storage**
     *
     * *For any* two equal-length arrays, XOR should be commutative: A ⊕ B = B ⊕ A
     *
     * **Validates: Requirements 1.2**
     */
    it('should be commutative: A ⊕ B = B ⊕ A', () => {
      fc.assert(
        fc.property(arbByteArray(1, 10000), arbByteArray(1, 10000), (a, b) => {
          // Make arrays equal length
          const length = Math.min(a.length, b.length);
          const aSlice = a.subarray(0, length);
          const bSlice = b.subarray(0, length);

          const xor1 = xorArrays(aSlice, bSlice);
          const xor2 = xorArrays(bSlice, aSlice);

          expect(xor1).toEqual(xor2);
          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: cbl-whitening-storage**
     *
     * *For any* array A, XORing with itself should produce all zeros: A ⊕ A = 0
     */
    it('should produce all zeros when XORing array with itself', () => {
      fc.assert(
        fc.property(arbByteArray(1, 10000), (a) => {
          const result = xorArrays(a, a);
          const allZeros = result.every((byte) => byte === 0);

          expect(allZeros).toBe(true);
          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: cbl-whitening-storage**
     *
     * *For any* two arrays of different lengths, xorArrays should throw an error
     */
    it('should throw error for arrays of different lengths', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (len1, len2) => {
            fc.pre(len1 !== len2); // Only test when lengths differ

            const a = new Uint8Array(len1);
            const b = new Uint8Array(len2);

            expect(() => xorArrays(a, b)).toThrow(TranslatableBrightChainError);
            try {
              xorArrays(a, b);
            } catch (error) {
              expect(error).toBeInstanceOf(TranslatableBrightChainError);
              expect((error as TranslatableBrightChainError).stringKey).toBe(
                BrightChainStrings.Error_Xor_LengthMismatchTemplate,
              );
            }
            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('XorService.xorMultiple', () => {
    /**
     * **Feature: cbl-whitening-storage**
     *
     * *For any* set of equal-length arrays, xorMultiple should be equivalent to chained xor calls
     */
    it('should produce same result as chained xor calls', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 2, max: 5 }),
          (length, count) => {
            // Generate arrays of equal length
            const arrays: Uint8Array[] = [];
            for (let i = 0; i < count; i++) {
              const arr = new Uint8Array(length);
              for (let j = 0; j < length; j++) {
                arr[j] = Math.floor(Math.random() * 256);
              }
              arrays.push(arr);
            }

            // XOR using xorMultiple
            const multiResult = XorService.xorMultiple(arrays);

            // XOR using chained xor calls
            let chainedResult = arrays[0];
            for (let i = 1; i < arrays.length; i++) {
              chainedResult = XorService.xor(chainedResult, arrays[i]);
            }

            expect(multiResult).toEqual(chainedResult);
            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: cbl-whitening-storage**
     *
     * *For any* single array, xorMultiple should return a copy of that array
     */
    it('should return copy of single array', () => {
      fc.assert(
        fc.property(arbByteArray(1, 1000), (arr) => {
          const result = XorService.xorMultiple([arr]);
          expect(result).toEqual(arr);
          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: cbl-whitening-storage**
     *
     * *For any* arrays of different lengths, xorMultiple should throw an error
     */
    it('should throw error for arrays of different lengths', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 10, max: 100 }),
          (len1, len2) => {
            fc.pre(len1 !== len2);

            const a = new Uint8Array(len1);
            const b = new Uint8Array(len2);

            expect(() => XorService.xorMultiple([a, b])).toThrow(
              TranslatableBrightChainError,
            );
            try {
              XorService.xorMultiple([a, b]);
            } catch (error) {
              expect(error).toBeInstanceOf(TranslatableBrightChainError);
              expect((error as TranslatableBrightChainError).stringKey).toBe(
                BrightChainStrings.Error_Xor_ArrayLengthMismatchTemplate,
              );
            }
            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: cbl-whitening-storage**
     *
     * Empty array should throw an error
     */
    it('should throw error for empty array', () => {
      expect(() => XorService.xorMultiple([])).toThrow(
        TranslatableBrightChainError,
      );
      try {
        XorService.xorMultiple([]);
      } catch (error) {
        expect(error).toBeInstanceOf(TranslatableBrightChainError);
        expect((error as TranslatableBrightChainError).stringKey).toBe(
          BrightChainStrings.Error_Xor_NoArraysProvided,
        );
      }
    });
  });

  describe('padToBlockSize', () => {
    /**
     * **Feature: cbl-whitening-storage, Property 1: Whitener Size Matches CBL Size**
     *
     * *For any* CBL data and block size, the padded data length should be a multiple of block size
     *
     * **Validates: Requirements 1.1**
     */
    it('should pad data to multiple of block size', () => {
      fc.assert(
        fc.property(arbCblData, arbBlockSize, (cblData, blockSize) => {
          const padded = padToBlockSize(cblData, blockSize);

          // Padded length should be multiple of block size
          expect(padded.length % blockSize).toBe(0);

          // Padded length should be >= length prefix (4) + original length
          expect(padded.length).toBeGreaterThanOrEqual(4 + cblData.length);

          // Original data should be preserved after the 4-byte length prefix
          const originalPortion = padded.subarray(4, 4 + cblData.length);
          expect(originalPortion).toEqual(cblData);

          // Length prefix should contain the original data length
          const view = new DataView(
            padded.buffer,
            padded.byteOffset,
            padded.byteLength,
          );
          const storedLength = view.getUint32(0, false);
          expect(storedLength).toBe(cblData.length);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: cbl-whitening-storage**
     *
     * *For any* data, padded result should always be at least LENGTH_PREFIX_SIZE + data.length
     */
    it('should always include length prefix in padded data', () => {
      fc.assert(
        fc.property(
          arbBlockSize,
          fc.integer({ min: 1, max: 10 }),
          (blockSize, multiplier) => {
            const dataLength = blockSize * multiplier - 10; // Some arbitrary length
            const data = new Uint8Array(Math.max(1, dataLength));

            const padded = padToBlockSize(data, blockSize);

            // Padded should be at least 4 (length prefix) + data.length
            expect(padded.length).toBeGreaterThanOrEqual(4 + data.length);
            // Padded should be a multiple of block size
            expect(padded.length % blockSize).toBe(0);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: cbl-whitening-storage**
     *
     * *For any* invalid block size (≤ 0), padding should throw an error
     */
    it('should throw error for invalid block size', () => {
      fc.assert(
        fc.property(
          arbByteArray(1, 100),
          fc.integer({ min: -100, max: 0 }),
          (data, invalidBlockSize) => {
            expect(() => padToBlockSize(data, invalidBlockSize)).toThrow(
              /Block size must be positive/,
            );
            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('unpadCblData', () => {
    /**
     * **Feature: cbl-whitening-storage, Property 2: XOR Round-Trip Reconstruction**
     *
     * *For any* valid CBL data, padding and then unpadding should return the original
     *
     * **Validates: Requirements 1.2, 3.4**
     */
    it('should recover original CBL after padding and unpadding', () => {
      fc.assert(
        fc.property(arbCblData, arbBlockSize, (cblData, blockSize) => {
          const padded = padToBlockSize(cblData, blockSize);
          const unpadded = unpadCblData(padded);

          // Unpadded should match original
          expect(unpadded).toEqual(cblData);

          // Verify it's valid JSON
          const jsonString = new TextDecoder().decode(unpadded);
          const parsed = JSON.parse(jsonString);
          expect(parsed).toBeDefined();

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: cbl-whitening-storage**
     *
     * *For any* data that is too short (less than 4 bytes), unpadding should throw an error
     */
    it('should throw error for data that is too short', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 3 }), (length) => {
          const data = new Uint8Array(length);

          expect(() => unpadCblData(data)).toThrow(
            /Invalid padded data.*too short/,
          );

          return true;
        }),
        { numRuns: 10 },
      );
    });
  });

  describe('Integration: Full CBL Whitening Round-Trip', () => {
    /**
     * **Feature: cbl-whitening-storage, Property 2: XOR Round-Trip Reconstruction**
     *
     * *For any* CBL data, the full whitening process (pad, XOR, XOR, unpad) should recover the original
     *
     * **Validates: Requirements 1.1, 1.2, 3.4**
     */
    it('should complete full whitening round-trip successfully', () => {
      fc.assert(
        fc.property(arbCblData, arbBlockSize, (cblData, blockSize) => {
          // 1. Pad CBL to block size
          const paddedCbl = padToBlockSize(cblData, blockSize);

          // 2. Generate random whitener of same length
          const whitener = new Uint8Array(paddedCbl.length);
          for (let i = 0; i < whitener.length; i++) {
            whitener[i] = Math.floor(Math.random() * 256);
          }

          // 3. XOR to create CBL*
          const cblPrime = xorArrays(paddedCbl, whitener);

          // 4. XOR again to reconstruct
          const reconstructedPadded = xorArrays(cblPrime, whitener);

          // 5. Unpad to get original
          const reconstructed = unpadCblData(reconstructedPadded);

          // Verify round-trip
          expect(reconstructed).toEqual(cblData);

          // Verify it's valid JSON
          const jsonString = new TextDecoder().decode(reconstructed);
          const parsed = JSON.parse(jsonString);
          expect(parsed).toBeDefined();

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });
});
