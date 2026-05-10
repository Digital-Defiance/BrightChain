import { IAccessContext } from './access-context';

/**
 * Extended access context capturing HTTP request metadata.
 * Used by the vault access audit middleware to record full request details.
 */
export interface IHttpAccessContext extends IAccessContext {
  /** HTTP method (GET, POST, etc.) */
  httpMethod: string;
  /** Request endpoint path (e.g., /api/servers/:serverId/icon) */
  endpointPath: string;
  /** User-Agent header value */
  userAgent: string;
}
