/**
 * Clinical Audit Interfaces
 *
 * Extends the Module 1 IAuditLogEntry with clinical-specific fields
 * for resource type, clinical resource ID, and search parameters.
 *
 * @module clinical/audit/clinicalAudit
 */

import type { IAuditLogEntry } from '../../audit/auditLog';
import type { ClinicalResourceType } from '../resources/index';
import type { IClinicalSearchParams } from '../search/clinicalSearch';

/** Clinical audit operation types */
export enum ClinicalAuditOperationType {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
  Search = 'search',
}

/**
 * Clinical audit entry extending the Module 1 audit log entry.
 * Forms a hash-linked chain per clinical resource via previousEntryBlockId.
 * Omits the patient-specific searchParams and replaces with clinical search params.
 */
export interface IClinicalAuditEntry<TID = string>
  extends Omit<IAuditLogEntry<TID>, 'searchParams'> {
  /** The clinical resource type */
  resourceType: ClinicalResourceType;
  /** Clinical resource ID (undefined for search operations) */
  clinicalResourceId?: string;
  /** Search parameters (present for search operations) */
  searchParams?: IClinicalSearchParams;
}

/**
 * Clinical audit logger interface for recording all clinical data operations.
 */
export interface IClinicalAuditLogger<TID = string> {
  logCreate(
    resourceType: ClinicalResourceType,
    resourceId: string,
    memberId: TID,
  ): Promise<void>;
  logRead(
    resourceType: ClinicalResourceType,
    resourceId: string,
    memberId: TID,
  ): Promise<void>;
  logUpdate(
    resourceType: ClinicalResourceType,
    resourceId: string,
    memberId: TID,
  ): Promise<void>;
  logDelete(
    resourceType: ClinicalResourceType,
    resourceId: string,
    memberId: TID,
  ): Promise<void>;
  logSearch(
    resourceType: ClinicalResourceType,
    searchParams: IClinicalSearchParams,
    memberId: TID,
  ): Promise<void>;
}
