import { IPBkdf2Consts } from '@brightchain/brightchain-lib';
import { CipherGCMTypes } from 'crypto';
import { IChecksumConsts } from './checksum-consts';
import { IEncryptionConsts } from './encryption-consts';
import { IFECConsts } from './fec-consts';
import { IKeyringConsts } from './keyring-consts';
import { PbkdfProfiles } from './pbkdf-profiles';
import { IWrappedKeyConsts } from './wrapped-key-consts';

export interface IApiConstants {
  /**
   * PBKDF2 key derivation function constants
   */
  PBKDF2: IPBkdf2Consts;
  /**
   * Predefined PBKDF2 configuration profiles for different use cases
   */
  PBKDF2_PROFILES: PbkdfProfiles;
  /**
   * Checksum constants used for data integrity
   */
  CHECKSUM: IChecksumConsts;
  /**
   * Wrapped Key constants used for the key wrapping service
   */
  WRAPPED_KEY: IWrappedKeyConsts;
  /**
   * Forward Error Correction constants used for data recovery
   */
  FEC: IFECConsts;
  /**
   * Keyring constants used for key management
   */
  KEYRING: IKeyringConsts;
  /**
   * Encryption constants used for encrypted data
   */
  ENCRYPTION: IEncryptionConsts;
  /**
   * Algorithm configuration string for keyring operations
   */
  KEYRING_ALGORITHM_CONFIGURATION: CipherGCMTypes;
}
