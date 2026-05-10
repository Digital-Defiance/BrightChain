/**
 * Encounter Audit Interfaces
 *
 * Extends the Module 2 IClinicalAuditEntry with encounter-specific fields
 * for encounter status and status transitions (including workflow state changes).
 *
 * Audit entries are stored in the shared audit pool from Modules 1 and 2,
 * forming hash-linked chains per encounter. Entries are append-only.
 *
 * @see Requirement 10: Encounter Audit Trail
 * @module encounter/audit/encounterAudit
 */

import type { IClinicalAuditEntry } from '../../clinical/audit/clinicalAudit';
import type { EncounterStatus } from '../enumerations';
import type { IEncounterSearchParams } from '../search/encounterSearch';

/**
 * Status transition details captured in an encounter audit entry.
 * Present when the audited operation involved a FHIR status or workflow state change.
 */
export interface IEncounterStatusTransition {
  /** The FHIR encounter status before the transition */
  fromStatus: EncounterStatus;
  /** The FHIR encounter status after the transition */
  toStatus: EncounterStatus;
  /** The workflow state code before the transition (if workflow states are in use) */
  fromWorkflowState?: string;
  /** The workflow state code after the transition (if workflow states are in use) */
  toWorkflowState?: string;
}

/**
 * Encounter audit entry extending the clinical audit entry with
 * encounter-specific status and transition tracking.
 *
 * @see Requirement 10.1, 10.2
 */
export interface IEncounterAuditEntry<TID = string>
  extends IClinicalAuditEntry<TID> {
  /** The encounter's FHIR status at the time of the operation */
  encounterStatus: EncounterStatus;

  /** Status transition details, present when the operation changed the encounter status */
  statusTransition?: IEncounterStatusTransition;
}

/**
 * Encounter audit logger interface for recording all encounter operations.
 *
 * Follows the IClinicalAuditLogger pattern from Module 2, adding
 * a `logStatusTransition` method for encounter-specific status changes.
 *
 * @see Requirements 10.1–10.4
 */
export interface IEncounterAuditLogger<TID = string> {
  /** Log an encounter creation */
  logCreate(
    encounterId: string,
    encounterStatus: EncounterStatus,
    memberId: TID,
  ): Promise<void>;

  /** Log an encounter read/retrieval */
  logRead(
    encounterId: string,
    encounterStatus: EncounterStatus,
    memberId: TID,
  ): Promise<void>;

  /** Log an encounter update */
  logUpdate(
    encounterId: string,
    encounterStatus: EncounterStatus,
    memberId: TID,
  ): Promise<void>;

  /** Log an encounter deletion */
  logDelete(
    encounterId: string,
    encounterStatus: EncounterStatus,
    memberId: TID,
  ): Promise<void>;

  /** Log an encounter search operation */
  logSearch(searchParams: IEncounterSearchParams, memberId: TID): Promise<void>;

  /** Log an encounter status transition (FHIR status and/or workflow state change) */
  logStatusTransition(
    encounterId: string,
    transition: IEncounterStatusTransition,
    memberId: TID,
  ): Promise<void>;
}
