/**
 * Rehydration Helpers — shared utilities for restoring in-memory state
 * from persisted storage during service initialization.
 *
 * Used by ConversationService, GroupService, ChannelService, and ServerService
 * to reconstruct key epoch states and group/sort messages after a restart.
 *
 * Requirements: 6.1, 6.2, 6.3, 2.5, 3.4, 4.6
 */

import { ICommunicationMessage } from '../../interfaces/communication';
import { IKeyEpochState } from './keyEpochManager';

/**
 * Reconstruct an IKeyEpochState<string> from a persisted encryptedSharedKey map.
 *
 * Sets `currentEpoch` to the highest epoch number present, populates
 * `encryptedEpochKeys` with the input map, and leaves `epochKeys` empty
 * (raw symmetric keys are never persisted).
 *
 * Returns `undefined` and logs a warning if the input is null, undefined,
 * or not a Map instance.
 *
 * Requirements: 6.1, 6.2, 6.3
 */
export function reconstructKeyEpochState(
  encryptedSharedKey: Map<number, Map<string, string>> | null | undefined,
): IKeyEpochState<string> | undefined {
  if (
    encryptedSharedKey == null ||
    !(encryptedSharedKey instanceof Map)
  ) {
    console.warn(
      '[RehydrationHelpers] Skipping key epoch reconstruction: encryptedSharedKey is null, undefined, or not a Map',
    );
    return undefined;
  }

  const epochs = Array.from(encryptedSharedKey.keys());
  const currentEpoch = epochs.length > 0 ? Math.max(...epochs) : 0;

  return {
    currentEpoch,
    epochKeys: new Map<number, Uint8Array>(),
    encryptedEpochKeys: encryptedSharedKey,
  };
}

/**
 * Group an array of messages by `contextId` and sort each group
 * by `createdAt` in ascending (chronological) order.
 *
 * Requirements: 2.5, 3.4, 4.6
 */
export function groupAndSortMessages(
  messages: ICommunicationMessage[],
): Map<string, ICommunicationMessage[]> {
  const grouped = new Map<string, ICommunicationMessage[]>();

  for (const msg of messages) {
    const list = grouped.get(msg.contextId) ?? [];
    list.push(msg);
    grouped.set(msg.contextId, list);
  }

  for (const [, list] of grouped) {
    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  return grouped;
}
