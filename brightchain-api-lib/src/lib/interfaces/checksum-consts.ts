export interface IChecksumConsts {
  /** Default hash bits for SHA3 */
  SHA3_DEFAULT_HASH_BITS: number;

  /** Length of a SHA3 checksum array in bytes */
  SHA3_ARRAY_LENGTH: number;

  /** Algorithm name for checksums */
  ALGORITHM: string;

  /** Encoding for checksums */
  ENCODING: 'hex' | 'base64';
}
