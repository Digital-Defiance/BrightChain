/**
 * Orders & Results Enumerations
 *
 * FHIR R4 status and intent code enumerations for order and result resources.
 * All enums use TypeScript string enums with FHIR R4 code values.
 *
 * @see https://build.fhir.org/valueset-request-status.html
 * @see https://build.fhir.org/valueset-request-intent.html
 * @see https://build.fhir.org/valueset-medicationrequest-status.html
 * @see https://build.fhir.org/valueset-medicationrequest-intent.html
 * @see https://build.fhir.org/valueset-diagnostic-report-status.html
 * @see https://build.fhir.org/valueset-request-priority.html
 */

/**
 * FHIR R4 ServiceRequest status codes.
 * @see https://build.fhir.org/valueset-request-status.html
 */
export enum ServiceRequestStatus {
  Draft = 'draft',
  Active = 'active',
  OnHold = 'on-hold',
  Revoked = 'revoked',
  Completed = 'completed',
  EnteredInError = 'entered-in-error',
  Unknown = 'unknown',
}

/**
 * FHIR R4 ServiceRequest intent codes.
 * @see https://build.fhir.org/valueset-request-intent.html
 */
export enum ServiceRequestIntent {
  Proposal = 'proposal',
  Plan = 'plan',
  Directive = 'directive',
  Order = 'order',
  OriginalOrder = 'original-order',
  ReflexOrder = 'reflex-order',
  FillerOrder = 'filler-order',
  InstanceOrder = 'instance-order',
  Option = 'option',
}

/**
 * FHIR R4 MedicationRequest status codes.
 * @see https://build.fhir.org/valueset-medicationrequest-status.html
 */
export enum MedicationRequestStatus {
  Active = 'active',
  OnHold = 'on-hold',
  Cancelled = 'cancelled',
  Completed = 'completed',
  EnteredInError = 'entered-in-error',
  Stopped = 'stopped',
  Draft = 'draft',
  Unknown = 'unknown',
}

/**
 * FHIR R4 MedicationRequest intent codes.
 * @see https://build.fhir.org/valueset-medicationrequest-intent.html
 */
export enum MedicationRequestIntent {
  Proposal = 'proposal',
  Plan = 'plan',
  Order = 'order',
  OriginalOrder = 'original-order',
  ReflexOrder = 'reflex-order',
  FillerOrder = 'filler-order',
  InstanceOrder = 'instance-order',
  Option = 'option',
}

/**
 * FHIR R4 DiagnosticReport status codes.
 * @see https://build.fhir.org/valueset-diagnostic-report-status.html
 */
export enum DiagnosticReportStatus {
  Registered = 'registered',
  Partial = 'partial',
  Preliminary = 'preliminary',
  Final = 'final',
  Amended = 'amended',
  Corrected = 'corrected',
  Appended = 'appended',
  Cancelled = 'cancelled',
  EnteredInError = 'entered-in-error',
  Unknown = 'unknown',
}

/**
 * FHIR R4 request priority codes.
 * @see https://build.fhir.org/valueset-request-priority.html
 */
export enum RequestPriority {
  Routine = 'routine',
  Urgent = 'urgent',
  Asap = 'asap',
  Stat = 'stat',
}
