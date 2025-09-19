export interface IPbkdf2Result {
  salt: Uint8Array;
  hash: Uint8Array;
  iterations: number;
}
