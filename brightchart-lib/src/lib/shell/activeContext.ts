/**
 * Active Context Interface
 *
 * Defines the IActiveContext interface representing the current application
 * state within the BrightChart shell: authenticated member, healthcare roles,
 * active specialty, active patient, and active encounter.
 *
 * @module shell/activeContext
 */

import type { ISpecialtyProfile } from '../clinical/specialty/specialtyTypes';
import type { IEncounterResource } from '../encounter/encounterResource';
import type { IPatientResource } from '../fhir/patientResource';
import type { IHealthcareRole } from '../roles/healthcareRole';

/**
 * Lightweight member context for the frontend shell.
 *
 * This is the frontend-compatible subset of the API's IMemberContext.
 * It carries the essential identity fields without Express/JWT dependencies.
 */
export interface IShellMemberContext {
  /** BrightChain member ID */
  memberId: string;
  /** Username */
  username: string;
  /** Member type string (e.g. 'User', 'Admin', 'System') */
  type: string;
  /** Optional role codes from JWT claims */
  roles?: string[];
}

/**
 * Active application context for the BrightChart shell.
 *
 * Holds the authenticated member, their healthcare roles, the active
 * specialty profile, and optional active patient/encounter. All workspace
 * views consume this context to determine what data to fetch and display.
 *
 * @typeParam TID - Identifier type, defaults to string (frontend)
 */
export interface IActiveContext<TID = string> {
  /** Authenticated member identity */
  member: IShellMemberContext;

  /** All healthcare roles assigned to this member */
  healthcareRoles: IHealthcareRole<TID>[];

  /** Currently active healthcare role */
  activeRole: IHealthcareRole<TID>;

  /** Practice-wide specialty profile */
  specialtyProfile: ISpecialtyProfile;

  /**
   * Organization reference from the active role (convenience accessor).
   * Undefined when the active role has no organization scope.
   */
  activeOrganizationName?: string;

  /**
   * Patient resource reference from the active role (convenience accessor).
   * Present when the active role is a patient role — used by the Patient
   * Portal to enforce self-only access.
   */
  activePatientRef?: string;

  /** Currently selected patient (if viewing a patient chart) */
  activePatient?: IPatientResource<TID>;

  /** Currently active encounter (if in a clinical session) */
  activeEncounter?: IEncounterResource<TID>;

  /** Set or clear the active patient */
  setActivePatient(patient: IPatientResource<TID> | undefined): void;

  /** Set or clear the active encounter */
  setActiveEncounter(encounter: IEncounterResource<TID> | undefined): void;

  /** Switch to a different healthcare role */
  switchRole(role: IHealthcareRole<TID>): void;

  /**
   * Trigger a refetch of the member's healthcare roles.
   * Called after mutations that create new roles (org creation,
   * patient registration, invitation redemption) so the
   * RoleSwitcher updates without a full page refresh.
   */
  refetchRoles?: () => void;
}
