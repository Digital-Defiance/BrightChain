/**
 * Order Serializer Interfaces
 *
 * Serializer interfaces for ServiceRequest, MedicationRequest,
 * DiagnosticReport, and order export bundles. Guarantees round-trip
 * fidelity: serialize → deserialize → serialize produces byte-identical
 * JSON output. Undefined/null fields are omitted; dates follow FHIR R4
 * formatting.
 *
 * @see Requirements 10.1, 10.2, 10.3, 15.3
 * @module orders/serializer/orderSerializer
 */

import type { IDocumentExportBundle } from '../../documentation/portability/documentPortability';
import type { IDiagnosticReportResource } from '../diagnosticReportResource';
import type { IOrderResultLink } from '../linking/orderResultLink';
import type { IMedicationRequestResource } from '../medicationRequestResource';
import type { IServiceRequestResource } from '../serviceRequestResource';

/**
 * Serializer for ServiceRequest resources.
 * Guarantees round-trip fidelity for FHIR R4 JSON.
 *
 * - Omits undefined/null fields from serialized output
 * - Dates follow FHIR R4 dateTime formatting
 *
 * @see Requirement 10.1, 10.2, 10.3
 */
export interface IServiceRequestSerializer {
  /** Serialize a ServiceRequest resource to FHIR R4 JSON */
  serialize(resource: IServiceRequestResource): string;
  /** Deserialize FHIR R4 JSON to a ServiceRequest resource */
  deserialize(json: string): IServiceRequestResource;
}

/**
 * Serializer for MedicationRequest resources.
 * Guarantees round-trip fidelity for FHIR R4 JSON.
 *
 * - Omits undefined/null fields from serialized output
 * - Dates follow FHIR R4 dateTime formatting
 *
 * @see Requirement 10.1, 10.2, 10.3
 */
export interface IMedicationRequestSerializer {
  /** Serialize a MedicationRequest resource to FHIR R4 JSON */
  serialize(resource: IMedicationRequestResource): string;
  /** Deserialize FHIR R4 JSON to a MedicationRequest resource */
  deserialize(json: string): IMedicationRequestResource;
}

/**
 * Serializer for DiagnosticReport resources.
 * Guarantees round-trip fidelity for FHIR R4 JSON.
 *
 * - Omits undefined/null fields from serialized output
 * - Dates follow FHIR R4 dateTime formatting
 *
 * @see Requirement 10.1, 10.2, 10.3
 */
export interface IDiagnosticReportSerializer {
  /** Serialize a DiagnosticReport resource to FHIR R4 JSON */
  serialize(resource: IDiagnosticReportResource): string;
  /** Deserialize FHIR R4 JSON to a DiagnosticReport resource */
  deserialize(json: string): IDiagnosticReportResource;
}

/**
 * Order export bundle extending the document export bundle with
 * order-specific resource arrays and order-result links.
 *
 * This type is defined here for use by the bundle serializer.
 * The portability module (task 13) may re-export or extend this type.
 *
 * @see Requirement 15.1, 15.2
 */
export interface IOrderExportBundle<TID = string>
  extends IDocumentExportBundle<TID> {
  /** ServiceRequest resources in this export */
  serviceRequests: IServiceRequestResource<TID>[];
  /** MedicationRequest resources in this export */
  medicationRequests: IMedicationRequestResource<TID>[];
  /** DiagnosticReport resources in this export */
  diagnosticReports: IDiagnosticReportResource<TID>[];
  /** Order-to-result links preserving referential integrity */
  orderResultLinks: IOrderResultLink<TID>[];
}

/**
 * Serializer for order export/import bundles.
 * Guarantees round-trip fidelity for the entire bundle,
 * preserving all references between orders, results, patients,
 * encounters, and clinical resources.
 *
 * @see Requirement 15.3
 */
export interface IOrderBundleSerializer {
  /** Serialize an order export bundle to JSON */
  serialize(bundle: IOrderExportBundle): string;
  /** Deserialize JSON to an order export bundle */
  deserialize(json: string): IOrderExportBundle;
}
