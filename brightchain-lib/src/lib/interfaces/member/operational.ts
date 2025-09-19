import Wallet from 'ethereumjs-wallet';
import { PrivateKey, PublicKey } from 'paillier-bigint';
import { EmailString } from '../../emailString';
import { MemberType } from '../../enumerations/memberType';
import { GuidV4 } from '../../guid';
import { SecureString } from '../../secureString';
import { SignatureUint8Array } from '../../types';

/**
 * Operational interface for member - defines getters and methods
 */
export interface IBrightChainMemberOperational {
  // Required getters
  get id(): GuidV4;
  get type(): MemberType;
  get name(): string;
  get email(): EmailString;
  get publicKey(): Buffer;
  get votingPublicKey(): PublicKey;
  get creatorId(): GuidV4;
  get dateCreated(): Date;
  get dateUpdated(): Date;

  // Optional private data getters
  get privateKey(): Buffer | undefined;
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
export interface ITestBrightChainMemberOperational
  extends IBrightChainMemberOperational {
  get mnemonic(): SecureString | undefined;
  get votingKeyPair(): { publicKey: PublicKey; privateKey: PrivateKey };
}
