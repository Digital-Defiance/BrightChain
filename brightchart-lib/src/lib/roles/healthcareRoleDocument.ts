/**
 * Healthcare Role Document Interface
 *
 * Defines the IHealthcareRoleDocument interface representing the stored
 * document shape in the BrightDb `healthcare_roles` collection. This
 * extends the conceptual IHealthcareRole with database-specific fields
 * like `_id`, `memberId`, `organizationId`, and timestamps.
 *
 * @module roles/healthcareRoleDocument
 */

import type { ICodeableConcept, IPeriod } from '../fhir/datatypes';

/**
 * Stored healthcare role document in BrightDb.
 *
 * Links a BrightChain member to an Organization with a SNOMED CT role code,
 * optional practitioner/patient references, and a validity period.
 *
 * @typeParam TID - The identifier type, defaults to string (frontend) but can be Uint8Array (backend)
 */
export interface IHealthcareRoleDocument<TID = string> {
  /** Unique identifier for the healthcare role document */
  _id: TID;

  /** BrightChain member ID this role belongs to */
  memberId: string;

  /** SNOMED CT role code (e.g., '309343006' for Physician) */
  roleCode: string;

  /** Human-readable display name for the role */
  roleDisplay: string;

  /** Clinical specialty as a FHIR CodeableConcept */
  specialty?: ICodeableConcept;

  /** Organization ID this role is scoped to */
  organizationId: string;

  /** Reference to the practitioner (when the member is a clinician) */
  practitionerRef?: string;

  /** Reference to the patient (when the member is a patient) */
  patientRef?: string;

  /** Validity period with start and optional end timestamps */
  period: IPeriod;

  /** Member ID of the creator */
  createdBy: string;

  /** ISO timestamp of creation */
  createdAt: string;

  /** ISO timestamp of last update */
  updatedAt: string;
}
