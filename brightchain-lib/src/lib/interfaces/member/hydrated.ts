import { PrivateKey, PublicKey } from 'paillier-bigint';
import { EmailString } from '../../emailString';
import { MemberType } from '../../enumerations/memberType';
import { GuidV4 } from '../../guid';
import { SecureString } from '../../secureString';

/**
 * Hydrated format for member data - after basic type conversion but before operational
 */
export interface IMemberHydratedData {
  id: GuidV4;
  type: MemberType;
  name: string;
  email: EmailString;
  publicKey: Buffer;
  privateKey?: Buffer;
  votingPublicKey: PublicKey;
  votingPrivateKey?: PrivateKey;
  creatorId: GuidV4;
  dateCreated: Date;
  dateUpdated: Date;
}

/**
 * Extended hydrated format for test member data
 */
export interface ITestMemberHydratedData extends IMemberHydratedData {
  mnemonic?: SecureString;
}
