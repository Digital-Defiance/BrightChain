export interface IChecksumConsts {
  /** Default hash bits for SHA3 */
  SHA3_DEFAULT_HASH_BITS: number;

  /** Length of a SHA3 checksum buffer in bytes */
  SHA3_BUFFER_LENGTH: number;

  /** Algorithm name for checksums */
  ALGORITHM: string;

  /** Encoding for checksums */
  ENCODING: 'hex' | 'base64';
}
