export interface IEncryptionLength {
  capacityPerBlock: number;
  blocksNeeded: number;
  padding: number;
  encryptedDataLength: number;
  totalEncryptedSize: number;
}
