/**
 * Scheduling Specialty Extension Types
 *
 * Base interfaces for specialty-aware scheduling. Medical, dental, and
 * veterinary profiles extend these types with domain-specific appointment
 * types, default durations, and booking rules.
 *
 * @see Requirement 15.1
 * @module scheduling/specialty
 */

import type { ICodeableConcept } from '../../fhir/datatypes';

/**
 * A specialty-specific booking rule that constrains or modifies
 * how appointments are scheduled within a given specialty.
 *
 * Examples include sequencing rules (hygienist-then-doctor in dental),
 * duration overrides, and resource requirements (operatory, species-specific
 * equipment).
 */
export interface ISchedulingRule {
  /** Unique identifier for this rule */
  ruleId: string;

  /** Human-readable description of the rule */
  description: string;

  /**
   * Classification of the rule.
   * Common values: 'sequencing', 'duration-override', 'resource-requirement'
   */
  ruleType: string;

  /** Rule-specific configuration parameters */
  parameters: Record<string, unknown>;
}

/**
 * Extension interface for specialty-aware scheduling configuration.
 *
 * Each specialty (medical, dental, veterinary) provides a concrete
 * instance of this interface with its own appointment types, default
 * durations, and booking rules.
 */
export interface ISchedulingSpecialtyExtension {
  /** Identifies the specialty (e.g. medical, dental, veterinary) */
  specialtyCode: ICodeableConcept;

  /** Additional appointment types specific to this specialty */
  appointmentTypeExtensions: ICodeableConcept[];

  /** Map of service type code to default duration in minutes */
  defaultDurations: Record<string, number>;

  /** Specialty-specific booking rules */
  schedulingRules: ISchedulingRule[];
}
