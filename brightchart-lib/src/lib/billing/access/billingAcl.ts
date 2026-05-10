/**
 * Billing ACL Interfaces
 *
 * Defines billing-specific permissions, ACL interface extending IPoolACL,
 * permission check function signature, and SMART on FHIR v2 scope mappings.
 *
 * @see Requirements 16.1, 16.2, 16.3, 16.4
 * @module billing/access/billingAcl
 */

import type { IPoolACL } from '@brightchain/brightchain-lib';

/**
 * Billing-specific permission levels.
 *
 * @see Requirement 16.1
 */
export enum BillingPermission {
  BillingRead = 'billing:read',
  BillingWrite = 'billing:write',
  BillingSubmit = 'billing:submit',
  BillingAdmin = 'billing:admin',
}

/**
 * A member's billing-specific permissions within the ACL.
 *
 * @typeParam TID - Identifier type (defaults to string)
 */
export interface IBillingACLMemberPermissions<TID = string> {
  memberId: TID;
  billingPermissions: BillingPermission[];
}

/**
 * Billing ACL extending IPoolACL with billing-specific permission levels.
 *
 * @typeParam TID - Identifier type (defaults to string)
 * @see Requirement 16.2
 */
export interface IBillingACL<TID = string> extends IPoolACL<TID> {
  billingMembers: IBillingACLMemberPermissions<TID>[];
}

/**
 * Check whether a member has a specific billing permission.
 * BillingAdmin implies all other billing permissions.
 *
 * @see Requirement 16.3
 */
export function hasBillingPermission<TID = string>(
  acl: IBillingACL<TID>,
  memberId: TID,
  permission: BillingPermission,
): boolean {
  const member = acl.billingMembers.find((m) => m.memberId === memberId);
  if (!member) return false;
  if (member.billingPermissions.includes(BillingPermission.BillingAdmin))
    return true;
  return member.billingPermissions.includes(permission);
}

/**
 * SMART on FHIR v2 scope mappings for billing permissions.
 *
 * @see Requirement 16.4
 */
export const BILLING_SMART_SCOPES: Record<BillingPermission, string> = {
  [BillingPermission.BillingRead]:
    'patient/Coverage.read patient/Claim.read patient/ExplanationOfBenefit.read',
  [BillingPermission.BillingWrite]:
    'patient/Coverage.write patient/Claim.write',
  [BillingPermission.BillingSubmit]:
    'patient/Claim.write patient/CoverageEligibilityRequest.write',
  [BillingPermission.BillingAdmin]:
    'patient/Coverage.* patient/Claim.* patient/ExplanationOfBenefit.*',
};
