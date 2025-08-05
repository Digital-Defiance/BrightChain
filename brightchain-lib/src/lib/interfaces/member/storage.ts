import { MemberType } from '../../enumerations/memberType';

/**
 * Storage format for member data - all serializable types
 */
export interface IMemberStorageData {
  id: string;
  type: MemberType;
  name: string;
  email: string;
  publicKey: string; // base64
  votingPublicKey: string; // base64
  creatorId: string;
  dateCreated: string; // ISO string
  dateUpdated: string; // ISO string
}

/**
 * Extended storage format for test member data
 */
export interface ITestMemberStorageData extends IMemberStorageData {
  mnemonic?: string;
}
