/**
 * @fileoverview RedistributionJournalEntry interface.
 *
 * Journal entry stored before modifying a document during transition ceremony
 * or share redistribution, enabling precise rollback on failure.
 *
 * @see Design: Transition Ceremony Algorithm — Rollback Mechanism
 */

import { HexString } from '@digitaldefiance/ecies-lib';

/**
 * Journal entry for share redistribution rollback support.
 */
export interface RedistributionJournalEntry {
  /** ID of the document being redistributed */
  documentId: HexString;
  /** Original encrypted shares before redistribution */
  oldShares: Map<HexString, Uint8Array>;
  /** Original member IDs before redistribution */
  oldMemberIds: HexString[];
  /** Original threshold before redistribution */
  oldThreshold: number;
  /** Original epoch number before redistribution */
  oldEpoch: number;
}
