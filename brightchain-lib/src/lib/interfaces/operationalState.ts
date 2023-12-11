/**
 * @fileoverview OperationalState interface.
 *
 * Persisted state of the BrightTrust system's operational mode and current epoch.
 *
 * @see Requirements 1.4, 1.5
 */

import { BrightTrustOperationalMode } from '../enumerations/brightTrustOperationalMode';

/**
 * Persisted operational state of the BrightTrust system.
 */
export interface OperationalState {
  /** Current operational mode */
  mode: BrightTrustOperationalMode;
  /** Current epoch number */
  currentEpochNumber: number;
  /** Timestamp of last state update */
  lastUpdated: Date;
}
