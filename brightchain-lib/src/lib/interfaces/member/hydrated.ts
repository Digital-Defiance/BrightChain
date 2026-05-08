import {
  EmailString,
  MemberType,
  PlatformID,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import { PublicKey } from 'paillier-bigint';
import type { BrightDateTimestamp } from '../../types/brightDateTimestamp';

/**
 * Hydrated format for member data - after basic type conversion but before operational
 */
export interface IMemberHydratedData<TID extends PlatformID = Uint8Array> {
  id: TID;
  type: MemberType;
  name: string;
  email: EmailString;
  publicKey: Uint8Array;
  votingPublicKey?: PublicKey;
  creatorId: TID;
  dateCreated: BrightDateTimestamp;
  dateUpdated: BrightDateTimestamp;
}

/**
 * Extended hydrated format for test member data
 */
export interface ITestMemberHydratedData extends IMemberHydratedData {
  mnemonic?: SecureString;
}
