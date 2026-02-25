/**
 * @fileoverview Quorum operational mode enumeration.
 *
 * Defines the operational modes of the quorum system:
 * - Bootstrap: Single-node or few-node mode with reduced thresholds
 * - Quorum: Full quorum mode requiring configured threshold
 * - TransitionInProgress: Intermediate state during transition ceremony
 *
 * @see Requirements 1, 2
 */

export enum QuorumOperationalMode {
  Bootstrap = 'bootstrap',
  Quorum = 'quorum',
  TransitionInProgress = 'transition_in_progress',
}
