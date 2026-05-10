/**
 * FHIR R4 Patient Identifier
 *
 * Extends the base FHIR Identifier with a required system URI and value
 * tuple, representing a typed patient identifier (MRN, SSN, etc.).
 *
 * @see https://build.fhir.org/datatypes.html#Identifier
 * @module fhir/patientIdentifier
 */

import { IIdentifier } from './datatypes';

/**
 * A patient identifier with required system URI and value.
 *
 * Extends the base FHIR `IIdentifier` to enforce the system+value tuple
 * that uniquely identifies a patient within a given namespace.
 */
export interface IPatientIdentifier<TID = string> extends IIdentifier<TID> {
  /** The namespace URI for the identifier (required) */
  system: string;
  /** The identifier value within the namespace (required) */
  value: string;
}
