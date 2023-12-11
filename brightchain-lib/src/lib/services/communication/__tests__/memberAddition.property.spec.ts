/**
 * Property-based tests for KeyEpochManager — Property 4: Member addition distributes all epoch keys.
 *
 * Feature: brightchat-e2e-encryption, Property 4: Member addition distributes all epoch keys
 *
 * **Validates: Requirements 2.2, 5.2, 6.1, 6.2, 6.3**
 *
 * For any context with E key epochs and for any new member with a valid ECIES
 * key pair, after the member is added, the member SHALL have a valid wrapped
 * key entry in every epoch (0 through E), and unwrapping each entry SHALL
 * produce the correct epoch key.
 *
 * Generator strategy: Random epoch counts (1–5), random new member key pair
 */

import fc from 'fast-check';
import { KeyEpochManager, IKeyEpochState } from '../keyEpochManager';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Deterministic mock encryption: concatenates memberId bytes with key bytes.
 * Same approach as keyRotation.property.spec.ts and wrappedKeyCount.property.spec.ts.
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
 * Deterministic mock encryption for a single member.
 * Concatenates memberId bytes with key bytes so we can verify
 * the "unwrap" by checking the wrapped value contains the correct key bytes.
 */
function mockEncryptKeyForMember(
  memberId: string,
  key: Uint8Array,
): Uint8Array {
  const idBytes = new TextEncoder().encode(memberId);
  const wrapped = new Uint8Array(idBytes.length + key.length);
  wrapped.set(idBytes, 0);
  wrapped.set(key, idBytes.length);
  return wrapped;
}

/**
 * Extract the key bytes from a mock-wrapped value.
 * The wrapped value is [memberIdBytes | keyBytes], so we strip the memberId prefix.
 */
function mockUnwrapKey(memberId: string, wrapped: Uint8Array): Uint8Array {
  const idBytes = new TextEncoder().encode(memberId);
  return wrapped.slice(idBytes.length);
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

/** Arbitrary for initial unique member IDs: 2–6 members. */
const arbInitialMembers = fc
  .uniqueArray(fc.uuid(), { minLength: 2, maxLength: 6 })
  .filter((ids) => ids.length >= 2);

/** Arbitrary for number of epochs to build up (1–5 via rotations). */
const arbEpochCount = fc.integer({ min: 1, max: 5 });

/** Arbitrary for the new member ID (must not collide with initial members). */
const arbNewMemberId = fc.uuid();

/** Arbitrary for a seed to generate deterministic keys. */
const arbKeySeed = fc.integer({ min: 1, max: 100000 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-e2e-encryption, Property 4: Member addition distributes all epoch keys', () => {
  /**
   * Property 4: Member addition distributes all epoch keys
   *
   * **Validates: Requirements 2.2, 5.2, 6.1, 6.2, 6.3**
   *
   * For any context with E key epochs and for any new member with a valid
   * ECIES key pair, after the member is added, the member SHALL have a valid
   * wrapped key entry in every epoch (0 through E), and unwrapping each entry
   * SHALL produce the correct epoch key.
   */
  it('should distribute all epoch keys to a newly added member', () => {
    fc.assert(
      fc.property(
        arbInitialMembers,
        arbEpochCount,
        arbNewMemberId,
        arbKeySeed,
        (initialMembers, epochCount, newMemberId, keySeed) => {
          // Skip if the new member ID collides with an existing member
          if (initialMembers.includes(newMemberId)) return;

          // --- Setup: create initial state with epoch 0 ---
          const initialKey = makeKey(keySeed);
          let state: IKeyEpochState = KeyEpochManager.createInitial(
            initialKey,
            initialMembers,
            mockEncryptKeyForMembers,
          );

          // --- Setup: build up E epochs via add-then-remove of temp members ---
          let currentMembers = [...initialMembers];
          for (let e = 0; e < epochCount; e++) {
            const tempMemberId = `temp-member-${e}-${keySeed}`;

            // Add temp member
            KeyEpochManager.addMember(state, tempMemberId, mockEncryptKeyForMember);
            currentMembers.push(tempMemberId);

            // Remove temp member (triggers rotation, creating a new epoch)
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

          const E = state.currentEpoch; // should equal epochCount

          // --- Act: add the new member ---
          KeyEpochManager.addMember(state, newMemberId, mockEncryptKeyForMember);

          // --- Assert: new member has a wrapped key in every epoch 0..E ---
          for (let epoch = 0; epoch <= E; epoch++) {
            const epochMap = state.encryptedEpochKeys.get(epoch);
            expect(epochMap).toBeDefined();
            expect(epochMap!.has(newMemberId)).toBe(true);

            // Verify unwrapping produces the correct epoch key
            const wrappedKey = epochMap!.get(newMemberId)!;
            const unwrappedKey = mockUnwrapKey(newMemberId, wrappedKey);
            const expectedKey = state.epochKeys.get(epoch)!;

            expect(uint8ArraysEqual(unwrappedKey, expectedKey)).toBe(true);
          }

          // --- Assert: total epoch count is correct (0 through E) ---
          expect(state.encryptedEpochKeys.size).toBe(E + 1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
