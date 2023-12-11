/**
 * Property-based tests for KeyEpochManager — Property 5: Key rotation invariants on member removal.
 *
 * Feature: brightchat-e2e-encryption, Property 5: Key rotation invariants
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 5.3, 7.1, 7.2, 7.3**
 *
 * For any context with N members (N ≥ 2) and E key epochs, after removing one member:
 * (a) the current epoch SHALL increment to E+1,
 * (b) a new CEK SHALL exist for epoch E+1 that differs from all previous epoch keys,
 * (c) the removed member SHALL have zero wrapped key entries across ALL epochs, and
 * (d) each of the N-1 remaining members SHALL have a valid wrapped key entry in every epoch (0 through E+1).
 *
 * Generator strategy: Random member counts (2–10), random removal target
 */

import fc from 'fast-check';
import { KeyEpochManager, IKeyEpochState } from '../keyEpochManager';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Deterministic mock encryption: concatenates memberId bytes with key bytes.
 * Same approach as the unit tests in keyEpochManager.spec.ts.
 */
function mockEncryptKeyForMembers(
  ids: string[],
  key: Uint8Array,
): Map<string, Uint8Array> {
  const result = new Map<string, Uint8Array>();
  for (const id of ids) {
    const idBytes = new TextEncoder().encode(id);
    const wrapped = new Uint8Array(idBytes.length + key.length);
    wrapped.set(idBytes, 0);
    wrapped.set(key, idBytes.length);
    result.set(id, wrapped);
  }
  return result;
}

/**
 * Generate a deterministic 32-byte key from a seed value.
 */
function makeKey(seed: number): Uint8Array {
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    key[i] = (seed * 31 + i * 7) % 256;
  }
  return key;
}

/**
 * Check if two Uint8Arrays are byte-equal.
 */
function uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary for unique member IDs: 2–10 members. */
const arbMemberIds = fc
  .uniqueArray(fc.uuid(), { minLength: 2, maxLength: 10 })
  .filter((ids) => ids.length >= 2);

/** Arbitrary for number of pre-existing epochs (rotations before the test rotation): 0–4. */
const arbPreEpochs = fc.integer({ min: 0, max: 4 });

/** Arbitrary for a seed to generate deterministic keys. */
const arbKeySeed = fc.integer({ min: 1, max: 100000 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-e2e-encryption, Property 5: Key rotation invariants', () => {
  /**
   * Property 5: Key rotation invariants on member removal
   *
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 5.3, 7.1, 7.2, 7.3**
   *
   * For any context with N members (N ≥ 2) and E key epochs, after removing one member:
   * (a) the current epoch SHALL increment to E+1,
   * (b) a new CEK SHALL exist for epoch E+1 that differs from all previous epoch keys,
   * (c) the removed member SHALL have zero wrapped key entries across ALL epochs, and
   * (d) each of the N-1 remaining members SHALL have a valid wrapped key entry in every epoch (0 through E+1).
   */
  it('should satisfy all key rotation invariants after member removal', () => {
    fc.assert(
      fc.property(
        arbMemberIds,
        arbPreEpochs,
        arbKeySeed,
        (memberIds, preEpochs, keySeed) => {
          const N = memberIds.length;

          // --- Setup: create initial state with epoch 0 ---
          const initialKey = makeKey(keySeed);
          let state: IKeyEpochState = KeyEpochManager.createInitial(
            initialKey,
            memberIds,
            mockEncryptKeyForMembers,
          );

          // --- Setup: perform E pre-rotations to build up epochs ---
          // We need "extra" members to remove during pre-rotations.
          // To keep the original N members intact for the final test rotation,
          // we add temporary members and remove them to create epochs.
          let currentMembers = [...memberIds];
          for (let e = 0; e < preEpochs; e++) {
            const tempMemberId = `temp-member-${e}`;
            // Add temp member
            const tempEncrypt = (id: string, key: Uint8Array): Uint8Array => {
              const idBytes = new TextEncoder().encode(id);
              const wrapped = new Uint8Array(idBytes.length + key.length);
              wrapped.set(idBytes, 0);
              wrapped.set(key, idBytes.length);
              return wrapped;
            };
            KeyEpochManager.addMember(state, tempMemberId, tempEncrypt);
            currentMembers.push(tempMemberId);

            // Remove temp member (triggers rotation)
            const remaining = currentMembers.filter((id) => id !== tempMemberId);
            const rotationKey = makeKey(keySeed + e + 1);
            state = KeyEpochManager.rotate(
              state,
              rotationKey,
              remaining,
              tempMemberId,
              mockEncryptKeyForMembers,
            );
            currentMembers = remaining;
          }

          const E = state.currentEpoch; // current epoch before the test rotation

          // All original N members should still be present
          // Pick a random removal target (use keySeed to deterministically pick)
          const removalIndex = keySeed % N;
          const removedMemberId = memberIds[removalIndex];
          const remainingMemberIds = memberIds.filter((id) => id !== removedMemberId);

          // Collect all previous epoch keys before rotation
          const previousEpochKeys: Uint8Array[] = [];
          for (const [, key] of state.epochKeys) {
            previousEpochKeys.push(key);
          }

          // --- Act: perform the test rotation ---
          const newKey = makeKey(keySeed + preEpochs + 999);
          state = KeyEpochManager.rotate(
            state,
            newKey,
            remainingMemberIds,
            removedMemberId,
            mockEncryptKeyForMembers,
          );

          // --- Assert (a): epoch increments to E+1 ---
          expect(state.currentEpoch).toBe(E + 1);

          // --- Assert (b): new CEK at epoch E+1 differs from all previous ---
          const newEpochKey = state.epochKeys.get(E + 1);
          expect(newEpochKey).toBeDefined();
          for (const prevKey of previousEpochKeys) {
            expect(uint8ArraysEqual(newEpochKey!, prevKey)).toBe(false);
          }

          // --- Assert (c): removed member has zero entries across ALL epochs ---
          for (const [, memberMap] of state.encryptedEpochKeys) {
            expect(memberMap.has(removedMemberId)).toBe(false);
          }

          // --- Assert (d): each remaining member has entry in every epoch 0..E+1 ---
          for (let epoch = 0; epoch <= E + 1; epoch++) {
            const epochMap = state.encryptedEpochKeys.get(epoch);
            expect(epochMap).toBeDefined();
            for (const memberId of remainingMemberIds) {
              expect(epochMap!.has(memberId)).toBe(true);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
