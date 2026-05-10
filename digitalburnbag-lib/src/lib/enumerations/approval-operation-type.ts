/**
 * @enum ApprovalOperationType
 * @description Types of operations that can be approval-governed.
 * When a file or folder is marked as approval-governed, these operation
 * types require multi-party approval before execution.
 */
export enum ApprovalOperationType {
  Destruction = 'destruction',
  ExternalShare = 'external_share',
  BulkDelete = 'bulk_delete',
  ACLChange = 'acl_change',
}
