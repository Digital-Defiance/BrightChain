/**
 * Clinical Resource Enumerations
 *
 * FHIR R4 status code enumerations for clinical resources.
 * All enums use TypeScript string enums with FHIR R4 code values.
 *
 * @see https://build.fhir.org/valueset-observation-status.html
 * @see https://build.fhir.org/valueset-condition-clinical.html
 * @see https://build.fhir.org/valueset-condition-ver-status.html
 * @see https://build.fhir.org/valueset-allergy-intolerance-type.html
 * @see https://build.fhir.org/valueset-allergy-intolerance-category.html
 * @see https://build.fhir.org/valueset-allergy-intolerance-criticality.html
 * @see https://build.fhir.org/valueset-reaction-event-severity.html
 * @see https://build.fhir.org/valueset-medication-status.html
 * @see https://build.fhir.org/valueset-medication-statement-status.html
 * @see https://build.fhir.org/valueset-event-status.html
 */

/**
 * FHIR R4 Observation status codes.
 * @see https://build.fhir.org/valueset-observation-status.html
 */
export enum ObservationStatus {
  Registered = 'registered',
  Preliminary = 'preliminary',
  Final = 'final',
  Amended = 'amended',
  Corrected = 'corrected',
  Cancelled = 'cancelled',
  EnteredInError = 'entered-in-error',
  Unknown = 'unknown',
}

/**
 * FHIR R4 Condition clinical status codes.
 * @see https://build.fhir.org/valueset-condition-clinical.html
 */
export enum ConditionClinicalStatus {
  Active = 'active',
  Recurrence = 'recurrence',
  Relapse = 'relapse',
  Inactive = 'inactive',
  Remission = 'remission',
  Resolved = 'resolved',
}

/**
 * FHIR R4 Condition verification status codes.
 * @see https://build.fhir.org/valueset-condition-ver-status.html
 */
export enum ConditionVerificationStatus {
  Unconfirmed = 'unconfirmed',
  Provisional = 'provisional',
  Differential = 'differential',
  Confirmed = 'confirmed',
  Refuted = 'refuted',
  EnteredInError = 'entered-in-error',
}

/**
 * FHIR R4 AllergyIntolerance type codes.
 * @see https://build.fhir.org/valueset-allergy-intolerance-type.html
 */
export enum AllergyIntoleranceType {
  Allergy = 'allergy',
  Intolerance = 'intolerance',
}

/**
 * FHIR R4 AllergyIntolerance category codes.
 * @see https://build.fhir.org/valueset-allergy-intolerance-category.html
 */
export enum AllergyIntoleranceCategory {
  Food = 'food',
  Medication = 'medication',
  Environment = 'environment',
  Biologic = 'biologic',
}

/**
 * FHIR R4 AllergyIntolerance criticality codes.
 * @see https://build.fhir.org/valueset-allergy-intolerance-criticality.html
 */
export enum AllergyIntoleranceCriticality {
  Low = 'low',
  High = 'high',
  UnableToAssess = 'unable-to-assess',
}

/**
 * FHIR R4 AllergyIntolerance reaction severity codes.
 * @see https://build.fhir.org/valueset-reaction-event-severity.html
 */
export enum AllergyIntoleranceSeverity {
  Mild = 'mild',
  Moderate = 'moderate',
  Severe = 'severe',
}

/**
 * FHIR R4 Medication status codes.
 * @see https://build.fhir.org/valueset-medication-status.html
 */
export enum MedicationStatus {
  Active = 'active',
  Inactive = 'inactive',
  EnteredInError = 'entered-in-error',
}

/**
 * FHIR R4 MedicationStatement status codes.
 * @see https://build.fhir.org/valueset-medication-statement-status.html
 */
export enum MedicationStatementStatus {
  Active = 'active',
  Completed = 'completed',
  EnteredInError = 'entered-in-error',
  Intended = 'intended',
  Stopped = 'stopped',
  OnHold = 'on-hold',
  Unknown = 'unknown',
  NotTaken = 'not-taken',
}

/**
 * FHIR R4 Procedure status codes.
 * @see https://build.fhir.org/valueset-event-status.html
 */
export enum ProcedureStatus {
  Preparation = 'preparation',
  InProgress = 'in-progress',
  NotDone = 'not-done',
  OnHold = 'on-hold',
  Stopped = 'stopped',
  Completed = 'completed',
  EnteredInError = 'entered-in-error',
  Unknown = 'unknown',
}
