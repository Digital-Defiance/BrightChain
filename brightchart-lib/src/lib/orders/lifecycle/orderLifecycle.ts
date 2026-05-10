/**
 * Order Lifecycle Interface and FHIR Status Transitions
 *
 * Defines the `IOrderLifecycle<TID>` interface governing order status
 * transitions for ServiceRequest and MedicationRequest resources.
 * Also exports the default FHIR status transition maps as
 * `SERVICE_REQUEST_TRANSITIONS` and `MEDICATION_REQUEST_TRANSITIONS`.
 *
 * @see https://build.fhir.org/valueset-request-status.html
 * @see https://build.fhir.org/valueset-medicationrequest-status.html
 * @module orders/lifecycle/orderLifecycle
 */

import { IOperationOutcome } from '../../fhir/operationOutcome';
import { MedicationRequestStatus, ServiceRequestStatus } from '../enumerations';
import type { IMedicationRequestResource } from '../medicationRequestResource';
import type { IServiceRequestResource } from '../serviceRequestResource';

/**
 * Valid FHIR R4 ServiceRequest status transitions.
 *
 * Each key is a source status; its value is the array of statuses
 * reachable from that source. Every status can also transition to
 * `entered-in-error` (included explicitly in each entry).
 *
 * @see Requirement 6.2
 */
export const SERVICE_REQUEST_TRANSITIONS: Record<
  ServiceRequestStatus,
  ServiceRequestStatus[]
> = {
  [ServiceRequestStatus.Draft]: [
    ServiceRequestStatus.Active,
    ServiceRequestStatus.EnteredInError,
  ],
  [ServiceRequestStatus.Active]: [
    ServiceRequestStatus.OnHold,
    ServiceRequestStatus.Completed,
    ServiceRequestStatus.Revoked,
    ServiceRequestStatus.EnteredInError,
  ],
  [ServiceRequestStatus.OnHold]: [
    ServiceRequestStatus.Active,
    ServiceRequestStatus.Revoked,
    ServiceRequestStatus.EnteredInError,
  ],
  [ServiceRequestStatus.Completed]: [ServiceRequestStatus.EnteredInError],
  [ServiceRequestStatus.Revoked]: [ServiceRequestStatus.EnteredInError],
  [ServiceRequestStatus.EnteredInError]: [],
  [ServiceRequestStatus.Unknown]: [ServiceRequestStatus.EnteredInError],
};

/**
 * Valid FHIR R4 MedicationRequest status transitions.
 *
 * Each key is a source status; its value is the array of statuses
 * reachable from that source. Every status can also transition to
 * `entered-in-error` (included explicitly in each entry).
 *
 * @see Requirement 6.3
 */
export const MEDICATION_REQUEST_TRANSITIONS: Record<
  MedicationRequestStatus,
  MedicationRequestStatus[]
> = {
  [MedicationRequestStatus.Draft]: [
    MedicationRequestStatus.Active,
    MedicationRequestStatus.EnteredInError,
  ],
  [MedicationRequestStatus.Active]: [
    MedicationRequestStatus.OnHold,
    MedicationRequestStatus.Completed,
    MedicationRequestStatus.Cancelled,
    MedicationRequestStatus.Stopped,
    MedicationRequestStatus.EnteredInError,
  ],
  [MedicationRequestStatus.OnHold]: [
    MedicationRequestStatus.Active,
    MedicationRequestStatus.Cancelled,
    MedicationRequestStatus.EnteredInError,
  ],
  [MedicationRequestStatus.Completed]: [MedicationRequestStatus.EnteredInError],
  [MedicationRequestStatus.Cancelled]: [MedicationRequestStatus.EnteredInError],
  [MedicationRequestStatus.Stopped]: [MedicationRequestStatus.EnteredInError],
  [MedicationRequestStatus.EnteredInError]: [],
  [MedicationRequestStatus.Unknown]: [MedicationRequestStatus.EnteredInError],
};

/**
 * Order resource union type for lifecycle operations.
 */
export type OrderResource<TID = string> =
  | IServiceRequestResource<TID>
  | IMedicationRequestResource<TID>;

/**
 * Order status union type for lifecycle operations.
 */
export type OrderStatus = ServiceRequestStatus | MedicationRequestStatus;

/**
 * Order lifecycle state machine interface.
 *
 * Provides FHIR-level status transition validation and execution
 * for ServiceRequest and MedicationRequest resources. Implementations
 * apply transitions, update version history, and return the updated
 * order — or return an `IOperationOutcome` when the transition is
 * invalid.
 *
 * @typeParam TID - Identifier type (defaults to `string`)
 *
 * @see Requirement 6.1, 6.4, 6.5
 */
export interface IOrderLifecycle<TID = string> {
  /**
   * Check whether a status transition is valid for the given
   * order resource type.
   *
   * @param fromStatus - Current order status
   * @param toStatus   - Desired target status
   * @returns `true` if the transition is allowed
   *
   * @see Requirement 6.1
   */
  isValidTransition(fromStatus: OrderStatus, toStatus: OrderStatus): boolean;

  /**
   * Apply a status transition to an order resource.
   *
   * On success the returned order has:
   * - `status` set to `toStatus`
   * - version history updated per Requirement 6.4
   *
   * On failure an `IOperationOutcome` with severity "error" and
   * code "invalid" is returned (e.g. invalid status transition).
   *
   * @param order    - The order resource to transition
   * @param toStatus - Desired target status
   * @param memberId - The member performing the transition
   * @returns Updated order or OperationOutcome
   *
   * @see Requirement 6.1, 6.4
   */
  transition(
    order: OrderResource<TID>,
    toStatus: OrderStatus,
    memberId: TID,
  ): OrderResource<TID> | IOperationOutcome;
}
