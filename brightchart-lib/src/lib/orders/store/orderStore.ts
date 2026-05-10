/**
 * Order Store Interface
 *
 * Defines the IOrderStore interface for CRUD operations on ServiceRequest,
 * MedicationRequest, and DiagnosticReport resources stored as encrypted
 * blocks in a dedicated BrightChain order/result pool.
 *
 * Follows the IBillingStore / IDocumentStore pattern from other modules,
 * with per-resource-type methods and patient/encounter reference validation.
 *
 * @see Requirements 8.1, 8.2, 8.3, 8.4
 * @module orders/store/orderStore
 */

import type { IDiagnosticReportResource } from '../diagnosticReportResource';
import type { IMedicationRequestResource } from '../medicationRequestResource';
import type { IServiceRequestResource } from '../serviceRequestResource';

/**
 * Order data store interface for ServiceRequest, MedicationRequest, and
 * DiagnosticReport resources.
 *
 * Uses a dedicated BrightChain pool for order/result blocks, separate from
 * the Patient, Clinical, Encounter, and Document pools. Validates patient
 * and encounter references on store operations.
 *
 * @typeParam TID - Identifier type (string for frontend, Uint8Array for backend)
 * @see Requirement 8.1 — CRUD + version history + pool ID for all three resource types
 * @see Requirement 8.2 — Dedicated BrightChain pool for order/result blocks
 * @see Requirement 8.3 — Patient and encounter reference validation on store
 * @see Requirement 8.4 — Generic on TID
 */
export interface IOrderStore<TID = string> {
  // --- ServiceRequest ---

  /**
   * Encrypt and store a ServiceRequest resource.
   *
   * Validates that the patient reference (subject) and optional encounter
   * reference resolve to existing resources before storing.
   *
   * @param resource - The ServiceRequest resource to store
   * @param memberId - The BrightChain member performing the operation
   * @returns The stored resource (with assigned ID / metadata)
   */
  storeServiceRequest(
    resource: IServiceRequestResource<TID>,
    memberId: TID,
  ): Promise<IServiceRequestResource<TID>>;

  /** Retrieve a ServiceRequest resource by ID */
  retrieveServiceRequest(
    id: string,
    memberId: TID,
  ): Promise<IServiceRequestResource<TID>>;

  /** Update an existing ServiceRequest resource */
  updateServiceRequest(
    resource: IServiceRequestResource<TID>,
    memberId: TID,
  ): Promise<IServiceRequestResource<TID>>;

  /** Delete a ServiceRequest resource by ID */
  deleteServiceRequest(id: string, memberId: TID): Promise<void>;

  /** Get version history for a ServiceRequest resource */
  getServiceRequestVersionHistory(
    id: string,
    memberId: TID,
  ): Promise<IServiceRequestResource<TID>[]>;

  // --- MedicationRequest ---

  /**
   * Encrypt and store a MedicationRequest resource.
   *
   * Validates that the patient reference (subject) and optional encounter
   * reference resolve to existing resources before storing.
   *
   * @param resource - The MedicationRequest resource to store
   * @param memberId - The BrightChain member performing the operation
   * @returns The stored resource (with assigned ID / metadata)
   */
  storeMedicationRequest(
    resource: IMedicationRequestResource<TID>,
    memberId: TID,
  ): Promise<IMedicationRequestResource<TID>>;

  /** Retrieve a MedicationRequest resource by ID */
  retrieveMedicationRequest(
    id: string,
    memberId: TID,
  ): Promise<IMedicationRequestResource<TID>>;

  /** Update an existing MedicationRequest resource */
  updateMedicationRequest(
    resource: IMedicationRequestResource<TID>,
    memberId: TID,
  ): Promise<IMedicationRequestResource<TID>>;

  /** Delete a MedicationRequest resource by ID */
  deleteMedicationRequest(id: string, memberId: TID): Promise<void>;

  /** Get version history for a MedicationRequest resource */
  getMedicationRequestVersionHistory(
    id: string,
    memberId: TID,
  ): Promise<IMedicationRequestResource<TID>[]>;

  // --- DiagnosticReport ---

  /**
   * Encrypt and store a DiagnosticReport resource.
   *
   * Validates that the patient reference (subject) and optional encounter
   * reference resolve to existing resources before storing.
   *
   * @param resource - The DiagnosticReport resource to store
   * @param memberId - The BrightChain member performing the operation
   * @returns The stored resource (with assigned ID / metadata)
   */
  storeDiagnosticReport(
    resource: IDiagnosticReportResource<TID>,
    memberId: TID,
  ): Promise<IDiagnosticReportResource<TID>>;

  /** Retrieve a DiagnosticReport resource by ID */
  retrieveDiagnosticReport(
    id: string,
    memberId: TID,
  ): Promise<IDiagnosticReportResource<TID>>;

  /** Update an existing DiagnosticReport resource */
  updateDiagnosticReport(
    resource: IDiagnosticReportResource<TID>,
    memberId: TID,
  ): Promise<IDiagnosticReportResource<TID>>;

  /** Delete a DiagnosticReport resource by ID */
  deleteDiagnosticReport(id: string, memberId: TID): Promise<void>;

  /** Get version history for a DiagnosticReport resource */
  getDiagnosticReportVersionHistory(
    id: string,
    memberId: TID,
  ): Promise<IDiagnosticReportResource<TID>[]>;

  // --- Pool ---

  /**
   * Get the dedicated BrightChain pool identifier for order/result data.
   * @returns The pool identifier
   */
  getPoolId(): TID;
}
