/**
 * Organization Interface
 *
 * Defines the IOrganization interface following the FHIR Organization
 * resource structure, stored in the BrightDb `organizations` collection.
 *
 * @see https://build.fhir.org/organization.html
 * @module organizations/organization
 */

import type {
  IAddress,
  ICodeableConcept,
  IContactPoint,
} from '../fhir/datatypes';

/**
 * Enrollment mode for an organization, controlling how patients can register.
 * - `open`: Any BrightChain member can self-register as a patient.
 * - `invite-only`: Patients must present a valid invitation token to register.
 */
export type EnrollmentMode = 'open' | 'invite-only';

/**
 * FHIR Organization resource stored in BrightDb.
 *
 * Represents a healthcare practice, clinic, or facility where
 * practitioners and patients are managed.
 *
 * @typeParam TID - The identifier type, defaults to string (frontend) but can be Uint8Array (backend)
 */
export interface IOrganization<TID = string> {
  /** Unique identifier for the organization */
  _id: TID;

  /** Human-readable name of the organization */
  name: string;

  /** Organization type as a FHIR CodeableConcept */
  type?: ICodeableConcept;

  /** Contact details (phone, email, etc.) */
  telecom?: IContactPoint[];

  /** Physical or mailing addresses */
  address?: IAddress[];

  /** Whether the organization is currently active */
  active: boolean;

  /** Controls how patients can register at this organization */
  enrollmentMode: EnrollmentMode;

  /** Member ID of the creator */
  createdBy: string;

  /** ISO timestamp of creation */
  createdAt: string;

  /** ISO timestamp of last update */
  updatedAt: string;
}
