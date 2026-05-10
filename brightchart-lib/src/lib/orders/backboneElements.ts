/**
 * FHIR R4 Orders & Results Backbone Elements
 *
 * Exported TypeScript interfaces for backbone elements used by order
 * resources: MedicationRequestDispenseRequest, MedicationRequestInitialFill,
 * MedicationRequestSubstitution, and DiagnosticReportMedia.
 *
 * Interfaces containing IReference fields are generic on `<TID = string>`
 * to support both frontend (string) and backend (Uint8Array) usage.
 *
 * @see https://build.fhir.org/medicationrequest.html
 * @see https://build.fhir.org/diagnosticreport.html
 * @module orders/backboneElements
 */

import { ISimpleQuantity } from '../clinical/datatypes';
import { IDuration } from '../encounter/encounterResource';
import { ICodeableConcept, IPeriod, IReference } from '../fhir/datatypes';

/**
 * FHIR R4 MedicationRequest.dispenseRequest.initialFill backbone element
 * Indicates the quantity or duration for the first dispense of the medication.
 * @see https://build.fhir.org/medicationrequest-definitions.html#MedicationRequest.dispenseRequest.initialFill
 */
export interface MedicationRequestInitialFill {
  /** First fill quantity */
  quantity?: ISimpleQuantity;
  /** First fill duration */
  duration?: IDuration;
}

/**
 * FHIR R4 MedicationRequest.dispenseRequest backbone element
 * Indicates the specific details for the dispense or medication supply part
 * of a medication request (also known as a Medication Prescription or
 * Medication Order).
 * Generic on TID because performer is an IReference field.
 * @see https://build.fhir.org/medicationrequest-definitions.html#MedicationRequest.dispenseRequest
 */
export interface MedicationRequestDispenseRequest<TID = string> {
  /** First fill details */
  initialFill?: MedicationRequestInitialFill;
  /** Minimum period of time between dispenses */
  dispenseInterval?: IDuration;
  /** Time period supply is authorized for */
  validityPeriod?: IPeriod;
  /** Number of refills authorized */
  numberOfRepeatsAllowed?: number;
  /** Amount of medication to supply per dispense */
  quantity?: ISimpleQuantity;
  /** Number of days supply per dispense */
  expectedSupplyDuration?: IDuration;
  /** Intended dispenser (Organization) */
  performer?: IReference<TID>;
}

/**
 * FHIR R4 MedicationRequest.substitution backbone element
 * Indicates whether or not substitution can or should be part of the
 * dispense. In some cases, substitution must happen, in other cases
 * substitution must not happen.
 * Generic on TID because allowedCodeableConcept may reference coded values.
 * @see https://build.fhir.org/medicationrequest-definitions.html#MedicationRequest.substitution
 */
export interface MedicationRequestSubstitution<_TID = string> {
  /** Whether substitution is allowed (boolean) */
  allowedBoolean?: boolean;
  /** Whether substitution is allowed (CodeableConcept) */
  allowedCodeableConcept?: ICodeableConcept;
  /** Why should (not) substitution be made */
  reason?: ICodeableConcept;
}

/**
 * FHIR R4 DiagnosticReport.media backbone element
 * A list of key images associated with this report.
 * Generic on TID because link is an IReference field.
 * @see https://build.fhir.org/diagnosticreport-definitions.html#DiagnosticReport.media
 */
export interface DiagnosticReportMedia<TID = string> {
  /** Comment about the image (e.g. explanation) */
  comment?: string;
  /** Reference to the image source (required) */
  link: IReference<TID>;
}
