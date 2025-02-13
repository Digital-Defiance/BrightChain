export interface IECIESConsts {
  /** The elliptic curve to use for all ECDSA operations */
  CURVE_NAME: string;

  /** The primary key derivation path for HD wallets */
  PRIMARY_KEY_DERIVATION_PATH: string;

  /** Length of the authentication tag in bytes */
  AUTH_TAG_LENGTH: number;

  /** Length of the initialization vector in bytes */
  IV_LENGTH: number;

  /** Length of ECDSA signatures in bytes */
  SIGNATURE_LENGTH: number;

  /** Length of raw public keys in bytes (without 0x04 prefix) */
  RAW_PUBLIC_KEY_LENGTH: number;

  /** Length of public keys in bytes (with 0x04 prefix) */
  PUBLIC_KEY_LENGTH: number; // RAW_PUBLIC_KEY_LENGTH + 1

  PUBLIC_KEY_MAGIC: number;

  /** Mnemonic strength in bits. This will produce a 32-bit key for ECDSA */
  MNEMONIC_STRENGTH: number;

  OVERHEAD_SIZE: number;

  /** Symmetric encryption algorithm configuration */
  SYMMETRIC: {
    ALGORITHM: string;
    KEY_BITS: number;
    KEY_LENGTH: number; // KEY_BITS / 8
    MODE: string;
  };

  /**
   * ECIES multiple recipient
   */
  MULTIPLE: {
    OVERHEAD_SIZE: number;
  };
}
