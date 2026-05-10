/**
 * Organization DTOs
 *
 * Request and response DTO interfaces shared between client and server
 * for Organization, Staff, Patient, and Invitation operations.
 *
 * @module organizations/organizationDtos
 */

import type {
  IAddress,
  ICodeableConcept,
  IContactPoint,
} from '../fhir/datatypes';
import type { EnrollmentMode } from './organization';

/**
 * Request payload for creating a new organization.
 * @see Requirement 1.1
 */
export interface ICreateOrganizationRequest {
  /** Human-readable name of the organization (required) */
  name: string;

  /** Organization type as a FHIR CodeableConcept */
  type?: ICodeableConcept;

  /** Contact details (phone, email, etc.) */
  telecom?: IContactPoint[];

  /** Physical or mailing addresses */
  address?: IAddress[];
}

/**
 * Request payload for updating an existing organization.
 * All fields are optional — only specified fields are updated.
 * @see Requirement 2.1
 */
export interface IUpdateOrganizationRequest {
  /** Updated organization name */
  name?: string;

  /** Updated organization type */
  type?: ICodeableConcept;

  /** Updated contact details */
  telecom?: IContactPoint[];

  /** Updated addresses */
  address?: IAddress[];

  /** Updated active status */
  active?: boolean;

  /** Updated enrollment mode */
  enrollmentMode?: EnrollmentMode;
}

/**
 * Request payload for assigning a staff (practitioner) role.
 * @see Requirement 3.1
 */
export interface IAssignStaffRequest {
  /** Target BrightChain member ID to assign the role to */
  memberId: string;

  /** SNOMED CT practitioner role code */
  roleCode: string;

  /** Organization ID to assign the role at */
  organizationId: string;
}

/**
 * Request payload for registering a patient at an organization.
 * @see Requirement 4.1
 */
export interface IRegisterPatientRequest {
  /** Organization ID to register at */
  organizationId: string;

  /**
   * Target member ID for staff-initiated registration.
   * When omitted, the authenticated member is registering themselves.
   */
  targetMemberId?: string;

  /** Invitation token for invite-only organizations */
  invitationToken?: string;
}

/**
 * Request payload for creating an invitation.
 * @see Requirement 5.1
 */
export interface ICreateInvitationRequest {
  /** Organization ID the invitation is for */
  organizationId: string;

  /** SNOMED CT role code the invitee will receive */
  roleCode: string;

  /** Optional email address of the intended recipient */
  targetEmail?: string;
}

/**
 * Request payload for redeeming an invitation token.
 * @see Requirement 5.3
 */
export interface IRedeemInvitationRequest {
  /** The invitation token to redeem */
  token: string;
}
