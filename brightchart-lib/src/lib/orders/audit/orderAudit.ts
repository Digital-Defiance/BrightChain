/**
 * Order Audit Interfaces
 *
 * Extends the Module 2 IClinicalAuditEntry with order-specific fields
 * for order status, intent, and status transitions. Provides a logger
 * interface for recording all order operations including signing,
 * status transitions, and result linking.
 *
 * Audit entries are stored in the shared audit pool with hash-linked
 * chains per order resource. Entries are append-only.
 *
 * @see Requirement 12: Order Audit Trail
 * @module orders/audit/orderAudit
 */

import type { IClinicalAuditEntry } from '../../clinical/audit/clinicalAudit';
import type {
  MedicationRequestIntent,
  MedicationRequestStatus,
  ServiceRequestIntent,
  ServiceRequestStatus,
} from '../enumerations';
import type { IOrderSearchParams } from '../search/orderSearch';

/**
 * Union of order status types tracked in audit entries.
 */
export type AuditableOrderStatus =
  | ServiceRequestStatus
  | MedicationRequestStatus;

/**
 * Union of order intent types tracked in audit entries.
 */
export type AuditableOrderIntent =
  | ServiceRequestIntent
  | MedicationRequestIntent;

/**
 * Status transition details captured in an order audit entry.
 * Present when the audited operation involved a status change.
 */
export interface IOrderStatusTransition {
  /** The order status before the transition */
  fromStatus: AuditableOrderStatus;
  /** The order status after the transition */
  toStatus: AuditableOrderStatus;
}

/**
 * Order audit entry extending the clinical audit entry with
 * order-specific status, intent, and transition tracking.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirements 12.1, 12.2
 */
export interface IOrderAuditEntry<TID = string>
  extends IClinicalAuditEntry<TID> {
  /** The order's FHIR status at the time of the operation */
  orderStatus: AuditableOrderStatus;

  /** The order's FHIR intent at the time of the operation */
  orderIntent: AuditableOrderIntent;

  /** Status transition details, present when the operation changed the order status */
  statusTransition?: IOrderStatusTransition;
}

/**
 * Order audit logger interface for recording all order operations.
 *
 * Follows the IClinicalAuditLogger / IEncounterAuditLogger pattern,
 * adding methods for order-specific operations: signing, status
 * transitions, and result linking.
 *
 * All entries are append-only and stored in the shared audit pool
 * with hash-linked chains.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirements 12.1, 12.2, 12.3, 12.4
 */
export interface IOrderAuditLogger<TID = string> {
  /** Log an order creation */
  logCreate(
    orderId: string,
    orderStatus: AuditableOrderStatus,
    orderIntent: AuditableOrderIntent,
    memberId: TID,
  ): Promise<void>;

  /** Log an order read/retrieval */
  logRead(
    orderId: string,
    orderStatus: AuditableOrderStatus,
    orderIntent: AuditableOrderIntent,
    memberId: TID,
  ): Promise<void>;

  /** Log an order update */
  logUpdate(
    orderId: string,
    orderStatus: AuditableOrderStatus,
    orderIntent: AuditableOrderIntent,
    memberId: TID,
  ): Promise<void>;

  /** Log an order deletion */
  logDelete(
    orderId: string,
    orderStatus: AuditableOrderStatus,
    orderIntent: AuditableOrderIntent,
    memberId: TID,
  ): Promise<void>;

  /** Log an order search operation */
  logSearch(searchParams: IOrderSearchParams, memberId: TID): Promise<void>;

  /** Log an order signing/authorization event */
  logSign(
    orderId: string,
    orderStatus: AuditableOrderStatus,
    orderIntent: AuditableOrderIntent,
    memberId: TID,
  ): Promise<void>;

  /** Log an order status transition */
  logStatusTransition(
    orderId: string,
    transition: IOrderStatusTransition,
    orderIntent: AuditableOrderIntent,
    memberId: TID,
  ): Promise<void>;

  /** Log a result linking event (order ↔ DiagnosticReport/Observation) */
  logResultLinking(
    orderId: string,
    resultId: string,
    orderStatus: AuditableOrderStatus,
    orderIntent: AuditableOrderIntent,
    memberId: TID,
  ): Promise<void>;
}
