/**
 * @fileoverview OperationalState interface.
 *
 * Persisted state of the quorum system's operational mode and current epoch.
 *
 * @see Requirements 1.4, 1.5
 */

import { QuorumOperationalMode } from '../enumerations/quorumOperationalMode';

/**
 * Persisted operational state of the quorum system.
 */
export interface OperationalState {
  /** Current operational mode */
  mode: QuorumOperationalMode;
  /** Current epoch number */
  currentEpochNumber: number;
  /** Timestamp of last state update */
  lastUpdated: Date;
}
