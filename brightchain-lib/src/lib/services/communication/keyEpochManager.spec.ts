/**
 * Unit tests for KeyEpochManager
 * Feature: brightchat-e2e-encryption
 *
 * Tests the core epoch-based key management logic:
 * - createInitial: epoch 0 setup
 * - rotate: epoch increment, member removal, re-wrapping
 * - addMember: wrapping all epoch keys for new member
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 5.3, 2.2, 5.2**
 */

import { KeyEpochManager, IKeyEpochState } from './keyEpochManager';

/**
 * Simple deterministic "encryption" for testing:
 * concatenates memberId bytes with the key bytes.
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

function makeKey(seed: number): Uint8Array {
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    key[i] = (seed * 31 + i * 7) % 256;
  }
  return key;
}

describe('KeyEpochManager', () => {
  describe('createInitial', () => {
    it('should create epoch 0 with the given key', () => {
      const key = makeKey(1);
      const members = ['alice', 'bob'];

      const state = KeyEpochManager.createInitial(
        key,
        members,
        mockEncryptKeyForMembers,
      );

      expect(state.currentEpoch).toBe(0);
      expect(state.epochKeys.size).toBe(1);
      expect(state.epochKeys.get(0)).toEqual(key);
    });

    it('should wrap keys for all members at epoch 0', () => {
      const key = makeKey(1);
      const members = ['alice', 'bob', 'charlie'];

      const state = KeyEpochManager.createInitial(
        key,
        members,
        mockEncryptKeyForMembers,
      );

      const epoch0 = state.encryptedEpochKeys.get(0);
      expect(epoch0).toBeDefined();
      expect(epoch0!.size).toBe(3);
      expect(epoch0!.has('alice')).toBe(true);
      expect(epoch0!.has('bob')).toBe(true);
      expect(epoch0!.has('charlie')).toBe(true);
    });

    it('should work with a single member', () => {
      const key = makeKey(2);
      const state = KeyEpochManager.createInitial(
        key,
        ['solo'],
        mockEncryptKeyForMembers,
      );

      expect(state.currentEpoch).toBe(0);
      expect(state.encryptedEpochKeys.get(0)!.size).toBe(1);
      expect(state.encryptedEpochKeys.get(0)!.has('solo')).toBe(true);
    });
  });

  describe('rotate', () => {
    it('should increment the epoch', () => {
      const key0 = makeKey(1);
      const key1 = makeKey(2);
      const members = ['alice', 'bob', 'charlie'];

      let state = KeyEpochManager.createInitial(
        key0,
        members,
        mockEncryptKeyForMembers,
      );

      state = KeyEpochManager.rotate(
        state,
        key1,
        ['alice', 'bob'],
        'charlie',
        mockEncryptKeyForMembers,
      );

      expect(state.currentEpoch).toBe(1);
    });

    it('should add the new key at the new epoch', () => {
      const key0 = makeKey(1);
      const key1 = makeKey(2);
      const members = ['alice', 'bob', 'charlie'];

      let state = KeyEpochManager.createInitial(
        key0,
        members,
        mockEncryptKeyForMembers,
      );

      state = KeyEpochManager.rotate(
        state,
        key1,
        ['alice', 'bob'],
        'charlie',
        mockEncryptKeyForMembers,
      );

      expect(state.epochKeys.get(1)).toEqual(key1);
      expect(state.epochKeys.get(0)).toEqual(key0);
    });

    it('should delete the removed member from ALL epochs', () => {
      const key0 = makeKey(1);
      const key1 = makeKey(2);
      const members = ['alice', 'bob', 'charlie'];

      let state = KeyEpochManager.createInitial(
        key0,
        members,
        mockEncryptKeyForMembers,
      );

      state = KeyEpochManager.rotate(
        state,
        key1,
        ['alice', 'bob'],
        'charlie',
        mockEncryptKeyForMembers,
      );

      // charlie should not appear in any epoch
      for (const [, memberMap] of state.encryptedEpochKeys) {
        expect(memberMap.has('charlie')).toBe(false);
      }
    });

    it('should re-wrap all epoch keys for remaining members', () => {
      const key0 = makeKey(1);
      const key1 = makeKey(2);
      const members = ['alice', 'bob', 'charlie'];

      let state = KeyEpochManager.createInitial(
        key0,
        members,
        mockEncryptKeyForMembers,
      );

      state = KeyEpochManager.rotate(
        state,
        key1,
        ['alice', 'bob'],
        'charlie',
        mockEncryptKeyForMembers,
      );

      // Both epochs should have entries for alice and bob only
      for (const [, memberMap] of state.encryptedEpochKeys) {
        expect(memberMap.size).toBe(2);
        expect(memberMap.has('alice')).toBe(true);
        expect(memberMap.has('bob')).toBe(true);
      }
    });

    it('should handle multiple rotations', () => {
      const key0 = makeKey(1);
      const key1 = makeKey(2);
      const key2 = makeKey(3);
      const members = ['alice', 'bob', 'charlie', 'dave'];

      let state = KeyEpochManager.createInitial(
        key0,
        members,
        mockEncryptKeyForMembers,
      );

      // Remove charlie
      state = KeyEpochManager.rotate(
        state,
        key1,
        ['alice', 'bob', 'dave'],
        'charlie',
        mockEncryptKeyForMembers,
      );

      // Remove dave
      state = KeyEpochManager.rotate(
        state,
        key2,
        ['alice', 'bob'],
        'dave',
        mockEncryptKeyForMembers,
      );

      expect(state.currentEpoch).toBe(2);
      expect(state.epochKeys.size).toBe(3);

      // Only alice and bob should remain in all epochs
      for (const [, memberMap] of state.encryptedEpochKeys) {
        expect(memberMap.size).toBe(2);
        expect(memberMap.has('alice')).toBe(true);
        expect(memberMap.has('bob')).toBe(true);
        expect(memberMap.has('charlie')).toBe(false);
        expect(memberMap.has('dave')).toBe(false);
      }
    });
  });

  describe('addMember', () => {
    it('should wrap all epoch keys for the new member', () => {
      const key0 = makeKey(1);
      const members = ['alice', 'bob'];

      const state = KeyEpochManager.createInitial(
        key0,
        members,
        mockEncryptKeyForMembers,
      );

      KeyEpochManager.addMember(state, 'charlie', mockEncryptKeyForMember);

      // charlie should have an entry in epoch 0
      const epoch0 = state.encryptedEpochKeys.get(0);
      expect(epoch0!.has('charlie')).toBe(true);
    });

    it('should wrap keys across multiple epochs', () => {
      const key0 = makeKey(1);
      const key1 = makeKey(2);
      const members = ['alice', 'bob', 'charlie'];

      let state = KeyEpochManager.createInitial(
        key0,
        members,
        mockEncryptKeyForMembers,
      );

      // Rotate (remove charlie)
      state = KeyEpochManager.rotate(
        state,
        key1,
        ['alice', 'bob'],
        'charlie',
        mockEncryptKeyForMembers,
      );

      // Add dave — should get wrapped keys for both epoch 0 and epoch 1
      KeyEpochManager.addMember(state, 'dave', mockEncryptKeyForMember);

      expect(state.encryptedEpochKeys.get(0)!.has('dave')).toBe(true);
      expect(state.encryptedEpochKeys.get(1)!.has('dave')).toBe(true);
    });

    it('should not affect existing members', () => {
      const key0 = makeKey(1);
      const members = ['alice', 'bob'];

      const state = KeyEpochManager.createInitial(
        key0,
        members,
        mockEncryptKeyForMembers,
      );

      const aliceKeyBefore = state.encryptedEpochKeys.get(0)!.get('alice');

      KeyEpochManager.addMember(state, 'charlie', mockEncryptKeyForMember);

      // alice's key should be unchanged
      expect(state.encryptedEpochKeys.get(0)!.get('alice')).toEqual(
        aliceKeyBefore,
      );
    });
  });
});
