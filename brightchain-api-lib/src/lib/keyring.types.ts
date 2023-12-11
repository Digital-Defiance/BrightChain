export interface IKeyring {
  storeKey(id: string, data: Uint8Array, password: string): Promise<void>;
  retrieveKey(id: string, password: string): Promise<Uint8Array>;
  initialize(): Promise<void>;
  rotateKey(
    id: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void>;
}
