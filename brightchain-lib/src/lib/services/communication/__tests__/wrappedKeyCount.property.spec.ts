/**
 * Property-based tests for KeyEpochManager — Property 6: Wrapped key count equals member count.
 *
 * Feature: brightchat-e2e-encryption, Property 6: Wrapped key count equals member count
 *
 * **Validates: Requirements 2.4, 4.4**
 *
 * For any context and for any epoch, the number of entries in
 * `encryptedSharedKey[epoch]` SHALL equal the number of current members
 * in that context.
 *
 * Generator strategy: Random member add/remove sequences
 */

import fc from 'fast-check';
import { KeyEpochManager, IKeyEpochState } from '../keyEpochManager';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Deterministic mock encryption: concatenates memberId bytes with key bytes.
 * Same approach as keyRotation.property.spec.ts.
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
 * Verify the invariant: for every epoch in the state, the number of
 * wrapped key entries equals the current member count.
 */
function assertWrappedKeyCountEqualsMembers(
  state: IKeyEpochState,
  currentMembers: string[],
): void {
  const memberCount = currentMembers.length;
  for (const [epoch, memberMap] of state.encryptedEpochKeys) {
    expect(memberMap.size).toBe(memberCount);
    // Also verify the exact member IDs match
    for (const memberId of currentMembers) {
      expect(memberMap.has(memberId)).toBe(true);
    }
  }
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Operation types for the random sequence. */
type Operation =
  | { type: 'add'; memberId: string }
  | { type: 'remove'; memberIndex: number };

/** Arbitrary for initial unique member IDs: 2–8 members. */
const arbInitialMembers = fc
  .uniqueArray(fc.uuid(), { minLength: 2, maxLength: 8 })
  .filter((ids) => ids.length >= 2);

/** Arbitrary for a seed to generate deterministic keys. */
const arbKeySeed = fc.integer({ min: 1, max: 100000 });

/**
 * Arbitrary for a sequence of add/remove operations (3–15 ops).
 * Remove operations use an index into the current member list
 * (resolved at execution time).
 */
const arbOperations: fc.Arbitrary<Operation[]> = fc.array(
  fc.oneof(
    fc.record({
      type: fc.constant('add' as const),
      memberId: fc.uuid(),
    }),
    fc.record({
      type: fc.constant('remove' as const),
      memberIndex: fc.nat({ max: 99 }),
    }),
  ),
  { minLength: 3, maxLength: 15 },
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-e2e-encryption, Property 6: Wrapped key count equals member count', () => {
  /**
   * Property 6: Wrapped key count equals member count
   *
   * **Validates: Requirements 2.4, 4.4**
   *
   * For any context and for any epoch, the number of entries in
   * `encryptedSharedKey[epoch]` SHALL equal the number of current members.
   */
  it('should have wrapped key count equal to member count after any sequence of add/remove operations', () => {
    fc.assert(
      fc.property(
        arbInitialMembers,
        arbKeySeed,
        arbOperations,
        (initialMembers, keySeed, operations) => {
          // --- Setup: create initial state ---
          const initialKey = makeKey(keySeed);
          let state: IKeyEpochState = KeyEpochManager.createInitial(
            initialKey,
            initialMembers,
            mockEncryptKeyForMembers,
          );
          let currentMembers = [...initialMembers];
          let keySeedCounter = keySeed;

          // Invariant holds after creation
          assertWrappedKeyCountEqualsMembers(state, currentMembers);

          // --- Apply random operations ---
          for (const op of operations) {
            if (op.type === 'add') {
              // Skip if member already exists
              if (currentMembers.includes(op.memberId)) continue;

              KeyEpochManager.addMember(
                state,
                op.memberId,
                mockEncryptKeyForMember,
              );
              currentMembers.push(op.memberId);
            } else {
              // Remove: need at least 2 members to remove one
              if (currentMembers.length < 2) continue;

              const idx = op.memberIndex % currentMembers.length;
              const removedId = currentMembers[idx];
              const remaining = currentMembers.filter((id) => id !== removedId);

              keySeedCounter++;
              const newKey = makeKey(keySeedCounter);
              state = KeyEpochManager.rotate(
                state,
                newKey,
                remaining,
                removedId,
                mockEncryptKeyForMembers,
              );
              currentMembers = remaining;
            }

            // Invariant MUST hold after every operation
            assertWrappedKeyCountEqualsMembers(state, currentMembers);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
