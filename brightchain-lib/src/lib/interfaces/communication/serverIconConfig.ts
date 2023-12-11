/**
 * Platform-level configuration for server icon uploads.
 *
 * Defines constraints for icon file uploads including size limits,
 * output dimensions, and allowed MIME types.
 *
 * Requirements: 2.2, 2.3, 2.4
 */

/** Configuration for server icon upload and processing. */
export interface IServerIconConfig {
  /** Maximum raw upload size in bytes */
  maxFileSizeBytes: number;
  /** Output dimensions (square) in pixels */
  outputSizePx: number;
  /** Allowed input MIME types */
  allowedMimeTypes: string[];
  /** Output MIME type after processing */
  outputMimeType: string;
}

/** Default server icon configuration: 5MB max, 256px square, PNG output. */
export const DEFAULT_SERVER_ICON_CONFIG: IServerIconConfig = {
  maxFileSizeBytes: 5 * 1024 * 1024, // 5MB
  outputSizePx: 256,
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  outputMimeType: 'image/png',
};

/**
 * Returns true if the given MIME type is allowed for server icon uploads.
 * @param mimeType - The MIME type string to check
 */
export function isAllowedIconMimeType(mimeType: string): boolean {
  return DEFAULT_SERVER_ICON_CONFIG.allowedMimeTypes.includes(mimeType);
}

/**
 * Returns true if the given file size (in bytes) is within the allowed limit.
 * @param sizeBytes - The file size in bytes to check
 */
export function isAllowedIconFileSize(sizeBytes: number): boolean {
  return sizeBytes <= DEFAULT_SERVER_ICON_CONFIG.maxFileSizeBytes;
}
