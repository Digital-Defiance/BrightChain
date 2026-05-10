/**
 * Healthcare Role Layer
 *
 * Defines the IHealthcareRole interface following the FHIR PractitionerRole
 * resource structure with SNOMED CT role codes. Healthcare roles are metadata
 * on BrightChain members — the core MemberType enum is NOT modified.
 *
 * @see https://build.fhir.org/practitionerrole.html
 * @module roles/healthcareRole
 */

import type { ICodeableConcept, IPeriod, IReference } from '../fhir/datatypes';

/**
 * Healthcare role assigned to a BrightChain member, following FHIR PractitionerRole structure.
 *
 * Maps a practitioner (or patient) to an organization with a SNOMED CT role code,
 * specialty, and validity period.
 *
 * @typeParam TID - The identifier type, defaults to string (frontend) but can be Uint8Array (backend)
 * @see https://build.fhir.org/practitionerrole.html
 */
export interface IHealthcareRole<TID = string> {
  /** SNOMED CT role code identifying the role type (e.g., '309343006' for Physician) */
  roleCode: string;

  /** Human-readable display name for the role (e.g., 'Physician') */
  roleDisplay: string;

  /** Clinical specialty as a FHIR CodeableConcept */
  specialty?: ICodeableConcept;

  /** Reference to the organization this role is associated with */
  organization?: IReference<TID>;

  /** Reference to the practitioner holding this role (when the member is a clinician at this org) */
  practitioner?: IReference<TID>;

  /**
   * Reference to the Patient resource for this member at this organization.
   * Present when the member is a patient at the referenced organization.
   * The Patient Portal workspace uses this to enforce self-only access.
   */
  patient?: IReference<TID>;

  /** Time period during which this role is/was valid */
  period?: IPeriod;
}
