/**
 * @enum PermissionFlag
 * @description Atomic permission flags — composable into custom Permission_Sets.
 * These flags form the building blocks of the access control system.
 * Named permission levels (Viewer, Editor, etc.) map to predefined
 * combinations of these flags.
 */
export enum PermissionFlag {
  Read = 'read',
  Write = 'write',
  Delete = 'delete',
  Share = 'share',
  Admin = 'admin',
  Preview = 'preview',
  Comment = 'comment',
  Download = 'download',
  ManageVersions = 'manage_versions',
}
