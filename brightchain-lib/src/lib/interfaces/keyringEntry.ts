export interface IKeyringEntry {
  id: string;
  version: number;
  encryptedData: Uint8Array;
  iv: Uint8Array;
  salt: Uint8Array;
  created: Date;
  lastAccessed?: Date;
}
