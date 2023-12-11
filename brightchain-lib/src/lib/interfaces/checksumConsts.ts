export interface IChecksumConsts {
  /** Default hash bits for SHA3 */
  SHA3_DEFAULT_HASH_BITS: number;

  /** Length of a SHA3 checksum buffer in bytes */
  SHA3_BUFFER_LENGTH: number;

  /** algorithm to use for checksum */
  ALGORITHM: 'sha3-512';

  /** encoding to use for checksum */
  ENCODING: 'hex';
}
