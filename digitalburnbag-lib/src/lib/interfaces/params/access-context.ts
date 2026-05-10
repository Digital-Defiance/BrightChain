/**
 * Context information for access control evaluation.
 */
export interface IAccessContext {
  ipAddress: string;
  timestamp: Date;
  /** For share link access */
  shareLinkToken?: string;
  shareLinkPassword?: string;
}
