/**
 * Document ACL Interfaces
 *
 * Extends the BrightChain IPoolACL with document-specific permissions
 * (read, write, sign, admin) and SMART on FHIR v2 scope mappings.
 *
 * @module documentation/access/documentAcl
 */

import type { IPoolACL } from '@brightchain/brightchain-lib';

/** Document-specific permission levels */
export enum DocumentPermission {
  DocumentRead = 'document:read',
  DocumentWrite = 'document:write',
  DocumentSign = 'document:sign',
  DocumentAdmin = 'document:admin',
}

/** Document ACL extending pool-level ACL with document permissions */
export interface IDocumentACL<TID = string> extends IPoolACL<TID> {
  documentPermissions: Array<{
    memberId: TID;
    permissions: DocumentPermission[];
  }>;
}

/**
 * Check if a member has a specific document permission.
 * DocumentAdmin implies DocumentRead, DocumentWrite, and DocumentSign.
 */
export function hasDocumentPermission<TID>(
  acl: IDocumentACL<TID>,
  memberId: TID,
  permission: DocumentPermission,
): boolean {
  const entry = acl.documentPermissions.find((e) => e.memberId === memberId);
  if (!entry) return false;
  if (entry.permissions.includes(DocumentPermission.DocumentAdmin)) return true;
  return entry.permissions.includes(permission);
}

/** SMART on FHIR v2 scope to DocumentPermission mapping */
export interface ISmartDocumentScopeMapping {
  scope: string;
  permission: DocumentPermission;
}

/** Predefined SMART scope mappings for document resources */
export const SMART_DOCUMENT_SCOPE_MAPPINGS: ISmartDocumentScopeMapping[] = [
  // Read scopes
  { scope: 'user/Composition.rs', permission: DocumentPermission.DocumentRead },
  {
    scope: 'user/DocumentReference.rs',
    permission: DocumentPermission.DocumentRead,
  },
  // Write scopes
  {
    scope: 'user/Composition.cuds',
    permission: DocumentPermission.DocumentWrite,
  },
  {
    scope: 'user/DocumentReference.cuds',
    permission: DocumentPermission.DocumentWrite,
  },
  // Admin scope
  { scope: 'system/*.*', permission: DocumentPermission.DocumentAdmin },
];
