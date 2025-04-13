export interface IECIESConsts {
  /** The elliptic curve to use for all ECDSA operations */
  CURVE_NAME: string;

  /** The primary key derivation path for HD wallets */
  PRIMARY_KEY_DERIVATION_PATH: string;

  /** Length of ECDSA signatures in bytes */
  SIGNATURE_SIZE: number;

  /** Length of raw public keys in bytes (without 0x04 prefix) */
  RAW_PUBLIC_KEY_LENGTH: number;

  /** Length of public keys in bytes (with 0x04 prefix) */
  PUBLIC_KEY_LENGTH: number; // RAW_PUBLIC_KEY_LENGTH + 1

  PUBLIC_KEY_MAGIC: number;

  /** Mnemonic strength in bits. This will produce a 32-bit key for ECDSA */
  MNEMONIC_STRENGTH: number;

  /** Symmetric encryption algorithm configuration */
  SYMMETRIC: {
    ALGORITHM: string;
    KEY_BITS: number;
    KEY_SIZE: number; // KEY_BITS / 8
    MODE: string;
  };

  /**
   * Length of the initialization vector
   */
  IV_SIZE: number;
  /**
   * Length of the authentication tag
   */
  AUTH_TAG_SIZE: number;

  /**
   * Maximum length of the data that can be encrypted
   */
  MAX_RAW_DATA_SIZE: number;

  SIMPLE: {
    /**
     * Length of the type (1) + public key (65) + IV (16) + auth tag (16)
     */
    FIXED_OVERHEAD_SIZE: number;
    /**
     * Length of the data length (0 for simple encryption)
     */
    DATA_LENGTH_SIZE: number;
  };

  /**
   * ECIES single recipient
   */
  SINGLE: {
    /**
     * Length of the IV + auth tag + data length + crc16
     */
    FIXED_OVERHEAD_SIZE: number;
    /**
     * Length of the data length
     */
    DATA_LENGTH_SIZE: number;
  };

  /**
   * ECIES multiple recipient
   */
  MULTIPLE: {
    /**
     * Length of the IV + auth tag + data length + recipient count for the overall message
     */
    FIXED_OVERHEAD_SIZE: number;
    /**
     * Length of the encrypted key for each recipient
     */
    ENCRYPTED_KEY_SIZE: number;
    /**
     * Maximum number of recipients for a single message
     * This is limited by the size of the value used to store the recipient count in the header
     */
    MAX_RECIPIENTS: number;
    /**
     * Length of the recipient ID
     */
    RECIPIENT_ID_SIZE: number;
    /**
     * Length of the recipient count
     */
    RECIPIENT_COUNT_SIZE: number;
    /**
     * Length of the data length
     */
    DATA_LENGTH_SIZE: number;
  };
}
