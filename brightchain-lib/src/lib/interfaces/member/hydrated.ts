import { PublicKey } from 'paillier-bigint';
import { EmailString, GuidV4, SecureString } from '@digitaldefiance/ecies-lib';
import { MemberType } from '../../enumerations/memberType';

/**
 * Hydrated format for member data - after basic type conversion but before operational
 */
export interface IMemberHydratedData {
  id: GuidV4;
  type: MemberType;
  name: string;
  email: EmailString;
  publicKey: Buffer;
  votingPublicKey: PublicKey;
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
