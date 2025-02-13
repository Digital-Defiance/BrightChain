import { ICBLConsts } from './cblConsts';
import { IChecksumConsts } from './checksumConsts';
import { IECIESConsts } from './eciesConsts';
import { IFECConsts } from './fecConsts';
import { IJwtConsts } from './jwtConsts';
import { IKeyringConsts } from './keyringConsts';
import { IPBkdf2Consts } from './pbkdf2Consts';
import { ISealingConsts } from './sealingConsts';
import { ISiteConsts } from './siteConsts';
import { ITupleConsts } from './tupleConsts';
import { IVotingConsts } from './votingConsts';

export interface IConstants {
  CBL: ICBLConsts;
  OFFS_CACHE_PERCENTAGE: number;
  ECIES: IECIESConsts;
  FEC: IFECConsts;
  CHECKSUM: IChecksumConsts;
  TUPLE: ITupleConsts;
  VOTING: IVotingConsts;
  KEYRING: IKeyringConsts;
  SEALING: ISealingConsts;
  PBKDF2: IPBkdf2Consts;
  JWT: IJwtConsts;
  SITE: ISiteConsts;
  ECIES_OVERHEAD_LENGTH: number;
  ECIES_MULTIPLE_MESSAGE_OVERHEAD_LENGTH: number;
  KEYRING_ALGORITHM_CONFIGURATION: string;
  SYMMETRIC_ALGORITHM_CONFIGURATION: string;
  UINT8_SIZE: number;
  UINT16_SIZE: number;
  UINT16_MAX: number;
  UINT32_SIZE: number;
  UINT32_MAX: number;
  UINT64_SIZE: number;
  UINT64_MAX: bigint;
  HEX_RADIX: number;
}
