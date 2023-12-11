/**
 * @fileoverview BrightTrustMetrics interface.
 *
 * Metrics exposed by the BrightTrustStateMachine for monitoring at scale.
 *
 * @see Requirements 12.5
 */

/**
 * Metrics for monitoring the BrightTrust system.
 */
export interface BrightTrustMetrics {
  /** Proposal metrics */
  proposals: {
    /** Total proposals created */
    total: number;
    /** Currently pending proposals */
    pending: number;
  };
  /** Vote metrics */
  votes: {
    /** Average time from proposal creation to threshold reached, in milliseconds */
    latency_ms: number;
  };
  /** Share redistribution metrics */
  redistribution: {
    /** Documents processed / total during active redistribution (0-1), or -1 if idle */
    progress: number;
    /** Failed document redistributions */
    failures: number;
  };
  /** Member metrics */
  members: {
    /** Current active member count */
    active: number;
  };
  /** Epoch metrics */
  epoch: {
    /** Current epoch number */
    current: number;
  };
  /** Expiration scheduler metrics */
  expiration: {
    /** Timestamp of last expiration scheduler run, or null if never run */
    last_run: Date | null;
    /** Total identity records expired */
    deleted_total: number;
  };
}
