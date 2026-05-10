/**
 * Encounter Lifecycle Interface and FHIR Status Transitions
 *
 * Defines the `IEncounterLifecycle<TID>` interface governing encounter
 * status transitions (FHIR R4 level) and workflow state transitions
 * (site-configurable level). Also exports the default FHIR status
 * transition map as `ENCOUNTER_STATUS_TRANSITIONS`.
 *
 * @see https://www.hl7.org/fhir/codesystem-encounter-status.html
 * @module encounter/lifecycle/encounterLifecycle
 */

import { IOperationOutcome } from '../../fhir/operationOutcome';
import type { IEncounterResource } from '../encounterResource';
import { EncounterStatus } from '../enumerations';
import type { IEncounterWorkflowConfig } from '../workflow/workflowTypes';

/**
 * Valid FHIR R4 encounter status transitions.
 *
 * Each key is a source status; its value is the array of statuses
 * reachable from that source. Every status can also transition to
 * `entered-in-error` (included explicitly in each entry).
 *
 * @see Requirement 4.2
 */
export const ENCOUNTER_STATUS_TRANSITIONS: Record<
  EncounterStatus,
  EncounterStatus[]
> = {
  [EncounterStatus.Planned]: [
    EncounterStatus.Arrived,
    EncounterStatus.Cancelled,
    EncounterStatus.EnteredInError,
  ],
  [EncounterStatus.Arrived]: [
    EncounterStatus.Triaged,
    EncounterStatus.InProgress,
    EncounterStatus.Cancelled,
    EncounterStatus.EnteredInError,
  ],
  [EncounterStatus.Triaged]: [
    EncounterStatus.InProgress,
    EncounterStatus.Cancelled,
    EncounterStatus.EnteredInError,
  ],
  [EncounterStatus.InProgress]: [
    EncounterStatus.OnLeave,
    EncounterStatus.Finished,
    EncounterStatus.Cancelled,
    EncounterStatus.EnteredInError,
  ],
  [EncounterStatus.OnLeave]: [
    EncounterStatus.InProgress,
    EncounterStatus.Finished,
    EncounterStatus.EnteredInError,
  ],
  [EncounterStatus.Finished]: [EncounterStatus.EnteredInError],
  [EncounterStatus.Cancelled]: [EncounterStatus.EnteredInError],
  [EncounterStatus.EnteredInError]: [],
  [EncounterStatus.Unknown]: [EncounterStatus.EnteredInError],
};

/**
 * Encounter lifecycle state machine interface.
 *
 * Provides FHIR-level status transition validation and execution,
 * as well as site-configurable workflow state transition validation
 * and execution. Implementations apply transitions, append to
 * `statusHistory`, and return the updated encounter — or return an
 * `IOperationOutcome` when the transition is invalid.
 *
 * @typeParam TID - Identifier type (defaults to `string`)
 *
 * @see Requirement 4.1, 4.3, 4.10
 */
export interface IEncounterLifecycle<TID = string> {
  /**
   * Check whether a FHIR status transition is valid.
   *
   * @param fromStatus - Current encounter status
   * @param toStatus   - Desired target status
   * @returns `true` if the transition is allowed
   *
   * @see Requirement 4.1
   */
  isValidTransition(
    fromStatus: EncounterStatus,
    toStatus: EncounterStatus,
  ): boolean;

  /**
   * Apply a FHIR status transition to an encounter.
   *
   * On success the returned encounter has:
   * - `status` set to `toStatus`
   * - the previous status appended to `statusHistory`
   *
   * On failure an `IOperationOutcome` with severity "error" and
   * code "invalid" is returned.
   *
   * @param encounter - The encounter to transition
   * @param toStatus  - Desired target FHIR status
   * @param memberId  - The member performing the transition
   * @returns Updated encounter or OperationOutcome
   *
   * @see Requirement 4.3, 4.4
   */
  transition(
    encounter: IEncounterResource<TID>,
    toStatus: EncounterStatus,
    memberId: TID,
  ): IEncounterResource<TID> | IOperationOutcome;

  /**
   * Check whether a workflow state transition is valid within a
   * given workflow configuration.
   *
   * @param config    - The active workflow configuration
   * @param fromState - Current workflow state code
   * @param toState   - Desired target workflow state code
   * @returns `true` if the transition is allowed
   *
   * @see Requirement 4.10
   */
  isValidWorkflowTransition(
    config: IEncounterWorkflowConfig,
    fromState: string,
    toState: string,
  ): boolean;

  /**
   * Apply a workflow state transition to an encounter.
   *
   * Validates that:
   * 1. The transition exists in the workflow config's transitions list
   * 2. The implied FHIR status transition is valid
   *
   * On success the returned encounter has:
   * - `status` set to the target state's `mappedFhirStatus`
   * - the `workflowState` extension updated to the target state code
   * - `statusHistory` appended if the FHIR status changed
   *
   * On failure an `IOperationOutcome` is returned.
   *
   * @param encounter - The encounter to transition
   * @param config    - The active workflow configuration
   * @param toState   - Desired target workflow state code
   * @param memberId  - The member performing the transition
   * @returns Updated encounter or OperationOutcome
   *
   * @see Requirement 4.10
   */
  workflowTransition(
    encounter: IEncounterResource<TID>,
    config: IEncounterWorkflowConfig,
    toState: string,
    memberId: TID,
  ): IEncounterResource<TID> | IOperationOutcome;
}
