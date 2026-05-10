/**
 * Portability Standard Types
 *
 * Defines the IBrightChartExportBundle interface for full-fidelity
 * import/export of patient demographics, audit trails, access policies,
 * and role definitions.
 *
 * @see Design: Open portability standard
 * @module portability/portabilityTypes
 */

import type { IPatientACL } from '../access/patientAcl';
import type { IAuditLogEntry } from '../audit/auditLog';
import type { IPatientResource } from '../fhir/patientResource';
import type { IHealthcareRole } from '../roles/healthcareRole';

/**
 * A complete export bundle for the BrightChart Patient Records Portability Standard.
 *
 * Supports medical, dental, and veterinary practices with full-fidelity
 * import/export of patient data, audit trails, access policies, and roles.
 *
 * @typeParam TID - The identifier type, defaults to string (frontend) but can be Uint8Array (backend)
 */
export interface IBrightChartExportBundle<TID = string> {
  /** Portability standard version (semver) */
  version: string;

  /** Date the export was generated */
  exportDate: Date;

  /** Identifier of the source system that produced this export */
  sourceSystem: string;

  /** Array of patient resources included in the export */
  patients: IPatientResource<TID>[];

  /** Audit trail entries for the exported patients */
  auditTrail: IAuditLogEntry<TID>[];

  /** Access control policies governing the exported patient data */
  accessPolicies: IPatientACL<TID>[];

  /** Healthcare role definitions from the source system */
  roles: IHealthcareRole<TID>[];

  /** Arbitrary key-value metadata for extensibility */
  metadata: Record<string, unknown>;
}
