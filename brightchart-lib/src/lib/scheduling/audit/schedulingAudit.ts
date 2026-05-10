/**
 * Scheduling Audit Interfaces
 *
 * Extends the Module 2 IClinicalAuditEntry with scheduling-specific fields
 * for appointment status and status transitions. Provides a logger
 * interface for recording all scheduling operations including status
 * transitions and encounter bridge events.
 *
 * Audit entries are stored in the shared audit pool with hash-linked
 * chains per scheduling resource. Entries are append-only.
 *
 * @see Requirement 12: Scheduling Audit Trail
 * @module scheduling/audit/schedulingAudit
 */

import type { IClinicalAuditEntry } from '../../clinical/audit/clinicalAudit';
import type { AppointmentStatus } from '../enumerations';
import type { IAppointmentSearchParams } from '../search/schedulingSearch';

/**
 * Status transition details captured in a scheduling audit entry.
 * Present when the audited operation involved an appointment status change.
 */
export interface IAppointmentStatusTransition {
  /** The appointment status before the transition */
  from: AppointmentStatus;
  /** The appointment status after the transition */
  to: AppointmentStatus;
}

/**
 * Scheduling audit entry extending the clinical audit entry with
 * appointment-specific status and transition tracking.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirements 12.1, 12.2
 */
export interface ISchedulingAuditEntry<TID = string>
  extends IClinicalAuditEntry<TID> {
  /** The appointment's FHIR status at the time of the operation */
  appointmentStatus?: AppointmentStatus;

  /** Status transition details, present when the operation changed the appointment status */
  statusTransition?: IAppointmentStatusTransition;
}

/**
 * Scheduling audit logger interface for recording all scheduling operations.
 *
 * Follows the IEncounterAuditLogger / IOrderAuditLogger pattern, adding
 * methods for scheduling-specific operations: status transitions and
 * encounter bridge events.
 *
 * All entries are append-only and stored in the shared audit pool
 * with hash-linked chains.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirements 12.1, 12.2, 12.3, 12.4
 */
export interface ISchedulingAuditLogger<TID = string> {
  /** Log a scheduling resource creation */
  logCreate(
    resourceId: string,
    appointmentStatus: AppointmentStatus | undefined,
    memberId: TID,
  ): Promise<void>;

  /** Log a scheduling resource read/retrieval */
  logRead(
    resourceId: string,
    appointmentStatus: AppointmentStatus | undefined,
    memberId: TID,
  ): Promise<void>;

  /** Log a scheduling resource update */
  logUpdate(
    resourceId: string,
    appointmentStatus: AppointmentStatus | undefined,
    memberId: TID,
  ): Promise<void>;

  /** Log a scheduling resource deletion */
  logDelete(
    resourceId: string,
    appointmentStatus: AppointmentStatus | undefined,
    memberId: TID,
  ): Promise<void>;

  /** Log a scheduling search operation */
  logSearch(
    searchParams: IAppointmentSearchParams,
    memberId: TID,
  ): Promise<void>;

  /** Log an appointment status transition */
  logStatusTransition(
    appointmentId: string,
    transition: IAppointmentStatusTransition,
    memberId: TID,
  ): Promise<void>;

  /** Log an encounter bridge event (appointment → encounter creation) */
  logEncounterBridge(
    appointmentId: string,
    encounterId: string,
    memberId: TID,
  ): Promise<void>;
}
