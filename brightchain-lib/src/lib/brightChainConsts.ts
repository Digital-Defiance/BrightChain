import { ECIES } from '@digitaldefiance/ecies-lib';

export const BRIGHTCHAIN_ECIES = {
  ...ECIES,
  PUBLIC_KEY_MAGIC: 0x04,
  PUBLIC_KEY_LENGTH: 65, // Uncompressed public key: 1 byte prefix + 32 bytes x + 32 bytes y
  // Actual overhead for encryptSimpleOrSingle is 64 bytes:
  // 33 (public key) + 12 (IV) + 16 (auth tag) + 3 (header bytes) = 64
  OVERHEAD_SIZE: 64,
  SIGNATURE_LENGTH: 64,
  IV_LENGTH: ECIES.IV_SIZE,
  AUTH_TAG_LENGTH: ECIES.AUTH_TAG_SIZE,
  SYMMETRIC: {
    ...ECIES.SYMMETRIC,
    KEY_LENGTH: 32,
  },
  MULTIPLE: {
    ...ECIES.MULTIPLE,
    ENCRYPTED_KEY_SIZE: 65,
    ENCRYPTED_MESSAGE_OVERHEAD_SIZE: 28,
    FIXED_OVERHEAD_SIZE: 1,
  },
};
