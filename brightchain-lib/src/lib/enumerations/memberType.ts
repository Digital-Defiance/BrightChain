/**
 * Types of members in the system.
 * In the Owner Free Filesystem (OFF), members can be:
 * 1. Admin - System administrators
 * 2. System - System services and automated processes
 * 3. User - Regular users
 * 4. Anonymous - Used for blocks that don't need a real owner
 */
export enum MemberType {
  Admin = 'Admin',
  System = 'System',
  User = 'User',
}

export default MemberType;
