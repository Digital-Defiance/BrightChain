/**
 * Order ACL Interfaces
 *
 * Extends the BrightChain IPoolACL with order-specific permissions
 * and SMART on FHIR v2 scope mappings.
 *
 * @module orders/access/orderAcl
 */

import type { IPoolACL } from '@brightchain/brightchain-lib';

/**
 * Order-specific permission levels for access control.
 * OrderAdmin implies all other order permissions (OrderRead, OrderWrite, OrderSign).
 *
 * @see Requirement 11.1
 */
export enum OrderPermission {
  OrderRead = 'order:read',
  OrderWrite = 'order:write',
  OrderSign = 'order:sign',
  OrderAdmin = 'order:admin',
}

/**
 * A member's order-specific permissions within the ACL.
 */
export interface IOrderACLMemberPermissions<TID = string> {
  memberId: TID;
  orderPermissions: OrderPermission[];
}

/**
 * Order ACL extending pool-level ACL with order-specific permissions.
 * Follows the IEncounterACL pattern from Module 3.
 */
export interface IOrderACL<TID = string> extends IPoolACL<TID> {
  orderMembers: IOrderACLMemberPermissions<TID>[];
}

/**
 * Check if a member has a specific order permission.
 * OrderAdmin implies all other order permissions (OrderRead, OrderWrite, OrderSign).
 *
 * @see Requirement 11.3
 */
export function hasOrderPermission<TID>(
  acl: IOrderACL<TID>,
  memberId: TID,
  permission: OrderPermission,
): boolean {
  const entry = acl.orderMembers.find((e) => e.memberId === memberId);
  if (!entry) return false;
  if (entry.orderPermissions.includes(OrderPermission.OrderAdmin)) return true;
  return entry.orderPermissions.includes(permission);
}

/** SMART on FHIR v2 scope to OrderPermission mapping */
export interface ISmartOrderScopeMapping {
  scope: string;
  permission: OrderPermission;
}

/** Predefined SMART on FHIR v2 scope mappings for order resources
 * @see Requirement 11.4
 */
export const SMART_ORDER_SCOPE_MAPPINGS: ISmartOrderScopeMapping[] = [
  // Read scopes → OrderRead
  { scope: 'user/ServiceRequest.rs', permission: OrderPermission.OrderRead },
  { scope: 'user/MedicationRequest.rs', permission: OrderPermission.OrderRead },
  { scope: 'user/DiagnosticReport.rs', permission: OrderPermission.OrderRead },
  // Write scopes → OrderWrite
  { scope: 'user/ServiceRequest.cuds', permission: OrderPermission.OrderWrite },
  {
    scope: 'user/MedicationRequest.cuds',
    permission: OrderPermission.OrderWrite,
  },
  {
    scope: 'user/DiagnosticReport.cuds',
    permission: OrderPermission.OrderWrite,
  },
  // Sign scopes → OrderSign (authorizing/signing orders)
  { scope: 'user/ServiceRequest.s', permission: OrderPermission.OrderSign },
  { scope: 'user/MedicationRequest.s', permission: OrderPermission.OrderSign },
  // System admin scope → OrderAdmin
  { scope: 'system/*.*', permission: OrderPermission.OrderAdmin },
];
