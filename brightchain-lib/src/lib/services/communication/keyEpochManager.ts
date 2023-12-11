/**
 * Key Epoch Manager for BrightChat E2E Encryption.
 *
 * Manages versioned symmetric keys per communication context.
 * Each key rotation creates a new epoch. Messages record which
 * epoch they were encrypted under.
 *
 * epoch 0 = initial key, epoch N = Nth rotation.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 5.3, 2.2, 5.2
 */

/**
 * Tracks key epochs for a communication context.
 *
 * encryptedEpochKeys: Map<epoch, Map<memberId, wrappedKey>>
 */
export interface IKeyEpochState<TData = Uint8Array> {
  currentEpoch: number;
  /** epoch → raw symmetric key (server-side only, in-memory) */
  epochKeys: Map<number, Uint8Array>;
  /** epoch → memberId → wrapped key (persisted) */
  encryptedEpochKeys: Map<number, Map<string, TData>>;
}

export class KeyEpochManager {
  /**
   * Initialize epoch state for a new context.
   * Creates epoch 0 with the given symmetric key, wraps for all members.
   */
  static createInitial(
    symmetricKey: Uint8Array,
    memberIds: string[],
    encryptKeyForMembers: (
      ids: string[],
      key: Uint8Array,
    ) => Map<string, Uint8Array>,
  ): IKeyEpochState {
    const epochKeys = new Map<number, Uint8Array>();
    epochKeys.set(0, symmetricKey);

    const wrappedKeys = encryptKeyForMembers(memberIds, symmetricKey);
    const encryptedEpochKeys = new Map<number, Map<string, Uint8Array>>();
    encryptedEpochKeys.set(0, wrappedKeys);

    return { currentEpoch: 0, epochKeys, encryptedEpochKeys };
  }

  /**
   * Rotate: increment epoch, add new key, delete removed member from ALL epochs,
   * re-wrap ALL epoch keys for remaining members.
   */
  static rotate(
    state: IKeyEpochState,
    newKey: Uint8Array,
    remainingMemberIds: string[],
    removedMemberId: string,
    encryptKeyForMembers: (
      ids: string[],
      key: Uint8Array,
    ) => Map<string, Uint8Array>,
  ): IKeyEpochState {
    const newEpoch = state.currentEpoch + 1;

    // Add new epoch key
    state.epochKeys.set(newEpoch, newKey);

    // Delete removed member from ALL epochs
    for (const [, memberMap] of state.encryptedEpochKeys) {
      memberMap.delete(removedMemberId);
    }

    // Re-wrap ALL epoch keys for remaining members
    for (const [epoch, rawKey] of state.epochKeys) {
      state.encryptedEpochKeys.set(
        epoch,
        encryptKeyForMembers(remainingMemberIds, rawKey),
      );
    }

    return { ...state, currentEpoch: newEpoch };
  }

  /**
   * Add a member: wrap ALL epoch keys for the new member
   * so they can read history.
   */
  static addMember(
    state: IKeyEpochState,
    newMemberId: string,
    encryptKeyForMember: (memberId: string, key: Uint8Array) => Uint8Array,
  ): void {
    for (const [epoch, rawKey] of state.epochKeys) {
      const epochMap =
        state.encryptedEpochKeys.get(epoch) ?? new Map<string, Uint8Array>();
      epochMap.set(newMemberId, encryptKeyForMember(newMemberId, rawKey));
      state.encryptedEpochKeys.set(epoch, epochMap);
    }
  }
}
