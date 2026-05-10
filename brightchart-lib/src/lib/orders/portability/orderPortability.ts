/**
 * Order Portability Interfaces
 *
 * Extends the document export bundle with ServiceRequest, MedicationRequest,
 * DiagnosticReport, and order-result link arrays for full-fidelity order
 * and result data migration.
 *
 * The canonical `IOrderExportBundle` definition lives in the serializer
 * module (`serializer/orderSerializer.ts`). This module re-exports it
 * so consumers can import from the portability path without pulling in
 * serializer-specific types.
 *
 * @see Requirements 15.1, 15.2
 * @module orders/portability/orderPortability
 */

export type { IOrderExportBundle } from '../serializer/orderSerializer';
