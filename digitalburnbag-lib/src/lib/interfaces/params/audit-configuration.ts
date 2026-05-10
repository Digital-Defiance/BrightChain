/**
 * Per-route audit configuration passed to the middleware factory.
 */
export interface IRouteAuditConfig {
  /** Whether audit logging is enabled for this route. Defaults to true. */
  enabled?: boolean;
  /** When true, only log failed accesses (denied, not_found, error). Defaults to false. */
  failuresOnly?: boolean;
  /**
   * Optional rate limit. When set, limits the number of audit entries
   * written per time window for this route.
   */
  rateLimit?: {
    /** Maximum entries per window */
    maxEntries: number;
    /** Window duration in milliseconds */
    windowMs: number;
  };
}

/**
 * Global audit configuration.
 */
export interface IGlobalAuditConfig {
  /** Master switch: when false, all audit logging is disabled regardless of per-route settings. */
  enabled: boolean;
}
