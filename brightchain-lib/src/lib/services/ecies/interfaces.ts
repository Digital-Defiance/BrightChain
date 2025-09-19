/**
 * Browser-compatible ECIES interfaces
 */

import { Wallet } from '@ethereumjs/wallet';
import { EciesEncryptionTypeEnum } from '../../enumerations/ecies-encryption-type';

export interface ISimpleKeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

export interface IWalletSeed {
  wallet: Wallet;
  seed: Uint8Array;
}

export interface ISingleEncryptedParsedHeader {
  encryptionType: EciesEncryptionTypeEnum;
  ephemeralPublicKey: Uint8Array;
  iv: Uint8Array;
  authTag: Uint8Array;
  dataLength: number;
  headerSize: number;
}

export interface IEncryptionResult {
  encryptedData: Uint8Array;
  ephemeralPublicKey: Uint8Array;
  iv: Uint8Array;
  authTag: Uint8Array;
}

export interface IDecryptionResult {
  decrypted: Uint8Array;
  consumedBytes: number;
}

export interface IMultiRecipient {
  id: Uint8Array; // 16-byte ObjectId
  publicKey: Uint8Array;
}

export interface IMultiEncryptedMessage {
  dataLength: number;
  recipientCount: number;
  recipientIds: Uint8Array[];
  recipientKeys: Uint8Array[];
  encryptedMessage: Uint8Array;
  headerSize: number;
}

export interface IMultiEncryptedParsedHeader {
  dataLength: number;
  recipientCount: number;
  recipientIds: Uint8Array[];
  recipientKeys: Uint8Array[];
  headerSize: number;
}
