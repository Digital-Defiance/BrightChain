/**
 * @fileoverview BrightTrust operational mode enumeration.
 *
 * Defines the operational modes of the BrightTrust system:
 * - Bootstrap: Single-node or few-node mode with reduced thresholds
 * - BrightTrust: Full BrightTrust mode requiring configured threshold
 * - TransitionInProgress: Intermediate state during transition ceremony
 *
 * @see Requirements 1, 2
 */

export enum BrightTrustOperationalMode {
  Bootstrap = 'bootstrap',
  BrightTrust = 'brightTrust',
  TransitionInProgress = 'transition_in_progress',
}
