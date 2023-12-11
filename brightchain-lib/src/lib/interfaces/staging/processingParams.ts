/**
 * Optional image transformation parameters supplied at commit time.
 * Processing is deferred to commit so the same staged file can be
 * committed with different transformations.
 */
export interface IProcessingParams {
  /** Target width in pixels */
  width?: number;
  /** Target height in pixels */
  height?: number;
  /** Output format */
  format?: 'png' | 'jpeg' | 'webp';
  /** Whether to strip EXIF/XMP/IPTC metadata */
  stripExif?: boolean;
}
