import {
  EmailString,
  GuidV4,
  SecureBuffer,
  SecureString,
  SignatureUint8Array,
} from '@digitaldefiance/ecies-lib';
import { Wallet } from '@ethereumjs/wallet';
import { PrivateKey, PublicKey } from 'paillier-bigint';
import { MemberType } from '../../enumerations/memberType';

/**
 * Operational interface for member - defines getters and methods
 */
export interface IMemberOperational {
  // Required getters - id is now GuidV4 (guidId is an alias for compatibility)
  get id(): Buffer;
  get guidId(): GuidV4;
  get type(): MemberType;
  get name(): string;
  get email(): EmailString;
  get publicKey(): Buffer;
  get votingPublicKey(): PublicKey;
  get creatorId(): Buffer;
  get guidCreatorId(): GuidV4;
  get dateCreated(): Date;
  get dateUpdated(): Date;

  // Optional private data getters
  get privateKey(): SecureBuffer | undefined;
  get votingPrivateKey(): PrivateKey | undefined;
  get wallet(): Wallet | undefined;

  // State getters
  get hasPrivateKey(): boolean;
  get hasVotingPrivateKey(): boolean;

  // Methods
  sign(data: Buffer): SignatureUint8Array;
  verify(signature: SignatureUint8Array, data: Buffer): boolean;
  encryptData(data: string | Buffer): Buffer;
  decryptData(encryptedData: Buffer): Buffer;
  toJson(): string;

  // Private key management
  loadWallet(mnemonic: SecureString): void;
  unloadPrivateKey(): void;
  unloadWallet(): void;
  unloadWalletAndPrivateKey(): void;
  deriveVotingKeyPair(): void;
}

/**
 * Extended operational interface for test members
 */
export interface ITestMemberOperational extends IMemberOperational {
  get mnemonic(): SecureString | undefined;
  get votingKeyPair(): { publicKey: PublicKey; privateKey: PrivateKey };
}
