/**
 * Property-based tests for reconstructKeyEpochState — Property 4: Key epoch state reconstruction round-trip.
 *
 * Feature: brightchat-persistence-rehydration, Property 4: Key epoch state reconstruction round-trip
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 2.4, 3.3, 4.5**
 *
 * For any entity with a valid encryptedSharedKey map containing one or more epoch
 * entries, the reconstructed IKeyEpochState SHALL have:
 * - currentEpoch equal to the maximum epoch number in the map
 * - encryptedEpochKeys identical to the original encryptedSharedKey map
 * - epochKeys empty (raw keys are never persisted)
 *
 * Additionally, null/undefined/non-Map inputs return undefined.
 *
 * Generator strategy: arbEncryptedSharedKey from mockChatStorageProvider generates
 * Map<number, Map<string, string>> with 1–5 epochs and 1–5 members per epoch.
 */

import fc from 'fast-check';
import { reconstructKeyEpochState } from '../rehydrationHelpers';
import { arbEncryptedSharedKey } from './mockChatStorageProvider';

describe('Feature: brightchat-persistence-rehydration, Property 4: Key epoch state reconstruction round-trip', () => {
  /**
   * Property 4: Key epoch state reconstruction round-trip
   *
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 2.4, 3.3, 4.5**
   */
  it('currentEpoch equals the maximum epoch number in the input map', () => {
    fc.assert(
      fc.property(arbEncryptedSharedKey(), (encryptedSharedKey) => {
        const result = reconstructKeyEpochState(encryptedSharedKey);
        expect(result).toBeDefined();

        const epochs = Array.from(encryptedSharedKey.keys());
        const expectedMax = Math.max(...epochs);
        expect(result!.currentEpoch).toBe(expectedMax);
      }),
      { numRuns: 100 },
    );
  });

  it('encryptedEpochKeys is identical to the input encryptedSharedKey map', () => {
    fc.assert(
      fc.property(arbEncryptedSharedKey(), (encryptedSharedKey) => {
        const result = reconstructKeyEpochState(encryptedSharedKey);
        expect(result).toBeDefined();
        expect(result!.encryptedEpochKeys).toBe(encryptedSharedKey);
      }),
      { numRuns: 100 },
    );
  });

  it('epochKeys is empty (raw keys are never persisted)', () => {
    fc.assert(
      fc.property(arbEncryptedSharedKey(), (encryptedSharedKey) => {
        const result = reconstructKeyEpochState(encryptedSharedKey);
        expect(result).toBeDefined();
        expect(result!.epochKeys.size).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('returns undefined for null/undefined/non-Map inputs', () => {
    expect(reconstructKeyEpochState(null)).toBeUndefined();
    expect(reconstructKeyEpochState(undefined)).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(reconstructKeyEpochState({} as any)).toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(reconstructKeyEpochState('not a map' as any)).toBeUndefined();
  });
});
