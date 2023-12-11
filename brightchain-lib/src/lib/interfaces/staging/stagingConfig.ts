/**
 * Configuration for the temporary upload staging system.
 * All values have sensible defaults; override via environment variables
 * or constructor injection.
 */
export interface IStagingConfig {
  /** Filesystem directory for staged files */
  stagingDir: string;
  /** Default TTL in seconds (default: 3600 = 1 hour) */
  defaultTtlSeconds: number;
  /** Maximum TTL in seconds (default: 86400 = 24 hours) */
  maxTtlSeconds: number;
  /** Maximum upload file size in bytes (default: 52428800 = 50MB) */
  maxFileSizeBytes: number;
  /** Cleanup interval in milliseconds (default: 300000 = 5 minutes) */
  cleanupIntervalMs: number;
}

export const DEFAULT_STAGING_CONFIG: IStagingConfig = {
  stagingDir: `${process.cwd()}/tmp/staging`,
  defaultTtlSeconds: 3600,
  maxTtlSeconds: 86400,
  maxFileSizeBytes: 50 * 1024 * 1024,
  cleanupIntervalMs: 5 * 60 * 1000,
};
