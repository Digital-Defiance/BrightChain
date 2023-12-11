/**
 * Metrics exposed by the PoUW middleware for monitoring and observability.
 */
export interface IPoUWMetrics {
  totalRequests: number;
  requestsRateLimited: number;
  workUnitsIssued: number;
  workUnitsCompleted: number;
  workUnitsFailed: number;
  averageVerificationLatencyMs: number;
  /** Total micro-Joules awarded to clients for completed work */
  totalMicroJoulesAwarded: number;
}

/**
 * Metrics exposed by the Work Coordinator for monitoring queue and tree state.
 */
export interface IWorkCoordinatorMetrics {
  queueDepth: number;
  treesInProgress: number;
  treesCompleted: number;
  hashesComputedByClients: number;
}
