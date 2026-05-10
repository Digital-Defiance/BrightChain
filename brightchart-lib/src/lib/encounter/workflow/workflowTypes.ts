/**
 * Encounter Workflow State Layer Types
 *
 * Defines the site-configurable workflow state interfaces that map
 * practice-specific encounter steps (e.g. "In Hygiene Chair") to
 * standard FHIR R4 encounter statuses. Workflow states are
 * configuration, not code — switching specialties or sites changes
 * a configuration object, not a code path.
 *
 * @module encounter/workflow/workflowTypes
 */

import type { EncounterStatus } from '../enumerations';

/**
 * A single workflow state within a site-configurable workflow.
 *
 * Each state carries a practice-facing label and maps to exactly
 * one FHIR R4 `EncounterStatus` value, preserving interoperability
 * while giving practices the granularity they need.
 *
 * @see Requirement 4.6
 */
export interface IEncounterWorkflowState {
  /** Unique code within the workflow config */
  code: string;

  /** Practice-facing display label */
  displayName: string;

  /** The FHIR R4 EncounterStatus this workflow state maps to */
  mappedFhirStatus: EncounterStatus;

  /** Optional human-readable description */
  description?: string;

  /** Numeric sort order for UI ordering */
  sortOrder: number;

  /** Whether this state ends the encounter (e.g. Complete, Cancelled) */
  isTerminal: boolean;
}

/**
 * A valid transition between two workflow states.
 *
 * Optionally requires an elevated permission (e.g. provider sign-off).
 * The `requiredPermission` field uses `string` as a forward-compatible
 * placeholder; it will align with the `EncounterPermission` enum once
 * the encounter ACL layer is implemented (Task 9).
 *
 * @see Requirement 4.7
 */
export interface IEncounterWorkflowTransition {
  /** Source workflow state code */
  fromState: string;

  /** Target workflow state code */
  toState: string;

  /**
   * Optional permission required for this transition.
   * Typed as `string` for forward compatibility with
   * `EncounterPermission` values (e.g. 'encounter:write').
   */
  requiredPermission?: string;
}

/**
 * A complete workflow configuration for a specialty and/or site.
 *
 * Defines the ordered list of workflow states, their FHIR status
 * mappings, and valid workflow-level transitions. Each specialty
 * ships with sensible defaults; sites can further customize.
 *
 * @see Requirement 4.8
 */
export interface IEncounterWorkflowConfig {
  /** Unique identifier for this configuration */
  configId: string;

  /** Specialty code matching `ISpecialtyProfile.specialtyCode` */
  specialtyCode: string;

  /** Optional site-specific label */
  siteName?: string;

  /** Ordered list of workflow states */
  states: IEncounterWorkflowState[];

  /** Valid transitions between workflow states */
  transitions: IEncounterWorkflowTransition[];

  /** Workflow state code used for newly created encounters */
  defaultInitialState: string;
}
