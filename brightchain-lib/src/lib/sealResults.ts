import { ISealResults } from './interfaces/sealResults';

export class SealResults implements ISealResults {
  public readonly encryptedData: Buffer;
  public readonly encryptedKey: Buffer;
  constructor(encryptedData: Buffer, encryptedKey: Buffer) {
    this.encryptedData = encryptedData;
    this.encryptedKey = encryptedKey;
  }
}
