export interface IKeyringEntry {
  id: string;
  version: number;
  encryptedData: Buffer;
  iv: Buffer;
  salt: Buffer;
  created: Date;
  lastAccessed?: Date;
}
