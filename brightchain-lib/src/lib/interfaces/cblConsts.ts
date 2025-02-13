export interface ICBLConsts {
  /**
   * Base header size for CBL
   */
  BASE_OVERHEAD: number;
  /**
   * MIME validation pattern
   */
  MIME_TYPE_PATTERN: RegExp;
  /**
   * File name validation pattern
   */
  FILE_NAME_PATTERN: RegExp;
  /**
   * File name path traversal pattern
   */
  FILE_NAME_TRAVERSAL_PATTERN: RegExp;
  /**
   * Maximum allowed length for file names in Encrypted Content-Based Layer (ECBL).
   * This limit (typically around 255 characters) aligns with common file system standards
   * and helps mitigate risks such as denial of service attacks.
   */
  MAX_FILE_NAME_LENGTH: number;
  /**
   * Maximum allowed length for MIME types in Encrypted Content-Based Layer (ECBL).
   * This constraint is based on standard MIME type lengths, ensuring room for custom
   * parameters while preventing misuse.
   */
  MAX_MIME_TYPE_LENGTH: number;
  /**
   * 9,007,199,254,740,991 bytes
   */
  MAX_INPUT_FILE_SIZE: number;
}
