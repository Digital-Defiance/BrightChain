import { CipherGCMTypes } from 'crypto';
import { IConstants as IConstantsBase, Pbkdf2Profiles, IVotingConsts, IPBkdf2Consts } from '@digitaldefiance/ecies-lib';
import { IBackupCodeConstants } from './backupCodeConsts';
import { ICBLConsts } from './cblConsts';
import { IChecksumConsts } from './checksumConsts';
import { IEncryptionConsts } from './encryptionConsts';
import { IFECConsts } from './fecConsts';
import { IJwtConsts } from './jwtConsts';
import { IKeyringConsts } from './keyringConsts';
import { ISealingConsts } from './sealingConsts';
import { ISiteConsts } from './siteConsts';
import { ITupleConsts } from './tupleConsts';

/**
 * BrightChain Constants Interface
 * 
 * This interface extends base constants from @digitaldefiance/ecies-lib
 * and adds BrightChain-specific constants for blockchain operations.
 * 
 * Base constants (from @digitaldefiance/ecies-lib):
 * - PBKDF2: Password-based key derivation configuration
 * - ECIES: Elliptic Curve Integrated Encryption Scheme settings
 * - CHECKSUM: SHA3 checksum configuration
 * - ENCRYPTION: Base encryption settings
 * - KEYRING: Keyring algorithm configuration
 * - VOTING: Paillier homomorphic encryption for voting
 * 
 * BrightChain-specific constants:
 * - CBL: Constituent Block List operations
 * - FEC: Forward Error Correction
 * - TUPLE: Tuple operations
 * - SEALING: Sealing operations
 * - SITE: Site-specific configuration
 * - JWT: JWT configuration
 * 
 * @see {@link https://github.com/Digital-Defiance/ecies-lib} for base constants
 * @interface IConstants
 * @extends {IConstantsBase}
 */
export interface IConstants extends IConstantsBase {
  PBKDF2_PROFILES: Pbkdf2Profiles;
  BACKUP_CODES: IBackupCodeConstants;
  CBL: ICBLConsts;
  OFFS_CACHE_PERCENTAGE: number;
  FEC: IFECConsts;
  CHECKSUM: IChecksumConsts;
  ENCRYPTION: IEncryptionConsts;
  TUPLE: ITupleConsts;
  VOTING: IVotingConsts;
  KEYRING: IKeyringConsts;
  SEALING: ISealingConsts;
  JWT: IJwtConsts;
  SITE: ISiteConsts;
  PBKDF2: IPBkdf2Consts;
  ECIES_OVERHEAD_LENGTH: number;
  ECIES_MULTIPLE_MESSAGE_OVERHEAD_LENGTH: number;
  KEYRING_ALGORITHM_CONFIGURATION: CipherGCMTypes;
  SYMMETRIC_ALGORITHM_CONFIGURATION: CipherGCMTypes;
  UINT8_SIZE: number;
  UINT16_SIZE: number;
  UINT16_MAX: number;
  UINT32_SIZE: number;
  UINT32_MAX: number;
  UINT64_SIZE: number;
  UINT64_MAX: bigint;
  HEX_RADIX: number;
  GUID_SIZE: number;
}
