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
   * Max ECBL file name length
   */
  MAX_FILE_NAME_LENGTH: number;
  /**
   * Max ECBL MIME type length
   */
  MAX_MIME_TYPE_LENGTH: number;
}
